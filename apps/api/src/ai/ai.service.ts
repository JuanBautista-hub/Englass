import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { APP_CONFIG, type AppConfig } from '../common/config';
import { SYSTEM_USER_ID } from '../common/constants';
import type {
  AiDeepenResponse,
  AiExplainResponse,
  AiHistoryEntry,
  AiMode,
} from '@engclass/shared';
import { DEEPEN_MAX_TOKENS, EXPLAIN_MAX_TOKENS, isAiMode } from '@engclass/shared';
import { AI_PROVIDER, type AiProvider } from './ai-provider.interface';
import { TTS_PROVIDER, TtsProviderFailedError, type TtsProvider } from './tts-provider.interface';
import { AiCacheStore, aiCacheKey } from './ai-cache.store';
import { AiAudioCacheStore } from './ai-audio-cache.store';
import { AiRateLimitStore, type RateBucket } from './ai-rate-limit.store';
import { buildDeepenPrompt, buildExplainPrompt } from './prompts';

export class AiDisabledError extends Error {
  constructor() {
    super('ai_disabled');
    this.name = 'AiDisabledError';
  }
}

export class AiCardNotFoundError extends NotFoundException {
  constructor() {
    super('card_not_found');
  }
}

export class AiCardNotInLessonError extends NotFoundException {
  constructor() {
    super('card_not_in_lesson');
  }
}

export class AiLessonNotFoundError extends NotFoundException {
  constructor() {
    super('lesson_not_found');
  }
}

export class AiHistoryEntryNotFoundError extends NotFoundException {
  constructor() {
    super('history_entry_not_found');
  }
}

export class AiHistoryEntryForbiddenError extends ForbiddenException {
  constructor() {
    super('history_entry_forbidden');
  }
}

export class AiRateLimitedError extends Error {
  readonly triggered: RateBucket;
  readonly retryAfterSec: number;
  constructor(triggered: RateBucket, retryAfterSec: number) {
    super('rate_limited');
    this.name = 'AiRateLimitedError';
    this.triggered = triggered;
    this.retryAfterSec = retryAfterSec;
  }
}

export class AiInvalidPayloadError extends Error {
  readonly mode: AiMode;
  readonly rawText: string;
  constructor(mode: AiMode, rawText: string) {
    super(`invalid_${mode}_payload`);
    this.name = 'AiInvalidPayloadError';
    this.mode = mode;
    this.rawText = rawText;
  }
}

export { TtsProviderFailedError };
export class AiTextNotFoundError extends NotFoundException {
  constructor() {
    super('text_not_found');
  }
}

export type AiSpeakLang = 'es-ES' | 'en-US';
export const AI_VOICES: readonly string[] = [
  'es-ES-ElviraNeural',
  'es-ES-AlvaroNeural',
  'es-MX-DaliaNeural',
  'es-MX-JorgeNeural',
  'en-US-JennyNeural',
  'en-US-GuyNeural',
  'en-GB-RyanNeural',
  'en-GB-SoniaNeural',
] as const;

export const AI_HISTORY_DEFAULT_LIMIT = 20;
export const AI_HISTORY_MAX_LIMIT = 100;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    @Inject(TTS_PROVIDER) private readonly ttsProvider: TtsProvider,
    private readonly cache: AiCacheStore,
    private readonly audioCache: AiAudioCacheStore,
    private readonly rateLimit: AiRateLimitStore,
  ) {}

  async explain(userId: string, lessonId: string, cardId: string): Promise<AiExplainResponse> {
    const { payload, cached } = await this.dispatchPayload(userId, lessonId, cardId, 'explain');
    const parsed = parseExplain(payload);
    if (!parsed) {
      throw new AiInvalidPayloadError('explain', stringifyAiPayload(payload, 'explain') ?? '');
    }
    return { ...parsed, cached };
  }

  async deepen(userId: string, lessonId: string, cardId: string): Promise<AiDeepenResponse> {
    const { payload, cached } = await this.dispatchPayload(userId, lessonId, cardId, 'deepen');
    const parsed = parseDeepen(payload);
    if (!parsed) {
      throw new AiInvalidPayloadError('deepen', stringifyAiPayload(payload, 'deepen') ?? '');
    }
    return { ...parsed, cached };
  }

  async listHistory(
    userId: string,
    lessonId: string,
    cardId: string,
    mode?: AiMode,
    limit: number = AI_HISTORY_DEFAULT_LIMIT,
  ): Promise<AiHistoryEntry[]> {
    await this.resolveCard(userId, lessonId, cardId);
    const clampedLimit = Math.max(1, Math.min(limit, AI_HISTORY_MAX_LIMIT));
    const rows = await this.prisma.aiHistoryEntry.findMany({
      where: {
        userId,
        cardId,
        ...(mode ? { mode } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: clampedLimit,
    });
    return rows.map((row) => this.toHistoryEntry(row));
  }

  async deleteHistoryEntry(userId: string, entryId: string): Promise<void> {
    const entry = await this.prisma.aiHistoryEntry.findUnique({
      where: { id: entryId },
      select: { userId: true },
    });
    if (!entry) {
      throw new AiHistoryEntryNotFoundError();
    }
    if (entry.userId !== userId) {
      throw new AiHistoryEntryForbiddenError();
    }
    await this.prisma.aiHistoryEntry.delete({ where: { id: entryId } });
  }

  private toHistoryEntry(row: {
    id: string;
    cardId: string;
    lessonId: string;
    mode: string;
    level: string;
    payload: unknown;
    tokensUsed: number;
    cached: boolean;
    createdAt: Date;
  }): AiHistoryEntry {
    return {
      id: row.id,
      cardId: row.cardId,
      lessonId: row.lessonId,
      mode: isAiMode(row.mode) ? row.mode : 'explain',
      level: row.level,
      payload: row.payload as AiExplainResponse | AiDeepenResponse,
      tokensUsed: row.tokensUsed,
      cached: row.cached,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async speak(
    userId: string,
    lessonId: string,
    cardId: string,
    mode: AiMode,
    voice: string,
    lang: AiSpeakLang,
  ): Promise<Buffer> {
    if (!this.config.aiEnabled) {
      throw new AiDisabledError();
    }
    if (!isAiMode(mode)) {
      throw new Error(`invalid_mode_${mode}`);
    }
    if (!this.config.aiApiKey) {
      throw new Error('ai_api_key_not_configured');
    }
    if (voice && !AI_VOICES.includes(voice)) {
      throw new Error('invalid_voice');
    }
    const { payload } = await this.dispatchPayload(userId, lessonId, cardId, mode);
    const text = stringifyAiPayload(payload, mode);
    if (!text) {
      throw new AiTextNotFoundError();
    }
    const cached = this.audioCache.get(text, voice, lang);
    if (cached) {
      return cached;
    }
    const wav = await this.ttsProvider.synthesize({ text, voice, lang });
    this.audioCache.set(text, voice, lang, wav);
    return wav;
  }

  private async dispatchPayload(
    userId: string,
    lessonId: string,
    cardId: string,
    mode: AiMode,
  ): Promise<{ payload: unknown; cached: boolean }> {
    if (!this.config.aiEnabled) {
      throw new AiDisabledError();
    }
    if (!isAiMode(mode)) {
      throw new Error(`invalid_mode_${mode}`);
    }
    if (!this.config.aiApiKey) {
      throw new Error('ai_api_key_not_configured');
    }
    const card = await this.resolveCard(userId, lessonId, cardId);
    const cacheKey = aiCacheKey({
      lessonId,
      cardId,
      mode,
      level: card.level,
    });
    const cached = this.cache.get<unknown>(cacheKey);
    if (cached !== null) {
      this.logCall({
        userId,
        mode,
        cardId,
        level: card.level,
        cached: true,
        tokensUsed: 0,
        latencyMs: 0,
      });
      void this.persistHistory({
        userId,
        lessonId,
        cardId,
        mode,
        level: card.level,
        payload: cached,
        tokensUsed: 0,
        cached: true,
      });
      return { payload: cached, cached: true };
    }
    const decision = this.rateLimit.consume(userId, mode);
    if (!decision.allowed) {
      this.logger.warn(
        `ai_rate_limited user=${userId} mode=${mode} bucket=${decision.triggered} retryAfter=${decision.retryAfterSec}s`,
      );
      throw new AiRateLimitedError(decision.triggered ?? 'perMinute', decision.retryAfterSec);
    }
    const built = mode === 'explain'
      ? buildExplainPrompt({ term: card.term, level: card.level })
      : buildDeepenPrompt({ term: card.term, level: card.level });
    const maxTokens = mode === 'explain' ? EXPLAIN_MAX_TOKENS : DEEPEN_MAX_TOKENS;
    const started = Date.now();
    const result = await this.provider.complete({
      system: built.system,
      user: built.user,
      mode,
      maxTokens,
      temperature: 0.4,
    });
    const latencyMs = Date.now() - started;
    const payload = parseJsonPayload(result.text, mode, this.logger);
    this.cache.set(cacheKey, payload, this.config.aiCacheTtlMs);
    this.logCall({
      userId,
      mode,
      cardId,
      level: card.level,
      cached: false,
      tokensUsed: result.tokensUsed,
      latencyMs,
    });
    void this.persistHistory({
      userId,
      lessonId,
      cardId,
      mode,
      level: card.level,
      payload,
      tokensUsed: result.tokensUsed,
      cached: false,
    });
    return { payload, cached: false };
  }

  private async persistHistory(input: {
    userId: string;
    lessonId: string;
    cardId: string;
    mode: AiMode;
    level: string;
    payload: unknown;
    tokensUsed: number;
    cached: boolean;
  }): Promise<void> {
    try {
      await this.prisma.aiHistoryEntry.create({
        data: {
          userId: input.userId,
          lessonId: input.lessonId,
          cardId: input.cardId,
          mode: input.mode,
          level: input.level,
          payload: input.payload as Prisma.InputJsonValue,
          tokensUsed: input.tokensUsed,
          cached: input.cached,
        },
      });
    } catch (err) {
      this.logger.warn(
        `ai_history_persist_failed user=${input.userId} card=${input.cardId} mode=${input.mode} ` +
          `error=${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async resolveCard(
    userId: string,
    lessonId: string,
    cardId: string,
  ): Promise<{ term: string; level: string }> {
    const card = await this.prisma.vocabularyCard.findUnique({
      where: { id: cardId },
      select: {
        term: true,
        level: true,
        lesson: { select: { id: true, ownerId: true, sourceLessonId: true } },
      },
    });
    if (!card) {
      throw new AiCardNotFoundError();
    }
    if (!card.lesson || card.lesson.id !== lessonId) {
      throw new AiCardNotInLessonError();
    }
    const isOwner = card.lesson.ownerId === userId;
    const isCatalog = card.lesson.ownerId === SYSTEM_USER_ID;
    let allowed = isOwner || isCatalog;
    if (isCatalog && !isOwner) {
      const clone = await this.prisma.lesson.findFirst({
        where: { ownerId: userId, sourceLessonId: card.lesson.id },
        select: { id: true },
      });
      allowed = clone !== null;
    }
    if (!allowed) {
      throw new AiLessonNotFoundError();
    }
    return { term: card.term, level: card.level };
  }

  private logCall(input: {
    userId: string;
    mode: AiMode;
    cardId: string;
    level: string;
    cached: boolean;
    tokensUsed: number;
    latencyMs: number;
  }): void {
    this.logger.log(
      `ai_call userId=${input.userId} mode=${input.mode} cardId=${input.cardId} ` +
        `level=${input.level} cached=${input.cached} tokens=${input.tokensUsed} ` +
        `latencyMs=${input.latencyMs}`,
    );
  }
}

function parseJsonPayload(raw: string, mode: AiMode, logger: Logger): unknown {
  const candidates = scrubToJsonCandidates(raw);
  let lastErr: unknown = null;
  for (const candidate of candidates) {
    const attempts: string[] = [candidate, repairJson(candidate)];
    const closed = tryCloseTruncatedJson(candidate);
    if (closed !== null && closed !== candidate) {
      attempts.push(closed, repairJson(closed));
    }
    for (const attempt of attempts) {
      if (!attempt) continue;
      try {
        return JSON.parse(attempt);
      } catch (err) {
        lastErr = err;
      }
    }
  }
  const preview = previewRaw(raw);
  logger.error(
    `ai_invalid_payload mode=${mode} parse_error=${lastErr instanceof Error ? lastErr.message : String(lastErr)} raw=${preview}`,
  );
  throw new AiInvalidPayloadError(mode, raw);
}

/**
 * If the candidate looks like a JSON object that was cut off mid-stream
 * (max_tokens exhausted), try to close any unterminated string and append
 * the missing closing brackets in the right order. Returns null when no
 * truncation is detected.
 */
function tryCloseTruncatedJson(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return null;
  if (trimmed.endsWith('}')) return null;
  let closed = trimmed;
  // If we are inside an unterminated string, close it.
  const lastQuote = closed.lastIndexOf('"');
  const lastEscape = closed.lastIndexOf('\\');
  if (lastQuote > lastEscape) {
    const afterQuote = closed.slice(lastQuote + 1);
    // No closing quote yet after the last quote: close the string.
    if (!/^[\s,\]}]/.test(afterQuote)) {
      closed += '"';
    }
  }
  // Strip trailing commas / colons before closing the object.
  closed = closed.replace(/[,\s:]+$/, '');
  // Track container depth so we close them in the right order
  // (LIFO: arrays before objects when we open them in that order).
  const stack: Array<'}' | ']'> = [];
  let inString = false;
  let escape = false;
  for (const ch of closed) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  while (stack.length > 0) {
    closed += stack.pop();
  }
  return closed;
}

function scrubToJsonCandidates(raw: string): string[] {
  let text = raw.trim();

  // If the model emitted think/reasoning/thought/analysis blocks with a
  // closing tag, cut everything up to the LAST closing tag. The lazy match
  // would keep later unrelated text after the first block; we want
  // everything from after the final block.
  const closingTags = ['</think>', '</reasoning>', '</thought>', '</analysis>'];
  let cutFrom = -1;
  for (const tag of closingTags) {
    const idx = text.toLowerCase().lastIndexOf(tag);
    if (idx > cutFrom) {
      cutFrom = idx + tag.length;
    }
  }
  if (cutFrom >= 0 && cutFrom < text.length) {
    text = text.slice(cutFrom).trim();
  }
  // When the opener has no matching closer (max_tokens exhausted mid-thought),
  // we cannot safely strip the prose — the JSON may follow after a long
  // block of thinking. Leave the text as-is and let the balanced-extractor
  // find the outermost valid JSON object at the tail.

  const candidates: string[] = [];

  // Fenced code block (```json ... ``` or ``` ... ```)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    candidates.push(fenced[1].trim());
  }

  // Balanced { ... } slices (outermost only), longest first
  const balanced = extractBalancedJsonCandidates(text)
    .sort((a, b) => b.length - a.length);
  for (const slice of balanced) {
    candidates.push(slice);
  }

  // Last `{` to final `}` (greedy outer slice) — catches JSON after a long
  // think block that has no closer
  const lastOpen = text.lastIndexOf('{');
  const lastClose = text.lastIndexOf('}');
  if (lastOpen >= 0 && lastClose > lastOpen) {
    candidates.push(text.slice(lastOpen, lastClose + 1));
  }

  // First `{` to last `}` (greedy outer slice)
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace && firstBrace !== lastOpen) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  // Last-ditch: raw text (let the caller try to repair)
  candidates.push(text);

  return candidates;
}

function extractBalancedJsonCandidates(text: string): string[] {
  const candidates: string[] = [];
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const start = text.indexOf('{', searchFrom);
    if (start < 0) {
      break;
    }
    const balanced = extractBalancedFrom(text, start);
    if (balanced) {
      candidates.push(balanced);
      searchFrom = start + balanced.length;
    } else {
      searchFrom = start + 1;
    }
  }
  return candidates;
}

function extractBalancedFrom(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function repairJson(text: string): string {
  return text
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/,+/g, ',')
    .replace(/,(\s*,)/g, ',')
    .replace(/([{,]\s*)'([^'\n]*?)'(\s*[,:}\]])/g, '$1"$2"$3');
}

function previewRaw(raw: string): string {
  if (raw.length <= 800) {
    return raw;
  }
  const head = raw.slice(0, 400);
  const tail = raw.slice(-400);
  const omitted = raw.length - 800;
  return `${head}\n\n[…${omitted} chars omitted…]\n\n${tail}`;
}

function stringifyAiPayload(payload: unknown, mode: AiMode): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const v = payload as Record<string, unknown>;
  const examples = Array.isArray(v.examples)
    ? v.examples.filter((e): e is string => typeof e === 'string' && e.trim().length > 0).map((s) => s.trim())
    : [];
  if (mode === 'explain') {
    const summary = typeof v.summary === 'string' ? v.summary.trim() : '';
    if (!summary && examples.length === 0) {
      return null;
    }
    return [summary, ...examples].filter(Boolean).join('. ');
  }
  const context = typeof v.context === 'string' ? v.context.trim() : '';
  const collocations = Array.isArray(v.collocations)
    ? v.collocations.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).map((s) => s.trim())
    : [];
  const parts = [context, ...collocations, ...examples];
  if (parts.every((p) => !p)) {
    return null;
  }
  return parts.filter(Boolean).join('. ');
}

function parseExplain(value: unknown): Omit<AiExplainResponse, 'cached'> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const v = value as Record<string, unknown>;
  const summary = typeof v.summary === 'string' ? v.summary : null;
  if (!summary) {
    return null;
  }
  const examples = extractStrings(v.examples, 5, 200);
  const examplesEs = extractStrings(v.examplesEs, 5, 240);
  if (examples.length === 0) {
    return null;
  }
  return { summary: summary.slice(0, 1000), examples, examplesEs };
}

function parseDeepen(value: unknown): Omit<AiDeepenResponse, 'cached'> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const v = value as Record<string, unknown>;
  const context = typeof v.context === 'string' ? v.context : null;
  if (!context) {
    return null;
  }
  const collocations = extractStrings(v.collocations, 5, 200);
  const falseFriends = extractStrings(v.falseFriends, 3, 200);
  const examples = extractStrings(v.examples, 5, 200);
  const examplesEs = extractStrings(v.examplesEs, 5, 240);
  if (examples.length === 0 && collocations.length === 0) {
    return null;
  }
  return {
    context: context.slice(0, 4000),
    collocations,
    falseFriends,
    examples,
    examplesEs,
  };
}

function extractStrings(value: unknown, max: number, maxLen: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .slice(0, max)
    .map((s) => s.slice(0, maxLen));
}
