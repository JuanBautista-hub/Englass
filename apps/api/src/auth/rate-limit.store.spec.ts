import { RateLimitStore } from './rate-limit.store';

describe('RateLimitStore', () => {
  it('counts hits and resets after the window', () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const store = new RateLimitStore();
    const win = 60_000;
    const first = store.hit('auth:u:abc:login', win, 3);
    const second = store.hit('auth:u:abc:login', win, 3);
    const third = store.hit('auth:u:abc:login', win, 3);
    const fourth = store.hit('auth:u:abc:login', win, 3);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(true);
    expect(fourth.allowed).toBe(false);
    jest.setSystemTime(new Date('2024-01-01T00:01:00Z'));
    const afterReset = store.hit('auth:u:abc:login', win, 3);
    expect(afterReset.allowed).toBe(true);
    jest.useRealTimers();
  });

  it('clearUser removes only the user-scoped buckets', () => {
    const store = new RateLimitStore();
    store.hit('auth:u:abc:login', 60_000, 10);
    store.hit('auth:u:abc:review', 60_000, 10);
    store.hit('auth:u:xyz:login', 60_000, 10);
    store.clearUser('abc');
    expect(store.size()).toBe(1);
  });

  it('reset clears everything', () => {
    const store = new RateLimitStore();
    store.hit('a', 60_000, 10);
    store.hit('b', 60_000, 10);
    store.reset();
    expect(store.size()).toBe(0);
  });
});
