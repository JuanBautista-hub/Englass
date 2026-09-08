import {
  AiRateLimitedError,
  AiProviderError,
  AiDisabledError,
  isAiHttpError,
  normalizeAiError,
  parseRetryAfter,
} from './ai-errors';

function httpError(
  status: number,
  body: { code?: string; details?: { bucket?: string; retryAfterSec?: number } } | null,
  retryAfterHeader?: string,
): unknown {
  return {
    status,
    error: body,
    headers: { get: (k: string) => (k === 'Retry-After' ? retryAfterHeader ?? null : null) },
  };
}

describe('isAiHttpError', () => {
  it('returns true for shaped errors', () => {
    expect(isAiHttpError(httpError(500, null))).toBe(true);
  });
  it('returns false for plain errors and nulls', () => {
    expect(isAiHttpError(new Error('x'))).toBe(false);
    expect(isAiHttpError(null)).toBe(false);
    expect(isAiHttpError('plain string')).toBe(false);
  });
});

describe('parseRetryAfter', () => {
  it('prefers the Retry-After header', () => {
    const out = parseRetryAfter(
      { get: (k: string) => (k === 'Retry-After' ? '120' : null) },
      null,
    );
    expect(out).toBe(120);
  });

  it('falls back to body.details.retryAfterSec when header is absent', () => {
    const out = parseRetryAfter(
      { get: () => null },
      { details: { retryAfterSec: 45 } },
    );
    expect(out).toBe(45);
  });

  it('returns a sensible default (60s) when nothing is available', () => {
    const out = parseRetryAfter({ get: () => null }, null);
    expect(out).toBe(60);
  });
});

describe('normalizeAiError', () => {
  it('translates 429 + RATE_LIMITED into AiRateLimitedError with Retry-After header', () => {
    const err = httpError(429, { code: 'RATE_LIMITED', details: { bucket: 'perMinute' } }, '120');
    const result = normalizeAiError(err, 'explain');
    expect(result).toBeInstanceOf(AiRateLimitedError);
    expect((result as AiRateLimitedError).retryAfterSec).toBe(120);
    expect((result as AiRateLimitedError).bucket).toBe('perMinute');
  });

  it('translates 429 even when body lacks the code (just the status)', () => {
    const err = httpError(429, null, '60');
    const result = normalizeAiError(err, 'explain');
    expect(result).toBeInstanceOf(AiRateLimitedError);
    expect((result as AiRateLimitedError).retryAfterSec).toBe(60);
  });

  it('falls back to body.details.retryAfterSec when Retry-After header is missing', () => {
    const err = httpError(429, { code: 'RATE_LIMITED', details: { bucket: 'perDay', retryAfterSec: 30 } });
    const result = normalizeAiError(err, 'deepen');
    expect(result).toBeInstanceOf(AiRateLimitedError);
    expect((result as AiRateLimitedError).retryAfterSec).toBe(30);
    expect((result as AiRateLimitedError).bucket).toBe('perDay');
  });

  it('translates 502 + AI_PROVIDER_FAILED into AiProviderError', () => {
    const err = httpError(502, { code: 'AI_PROVIDER_FAILED' });
    expect(normalizeAiError(err, 'explain')).toBeInstanceOf(AiProviderError);
  });

  it('translates plain 502 (no body) into AiProviderError', () => {
    const err = httpError(502, null);
    expect(normalizeAiError(err, 'explain')).toBeInstanceOf(AiProviderError);
  });

  it('translates 503 + AI_DISABLED into AiDisabledError', () => {
    const err = httpError(503, { code: 'AI_DISABLED' });
    expect(normalizeAiError(err, 'explain')).toBeInstanceOf(AiDisabledError);
  });

  it('wraps non-typed errors (e.g. 500) into a generic Error with status code in message', () => {
    const err = httpError(500, null);
    const result = normalizeAiError(err, 'deepen');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('ai_deepen_status_500');
  });

  it('passes through non-shaped errors untouched', () => {
    const err = new Error('plain');
    expect(normalizeAiError(err, 'explain')).toBe(err);
  });
});
