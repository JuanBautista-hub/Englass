import { AuthService } from './auth.service';
import { RateLimitStore } from './rate-limit.store';

describe('AuthService.me / logout', () => {
  const users = {
    findById: jest.fn(),
  };
  const lessons = {
    autoEnrollAllForUser: jest.fn(),
  };
  const jwt = {
    sign: jest.fn().mockReturnValue('signed-token'),
  };
  const rateLimits = new RateLimitStore();

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimits.reset();
  });

  const service = new AuthService(users as never, lessons as never, jwt as never, rateLimits);

  it('me() returns the public view when the user exists', async () => {
    users.findById.mockResolvedValue({
      id: 'u-1',
      email: 'a@b.c',
      displayName: 'A',
      currentStreak: 5,
    });
    const result = await service.me('u-1');
    expect(result).toEqual({
      id: 'u-1',
      email: 'a@b.c',
      displayName: 'A',
      level: null,
      currentStreak: 5,
    });
  });

  it('me() returns null for unknown user (deleted account / race)', async () => {
    users.findById.mockResolvedValue(null);
    const result = await service.me('gone');
    expect(result).toBeNull();
  });

  it('logout() clears the user-scoped rate-limit buckets only', async () => {
    rateLimits.hit('auth:u:u-1:login', 60_000, 100);
    rateLimits.hit('auth:u:u-1:review', 60_000, 100);
    rateLimits.hit('auth:u:u-2:login', 60_000, 100);
    expect(rateLimits.size()).toBe(3);
    await service.logout('u-1');
    expect(rateLimits.size()).toBe(1);
  });

  it('logout() is idempotent (does not throw with no active session)', async () => {
    await expect(service.logout('no-session')).resolves.toBeUndefined();
  });
});
