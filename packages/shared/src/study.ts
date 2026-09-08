export type Rating = 'again' | 'hard' | 'good' | 'easy';

export const RATINGS: readonly Rating[] = ['again', 'hard', 'good', 'easy'] as const;

export interface RatingCounts {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface StudySessionSummary {
  totalReviewed: number;
  byRating: RatingCounts;
  retentionPct: number;
  longestIntervalDays: number;
  nextDueAt: string | null;
  streakBefore: number;
  streakAfter: number;
  newlyAwarded: string[];
}

export interface DueCardView {
  progressId: string;
  cardId: string;
  lessonId: string;
  lessonTitle: string;
  term: string;
  definition: string;
  example: string | null;
  translation: string | null;
  explanationEs: string | null;
  ordinal: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt: string | null;
  mastery: string;
  lastRatings: Array<{ rating: string; reviewedAt: string }>;
}

export interface ApplyReviewApiResult {
  progress: {
    cardId: string;
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    lapses: number;
    dueAt: string;
    lastReviewedAt: string | null;
    mastery: string;
  };
  updatedCard: DueCardView;
  sessionDone: boolean;
  newlyAwarded: string[];
  userBefore: { currentStreak: number; bestStreak: number };
  userAfter: { currentStreak: number; bestStreak: number };
}

export const LAST_RATINGS_LIMIT = 5;

export function isRating(value: unknown): value is Rating {
  return typeof value === 'string' && (RATINGS as readonly string[]).includes(value);
}

export function emptyRatingCounts(): RatingCounts {
  return { again: 0, hard: 0, good: 0, easy: 0 };
}

export function computeRetentionPct(counts: RatingCounts, total: number): number {
  if (total <= 0) return 0;
  const kept = counts.good + counts.easy;
  return Math.round((kept / total) * 100);
}
