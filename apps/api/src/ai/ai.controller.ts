import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type {
  AiDeepenResponse,
  AiExplainResponse,
  AiHistoryEntry,
  AiMode,
} from '@engclass/shared';
import { isAiMode } from '@engclass/shared';
import {
  AI_HISTORY_DEFAULT_LIMIT,
  AI_HISTORY_MAX_LIMIT,
  AI_VOICES,
  AiCardNotFoundError,
  AiCardNotInLessonError,
  AiDisabledError,
  AiHistoryEntryForbiddenError,
  AiHistoryEntryNotFoundError,
  AiInvalidPayloadError,
  AiLessonNotFoundError,
  AiRateLimitedError,
  AiService,
  AiTextNotFoundError,
  type AiSpeakLang,
  TtsProviderFailedError,
} from './ai.service';

interface AuthenticatedRequest {
  user: { id: string; email: string };
}

@Controller('lessons')
@UseGuards(JwtAuthGuard)
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly ai: AiService) {}

  @Post(':lessonId/cards/:cardId/explain')
  @HttpCode(200)
  async explain(
    @Req() req: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
    @Param('cardId') cardId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AiExplainResponse> {
    res.setHeader('Cache-Control', 'private, no-store');
    try {
      return await this.ai.explain(req.user.id, lessonId, cardId);
    } catch (err) {
      throw this.translate(err);
    }
  }

  @Post(':lessonId/cards/:cardId/deepen')
  @HttpCode(200)
  async deepen(
    @Req() req: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
    @Param('cardId') cardId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AiDeepenResponse> {
    res.setHeader('Cache-Control', 'private, no-store');
    try {
      return await this.ai.deepen(req.user.id, lessonId, cardId);
    } catch (err) {
      throw this.translate(err);
    }
  }

  @Post(':lessonId/cards/:cardId/speak')
  @HttpCode(200)
  async speak(
    @Req() req: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
    @Param('cardId') cardId: string,
    @Body() body: { mode?: string; voice?: string; lang?: string },
    @Res() res: Response,
  ): Promise<void> {
    const mode = body?.mode;
    const voice = body?.voice;
    const lang = body?.lang;
    if (!mode || !isAiMode(mode)) {
      throw new BadRequestException('invalid_mode');
    }
    if (voice && !AI_VOICES.includes(voice)) {
      throw new BadRequestException('invalid_voice');
    }
    if (lang !== 'es-ES' && lang !== 'en-US') {
      throw new BadRequestException('invalid_lang');
    }
    try {
      const wav = await this.ai.speak(
        req.user.id,
        lessonId,
        cardId,
        mode as AiMode,
        voice ?? '',
        lang as AiSpeakLang,
      );
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', String(wav.length));
      res.end(wav);
    } catch (err) {
      throw this.translate(err);
    }
  }

  @Get(':lessonId/cards/:cardId/ai-history')
  @HttpCode(200)
  async listHistory(
    @Req() req: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
    @Param('cardId') cardId: string,
    @Query('mode') modeRaw?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<AiHistoryEntry[]> {
    let mode: AiMode | undefined;
    if (modeRaw !== undefined && modeRaw !== '') {
      if (!isAiMode(modeRaw)) {
        throw new BadRequestException('invalid_mode');
      }
      mode = modeRaw;
    }
    let limit = AI_HISTORY_DEFAULT_LIMIT;
    if (limitRaw !== undefined && limitRaw !== '') {
      const parsed = Number.parseInt(limitRaw, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new BadRequestException('invalid_limit');
      }
      limit = Math.min(parsed, AI_HISTORY_MAX_LIMIT);
    }
    try {
      return await this.ai.listHistory(req.user.id, lessonId, cardId, mode, limit);
    } catch (err) {
      throw this.translate(err);
    }
  }

  @Delete('ai-history/:entryId')
  @HttpCode(204)
  async deleteHistoryEntry(
    @Req() req: AuthenticatedRequest,
    @Param('entryId') entryId: string,
  ): Promise<void> {
    try {
      await this.ai.deleteHistoryEntry(req.user.id, entryId);
    } catch (err) {
      throw this.translate(err);
    }
  }

  private translate(err: unknown): HttpException {
    if (err instanceof AiDisabledError) {
      this.logger.warn(`AI_DISABLED hit: ${err.message}`);
      return new HttpException(
        { statusCode: 503, code: 'AI_DISABLED', message: 'ai_disabled' },
        503,
      );
    }
    if (err instanceof AiRateLimitedError) {
      const response = new HttpException(
        {
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: 'rate_limited',
          details: { bucket: err.triggered },
        },
        429,
      );
      const res = response as unknown as { setHeader?: (k: string, v: string) => void };
      if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', String(err.retryAfterSec));
      }
      return new HttpException(
        {
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: 'rate_limited',
          details: { bucket: err.triggered, retryAfterSec: err.retryAfterSec },
        },
        429,
      );
    }
    if (err instanceof AiCardNotFoundError) {
      return new HttpException(
        { statusCode: 404, code: 'CARD_NOT_FOUND', message: 'card_not_found' },
        404,
      );
    }
    if (err instanceof AiCardNotInLessonError) {
      return new HttpException(
        { statusCode: 404, code: 'CARD_NOT_IN_LESSON', message: 'card_not_in_lesson' },
        404,
      );
    }
    if (err instanceof AiLessonNotFoundError) {
      return new HttpException(
        { statusCode: 404, code: 'LESSON_NOT_FOUND', message: 'lesson_not_found' },
        404,
      );
    }
    if (err instanceof Error && err.name === 'AiProviderFailedError') {
      const friendly = friendlyProviderMessage(err.message);
      return new HttpException(
        {
          statusCode: 502,
          code: 'AI_PROVIDER_FAILED',
          message: friendly,
          details: { cause: err.message },
        },
        502,
      );
    }
    if (err instanceof AiInvalidPayloadError) {
      this.logger.warn(`AI_INVALID_PAYLOAD mode=${err.mode} raw_len=${err.rawText.length}`);
      return new HttpException(
        {
          statusCode: 502,
          code: 'AI_PROVIDER_FAILED',
          message: friendlyProviderMessage(`invalid_${err.mode}_payload`),
          details: { cause: err.message, retryable: true },
        },
        502,
      );
    }
    if (err instanceof TtsProviderFailedError) {
      return new HttpException(
        {
          statusCode: 502,
          code: 'TTS_PROVIDER_FAILED',
          message: friendlyTtsMessage(err.message),
          details: { cause: err.message },
        },
        502,
      );
    }
    if (err instanceof AiTextNotFoundError) {
      return new HttpException(
        { statusCode: 404, code: 'TEXT_NOT_FOUND', message: 'text_not_found' },
        404,
      );
    }
    if (err instanceof AiHistoryEntryNotFoundError) {
      return new HttpException(
        { statusCode: 404, code: 'HISTORY_ENTRY_NOT_FOUND', message: 'history_entry_not_found' },
        404,
      );
    }
    if (err instanceof AiHistoryEntryForbiddenError) {
      return new HttpException(
        { statusCode: 403, code: 'HISTORY_ENTRY_FORBIDDEN', message: 'history_entry_forbidden' },
        403,
      );
    }
    return err as HttpException;
  }
}

function friendlyProviderMessage(cause: string): string {
  if (cause === 'provider_timeout' || cause === 'provider_network') {
    return 'La IA no responde ahora mismo. Vuelve a intentarlo en unos segundos.';
  }
  if (cause === 'provider_status_429') {
    return 'Has alcanzado el límite de uso de la IA. Espera un momento.';
  }
  if (cause.startsWith('provider_status_5')) {
    return 'El servicio de IA no está disponible ahora mismo. Vuelve a intentarlo en unos segundos.';
  }
  if (cause === 'provider_empty_text' || cause.startsWith('invalid_')) {
    return 'La IA devolvió una respuesta inválida. Vuelve a intentarlo.';
  }
  return 'La IA no está disponible. Vuelve a intentarlo en unos segundos.';
}

function friendlyTtsMessage(cause: string): string {
  if (cause === 'edge_tts_timeout' || cause === 'edge_tts_network' || cause.startsWith('edge_tts_closed')) {
    return 'No se pudo generar la voz IA. Vuelve a intentarlo en unos segundos.';
  }
  if (cause === 'gtts_timeout' || cause === 'gtts_network') {
    return 'No se pudo generar la voz IA. Vuelve a intentarlo en unos segundos.';
  }
  if (cause.startsWith('edge_tts_token_') || cause === 'edge_tts_no_token') {
    return 'No se pudo autenticar con el servicio de voz IA.';
  }
  return 'No se pudo generar la voz IA. Vuelve a intentarlo.';
}
