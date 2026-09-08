import { buildStudySessionSummary, type SessionReview } from './session-summary';

describe('buildStudySessionSummary', () => {
  it('returns a zero summary for an empty session', () => {
    const summary = buildStudySessionSummary({
      reviews: [],
      nextDueAt: null,
      streakBefore: 0,
      streakAfter: 0,
    });
    expect(summary).toEqual({
      totalReviewed: 0,
      byRating: { again: 0, hard: 0, good: 0, easy: 0 },
      retentionPct: 0,
      longestIntervalDays: 0,
      nextDueAt: null,
      streakBefore: 0,
      streakAfter: 0,
      newlyAwarded: [],
    });
  });

  it('computes retentionPct as round((good+easy)/total*100)', () => {
    const reviews: SessionReview[] = [
      { rating: 'again', intervalDays: 1, reviewedAt: new Date(), newlyAwarded: [] },
      { rating: 'hard', intervalDays: 6, reviewedAt: new Date(), newlyAwarded: [] },
      { rating: 'good', intervalDays: 12, reviewedAt: new Date(), newlyAwarded: [] },
      { rating: 'easy', intervalDays: 25, reviewedAt: new Date(), newlyAwarded: [] },
    ];
    const summary = buildStudySessionSummary({
      reviews,
      nextDueAt: new Date('2024-01-31T00:00:00Z'),
      streakBefore: 1,
      streakAfter: 2,
    });
    expect(summary.totalReviewed).toBe(4);
    expect(summary.byRating).toEqual({ again: 1, hard: 1, good: 1, easy: 1 });
    expect(summary.retentionPct).toBe(50);
    expect(summary.longestIntervalDays).toBe(25);
    expect(summary.streakBefore).toBe(1);
    expect(summary.streakAfter).toBe(2);
    expect(summary.nextDueAt).toBe('2024-01-31T00:00:00.000Z');
  });

  it('deduplicates newlyAwarded across reviews', () => {
    const reviews: SessionReview[] = [
      { rating: 'good', intervalDays: 5, reviewedAt: new Date(), newlyAwarded: ['a1-complete'] },
      { rating: 'good', intervalDays: 6, reviewedAt: new Date(), newlyAwarded: ['a1-complete'] },
      { rating: 'easy', intervalDays: 7, reviewedAt: new Date(), newlyAwarded: ['b1-complete'] },
    ];
    const summary = buildStudySessionSummary({
      reviews,
      nextDueAt: null,
      streakBefore: 0,
      streakAfter: 0,
    });
    expect(summary.newlyAwarded).toEqual(['a1-complete', 'b1-complete']);
  });

  it('returns 0 retentionPct (not NaN) when total is 0', () => {
    const summary = buildStudySessionSummary({
      reviews: [],
      nextDueAt: null,
      streakBefore: 0,
      streakAfter: 0,
    });
    expect(summary.retentionPct).toBe(0);
  });
});
