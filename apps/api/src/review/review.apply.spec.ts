import { ReviewService } from './review.service';
import { SrsService } from '../srs/srs.service';

describe('ReviewService.applyReview (sessionDone and updatedCard)', () => {
  function makeService(deps?: {
    listAll?: unknown;
    findUniqueProgress?: unknown;
    findUniqueCard?: unknown;
    findUniqueUpdated?: unknown;
    reviewLogsFindMany?: unknown;
    applyReview?: unknown;
  }) {
    const prisma = {
      cardProgress: {
        findUnique: jest.fn().mockImplementation((args: unknown) => {
          if (typeof args === 'object' && args !== null && 'where' in args) {
            const a = args as { where: { userId_cardId?: { cardId?: string } } };
            const cardId = a.where?.userId_cardId?.cardId;
            if (cardId === 'progress') return Promise.resolve({ id: 'p1', userId: 'u-1', cardId: 'progress', easeFactor: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: new Date(), lastReviewedAt: null });
            if (cardId === 'updated') return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }),
      },
      reviewLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const srs = {
      applyReview: jest.fn().mockResolvedValue({
        progress: {
          cardId: 'progress',
          easeFactor: 2.6,
          intervalDays: 1,
          repetitions: 1,
          lapses: 0,
          dueAt: new Date('2024-02-01T00:00:00Z').toISOString(),
          lastReviewedAt: new Date().toISOString(),
          mastery: 'learning',
        },
        userBefore: { currentStreak: 0, bestStreak: 0 },
        userAfter: { currentStreak: 1, bestStreak: 1 },
        newlyAwarded: [],
      }),
    } as unknown as SrsService;
    const service = new ReviewService(prisma as never, srs);
    return service;
  }

  it('throws NotFound when no progress row exists', async () => {
    const service = makeService();
    await expect(service.applyReview('u-1', 'missing', 'good')).rejects.toThrow();
  });
});
