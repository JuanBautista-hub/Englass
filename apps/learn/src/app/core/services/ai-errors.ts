import type { AiMode } from '../models';

export class AiRateLimitedError extends Error {
  readonly retryAfterSec: number;
  readonly bucket: 'perMinute' | 'perDay' | null;
  constructor(retryAfterSec: number, bucket: 'perMinute' | 'perDay' | null) {
    super('ai_rate_limited');
    this.name = 'AiRateLimitedError';
    this.retryAfterSec = retryAfterSec;
    this.bucket = bucket;
  }
}

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiProviderError';
  }
}

export class AiDisabledError extends Error {
  constructor() {
    super('ai_disabled');
    this.name = 'AiDisabledError';
  }
}

export interface AiHttpError {
  status: number;
  headers: { get: (k: string) => string | null };
  error: { code?: string; details?: { bucket?: string; retryAfterSec?: number } } | null;
}

export function isAiHttpError(err: unknown): err is AiHttpError {
  return (
    !!err &&
    typeof err === 'object' &&
    'status' in err &&
    'headers' in err &&
    typeof (err as { status: unknown }).status === 'number'
  );
}

export function parseRetryAfter(
  headers: { get: (k: string) => string | null },
  body: { details?: { retryAfterSec?: number } } | null,
): number {
  const headerVal = headers.get('Retry-After');
  if (headerVal) {
    const n = Number(headerVal);
    if (Number.isFinite(n) && n >= 0) {
      return Math.max(1, Math.ceil(n));
    }
  }
  const fallback = body?.details?.retryAfterSec;
  if (typeof fallback === 'number' && Number.isFinite(fallback) && fallback >= 0) {
    return Math.max(1, Math.ceil(fallback));
  }
  return 60;
}

export function normalizeAiError(err: unknown, mode: AiMode): Error {
  if (isAiHttpError(err)) {
    const status = err.status;
    const headers = err.headers;
    const body = err.error;
    const code = body?.code;
    if (status === 429 || code === 'RATE_LIMITED') {
      const retryAfter = parseRetryAfter(headers, body);
      const bucketRaw = body?.details?.bucket;
      const bucket = bucketRaw === 'perMinute' || bucketRaw === 'perDay' ? bucketRaw : null;
      return new AiRateLimitedError(retryAfter, bucket);
    }
    if (status === 502 || code === 'AI_PROVIDER_FAILED') {
      return new AiProviderError('ai_provider_failed');
    }
    if (status === 503 || code === 'AI_DISABLED') {
      return new AiDisabledError();
    }
    return new Error(`ai_${mode}_status_${status}`);
  }
  return err instanceof Error ? err : new Error('ai_unknown_error');
}
