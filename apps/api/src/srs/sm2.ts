// SuperMemo 2 (SM-2) spaced-repetition algorithm.
//
// Reference: https://super-memory.com/english/ol/sm2.htm
//
// Quality scale (q in 0..5):
//   again -> 0  (total blackout)
//   hard  -> 3
//   good  -> 4
//   easy  -> 5
//
// Invariants enforced here:
//   - easeFactor is clamped to a minimum of 1.3
//   - on a failed review (q < 3) repetitions resets to 0 and interval falls
//     back to 1 day, mirroring the original SM-2 spec
//   - on the first two successful reviews the interval is fixed (1d, 6d),
//     after that it grows by the current ease factor

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export const RATINGS: readonly Rating[] = ['again', 'hard', 'good', 'easy'] as const;

export interface SrsState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: Date;
}

export interface SrsInput {
  rating: Rating;
  state: SrsState;
  now?: Date;
}

const QUALITY: Record<Rating, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
const MAX_EASE = 4.0;

export function initialSrsState(now: Date = new Date()): SrsState {
  return { easeFactor: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: now };
}

export function sm2Next({ rating, state, now }: SrsInput): SrsState {
  const reference = now ?? new Date();
  const q = QUALITY[rating];
  let { easeFactor, intervalDays, repetitions, lapses } = state;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
    lapses += 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    }
  }

  const nextEase = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  easeFactor = clamp(nextEase, MIN_EASE, MAX_EASE);

  const dueAt = new Date(reference.getTime() + intervalDays * DAY_MS);
  return { easeFactor, intervalDays, repetitions, lapses, dueAt };
}

export function isDue(state: SrsState, now: Date = new Date()): boolean {
  return state.dueAt.getTime() <= now.getTime();
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return Math.round(value * 1000) / 1000;
}
