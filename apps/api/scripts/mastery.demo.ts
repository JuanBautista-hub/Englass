import { computeMastery } from '../src/srs/mastery';

function expect(actual: string, expected: string, label: string): void {
  if (actual !== expected) {
    console.error(`FAIL ${label}: got ${actual}, want ${expected}`);
    process.exitCode = 1;
  } else {
    console.log(`ok   ${label}: ${actual}`);
  }
}

expect(computeMastery({ repetitions: 0, easeFactor: 2.5, intervalDays: 0 }), 'learning', 'brand new');
expect(computeMastery({ repetitions: 1, easeFactor: 2.5, intervalDays: 1 }), 'learning', 'one correct');
expect(computeMastery({ repetitions: 2, easeFactor: 2.5, intervalDays: 6 }), 'reviewing', 'two correct');
expect(computeMastery({ repetitions: 3, easeFactor: 1.9, intervalDays: 6 }), 'reviewing', 'low ease');
expect(computeMastery({ repetitions: 5, easeFactor: 2.6, intervalDays: 30 }), 'mastered', 'mature high ease');
expect(computeMastery({ repetitions: 5, easeFactor: 2.6, intervalDays: 14 }), 'reviewing', 'interval too short');
expect(computeMastery({ repetitions: 5, easeFactor: 2.1, intervalDays: 30 }), 'reviewing', 'ease below threshold');
