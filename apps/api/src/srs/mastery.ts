export type Mastery = 'learning' | 'reviewing' | 'mastered';

export interface MasteryInput {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
}

export function computeMastery(progress: MasteryInput): Mastery {
  if (progress.repetitions < 2) {
    return 'learning';
  }
  const meetsReviewing = progress.repetitions < 5 || progress.easeFactor < 2.2;
  if (meetsReviewing) {
    return 'reviewing';
  }
  return progress.intervalDays >= 21 ? 'mastered' : 'reviewing';
}
