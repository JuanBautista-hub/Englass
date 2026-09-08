import { initialSrsState, sm2Next, type Rating } from '../src/srs/sm2';

function run(): void {
  const now = new Date('2025-01-01T00:00:00Z');
  let state = initialSrsState(now);
  const path: Rating[] = ['good', 'good', 'good', 'easy', 'good', 'again', 'good'];
  for (const rating of path) {
    const next = sm2Next({ rating, state, now });
    console.log(
      `rating=${rating.padEnd(5)} ef=${next.easeFactor.toFixed(3)} ` +
        `interval=${next.intervalDays}d reps=${next.repetitions} ` +
        `lapses=${next.lapses} due=${next.dueAt.toISOString().slice(0, 10)}`,
    );
    state = next;
    now.setUTCDate(now.getUTCDate() + next.intervalDays);
  }
}

run();
