import { environment } from '../../../environments/environment';
import type {
  AiDeepenResponse,
  AiExplainResponse,
  AiHistoryEntry,
  AiMode,
} from '../models';
import { normalizeAiError } from './ai-errors';

export type AiSpeakLang = 'es-ES' | 'en-US';
export type AiVoice = string;

/**
 * Thin HTTP port so tests can swap a stub without depending on Angular's
 * HttpClient. Production wires `HttpClientAiTransport`; tests construct
 * `AiService` with a fake transport directly via `new`.
 */
export interface AiTransport {
  post<T>(url: string, body: Record<string, never>): Promise<T>;
  postBlob(url: string, body: Record<string, unknown>): Promise<Blob>;
  get<T>(url: string): Promise<T>;
  delete(url: string): Promise<void>;
}

export class AiService {
  constructor(private readonly transport: AiTransport) {}

  explain(lessonId: string, cardId: string): Promise<AiExplainResponse> {
    return this.post<AiExplainResponse>('explain', lessonId, cardId);
  }

  deepen(lessonId: string, cardId: string): Promise<AiDeepenResponse> {
    return this.post<AiDeepenResponse>('deepen', lessonId, cardId);
  }

  history(
    lessonId: string,
    cardId: string,
    mode?: AiMode,
    limit: number = 20,
  ): Promise<AiHistoryEntry[]> {
    const params: string[] = [];
    if (mode) {
      params.push(`mode=${encodeURIComponent(mode)}`);
    }
    if (limit) {
      params.push(`limit=${encodeURIComponent(String(limit))}`);
    }
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    const url = `${environment.apiBaseUrl}/lessons/${lessonId}/cards/${cardId}/ai-history${qs}`;
    return this.transport.get<AiHistoryEntry[]>(url);
  }

  deleteHistory(entryId: string): Promise<void> {
    const url = `${environment.apiBaseUrl}/lessons/ai-history/${entryId}`;
    return this.transport.delete(url);
  }

  speak(
    lessonId: string,
    cardId: string,
    mode: AiMode,
    voice: string,
    lang: AiSpeakLang,
  ): Promise<Blob> {
    const url = `${environment.apiBaseUrl}/lessons/${lessonId}/cards/${cardId}/speak`;
    return this.transport.postBlob(url, { mode, voice, lang });
  }

  private async post<T>(
    mode: AiMode,
    lessonId: string,
    cardId: string,
  ): Promise<T> {
    const url = `${environment.apiBaseUrl}/lessons/${lessonId}/cards/${cardId}/${mode}`;
    try {
      return await this.transport.post<T>(url, {});
    } catch (err) {
      throw normalizeAiError(err, mode);
    }
  }
}
