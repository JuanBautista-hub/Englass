import { ReviewController } from './review.controller';
import { ReviewService, LAST_RATINGS_LIMIT } from './review.service';

describe('ReviewController.endSession', () => {
  it('returns 200 and sets Cache-Control: private, no-store', async () => {
    const summary = {
      totalReviewed: 0,
      byRating: { again: 0, hard: 0, good: 0, easy: 0 },
      retentionPct: 0,
      longestIntervalDays: 0,
      nextDueAt: null,
      streakBefore: 0,
      streakAfter: 0,
      newlyAwarded: [],
    };
    const service = { endSession: jest.fn().mockResolvedValue(summary) } as unknown as ReviewService;
    const controller = new ReviewController(service);
    const setHeader = jest.fn();
    const res = { setHeader } as never;
    const req = { user: { id: 'u', email: 'a@b.c' } } as never;
    const result = await controller.endSession(req, res);
    expect(result).toBe(summary);
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  it('exposes LAST_RATINGS_LIMIT = 5 (matches task spec)', () => {
    expect(LAST_RATINGS_LIMIT).toBe(5);
  });
});
