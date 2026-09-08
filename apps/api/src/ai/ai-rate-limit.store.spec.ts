import { AiRateLimitStore } from './ai-rate-limit.store';
import type { AppConfig } from '../common/config';

function makeConfig(overrides?: { perMinute?: number; perDay?: number }): AppConfig {
  return {
    lessonsViewFlagsEnabled: true,
    lessonsCatalogDeprecationSunsetDays: 30,
    aiEnabled: false,
    aiBaseUrl: '',
    aiApiKey: '',
    aiModel: 'MiniMax-M3',
      aiTtsModel: 'gemini-2.5-flash-preview-tts',
      aiCacheTtlMs: 1000,
    aiRatePerMinute: overrides?.perMinute ?? 5,
    aiRatePerDay: overrides?.perDay ?? 60,
  };
}

describe('AiRateLimitStore', () => {
  it('allows up to perMinute then triggers perMinute bucket', () => {
    const store = new AiRateLimitStore(makeConfig({ perMinute: 2, perDay: 100 }));
    expect(store.consume('u1', 'explain', 0).allowed).toBe(true);
    expect(store.consume('u1', 'explain', 0).allowed).toBe(true);
    const blocked = store.consume('u1', 'explain', 0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.triggered).toBe('perMinute');
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('resets after the minute boundary', () => {
    const store = new AiRateLimitStore(makeConfig({ perMinute: 1, perDay: 100 }));
    expect(store.consume('u1', 'explain', 0).allowed).toBe(true);
    expect(store.consume('u1', 'explain', 30_000).allowed).toBe(false);
    expect(store.consume('u1', 'explain', 60_001).allowed).toBe(true);
  });

  it('triggers perDay once perDay window is exceeded', () => {
    const store = new AiRateLimitStore(makeConfig({ perMinute: 100, perDay: 3 }));
    expect(store.consume('u1', 'explain', 0).allowed).toBe(true);
    expect(store.consume('u1', 'explain', 30_000).allowed).toBe(true);
    expect(store.consume('u1', 'explain', 60_000).allowed).toBe(true);
    const blocked = store.consume('u1', 'explain', 90_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.triggered).toBe('perDay');
  });

  it('keeps buckets independent per mode', () => {
    const store = new AiRateLimitStore(makeConfig({ perMinute: 1, perDay: 100 }));
    expect(store.consume('u1', 'explain', 0).allowed).toBe(true);
    expect(store.consume('u1', 'explain', 0).allowed).toBe(false);
    expect(store.consume('u1', 'deepen', 0).allowed).toBe(true);
  });

  it('keeps buckets independent per user', () => {
    const store = new AiRateLimitStore(makeConfig({ perMinute: 1, perDay: 100 }));
    expect(store.consume('u1', 'explain', 0).allowed).toBe(true);
    expect(store.consume('u1', 'explain', 0).allowed).toBe(false);
    expect(store.consume('u2', 'explain', 0).allowed).toBe(true);
  });

  it('resetUser clears that user only', () => {
    const store = new AiRateLimitStore(makeConfig({ perMinute: 100, perDay: 100 }));
    store.consume('u1', 'explain', 0);
    store.consume('u1', 'deepen', 0);
    store.consume('u2', 'explain', 0);
    store.resetUser('u1');
    expect(store.size()).toBe(1);
  });
});
