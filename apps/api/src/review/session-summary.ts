import type { Rating, RatingCounts, StudySessionSummary } from '@engclass/shared';
import { computeRetentionPct, emptyRatingCounts } from '@engclass/shared';

export interface SessionReview {
  rating: Rating;
  intervalDays: number;
  reviewedAt: Date;
  newlyAwarded: string[];
}

export interface BuildSummaryInput {
  reviews: SessionReview[];
  nextDueAt: Date | null;
  streakBefore: number;
  streakAfter: number;
}

export function buildStudySessionSummary({
  reviews,
  nextDueAt,
  streakBefore,
  streakAfter,
}: BuildSummaryInput): StudySessionSummary {
  const byRating: RatingCounts = emptyRatingCounts();
  let longestIntervalDays = 0;
  const newlyAwarded = new Set<string>();
  for (const r of reviews) {
    byRating[r.rating] += 1;
    if (r.intervalDays > longestIntervalDays) {
      longestIntervalDays = r.intervalDays;
    }
    for (const slug of r.newlyAwarded) {
      newlyAwarded.add(slug);
    }
  }
  const totalReviewed = reviews.length;
  return {
    totalReviewed,
    byRating,
    retentionPct: computeRetentionPct(byRating, totalReviewed),
    longestIntervalDays,
    nextDueAt: nextDueAt ? nextDueAt.toISOString() : null,
    streakBefore,
    streakAfter,
    newlyAwarded: Array.from(newlyAwarded),
  };
}
