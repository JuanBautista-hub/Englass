import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { MeView } from '@engclass/shared';

describe('AuthController', () => {
  describe('GET /auth/me', () => {
    it('returns MeView and sets Cache-Control', async () => {
      const me: MeView = {
        id: 'user-1',
        email: 'a@b.c',
        displayName: 'A',
        level: null,
        currentStreak: 3,
      };
      const auth = { me: jest.fn().mockResolvedValue(me) } as unknown as AuthService;
      const controller = new AuthController(auth);
      const setHeader = jest.fn();
      const res = { setHeader } as never;
      const req = { user: { id: 'user-1', email: 'a@b.c' } } as never;
      const result = await controller.me(req, res);
      expect(result).toEqual(me);
      expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'private, max-age=60');
    });

    it('returns null when the user no longer exists (deleted account)', async () => {
      const auth = { me: jest.fn().mockResolvedValue(null) } as unknown as AuthService;
      const controller = new AuthController(auth);
      const setHeader = jest.fn();
      const res = { setHeader } as never;
      const req = { user: { id: 'gone', email: 'x@y.z' } } as never;
      const result = await controller.me(req, res);
      expect(result).toBeNull();
    });
  });

  describe('POST /auth/logout', () => {
    it('clears user-scoped rate-limit buckets and sets no-store Cache-Control', async () => {
      const auth = { logout: jest.fn().mockResolvedValue(undefined) } as unknown as AuthService;
      const controller = new AuthController(auth);
      const setHeader = jest.fn();
      const res = { setHeader } as never;
      const req = { user: { id: 'user-1', email: 'a@b.c' } } as never;
      const result = await controller.logout(req, res);
      expect(result).toEqual({ ok: true });
      expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
      expect((auth.logout as jest.Mock)).toHaveBeenCalledWith('user-1');
    });

    it('is idempotent: succeeds even if there is no active session', async () => {
      const auth = { logout: jest.fn().mockResolvedValue(undefined) } as unknown as AuthService;
      const controller = new AuthController(auth);
      const setHeader = jest.fn();
      const res = { setHeader } as never;
      const req = { user: { id: 'u', email: 'x@y.z' } } as never;
      const result = await controller.logout(req, res);
      expect(result).toEqual({ ok: true });
    });
  });
});
