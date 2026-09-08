import { AiCacheStore, aiCacheKey } from './ai-cache.store';

describe('AiCacheStore', () => {
  it('returns null for unknown keys', () => {
    const store = new AiCacheStore();
    expect(store.get('k')).toBeNull();
  });

  it('round-trips values when within TTL', () => {
    const store = new AiCacheStore();
    store.set('k1', { hello: 'world' }, 60_000, 1_000);
    expect(store.get('k1', 30_000)).toEqual({ hello: 'world' });
  });

  it('evicts expired entries', () => {
    const store = new AiCacheStore();
    store.set('k1', 'value', 1_000, 1_000);
    expect(store.get('k1', 3_000)).toBeNull();
    expect(store.size()).toBe(0);
  });

  it('clear() empties the store', () => {
    const store = new AiCacheStore();
    store.set('a', 1, 60_000);
    store.set('b', 2, 60_000);
    store.clear();
    expect(store.size()).toBe(0);
    expect(store.get('a')).toBeNull();
  });

  it('aiCacheKey returns sha256 hex with deterministic mapping', () => {
    expect(aiCacheKey({ lessonId: 'L', cardId: 'C', mode: 'explain', level: 'A2' })).toHaveLength(64);
    expect(aiCacheKey({ lessonId: 'L', cardId: 'C', mode: 'explain', level: 'A2' })).toBe(
      aiCacheKey({ lessonId: 'L', cardId: 'C', mode: 'explain', level: 'A2' }),
    );
    expect(aiCacheKey({ lessonId: 'L', cardId: 'C', mode: 'deepen', level: 'A2' })).not.toBe(
      aiCacheKey({ lessonId: 'L', cardId: 'C', mode: 'explain', level: 'A2' }),
    );
  });
});
