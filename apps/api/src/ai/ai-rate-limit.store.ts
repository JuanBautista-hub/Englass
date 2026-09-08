import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../common/config';

export type RateBucket = 'perMinute' | 'perDay';

export interface AiRateLimitDecision {
  allowed: boolean;
  triggered: RateBucket | null;
  retryAfterSec: number;
}

interface LimitState {
  minuteCount: number;
  minuteResetAt: number;
  dayCount: number;
  dayResetAt: number;
  dayBuckets: Array<{ resetAt: number }>;
}

const DEFAULT_PER_MINUTE = 5;
const DEFAULT_PER_DAY = 60;

@Injectable()
export class AiRateLimitStore {
  private readonly states = new Map<string, LimitState>();
  private readonly perMinute: number;
  private readonly perDay: number;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.perMinute = config.aiRatePerMinute > 0 ? config.aiRatePerMinute : DEFAULT_PER_MINUTE;
    this.perDay = config.aiRatePerDay > 0 ? config.aiRatePerDay : DEFAULT_PER_DAY;
  }

  consume(
    userId: string,
    mode: string,
    now: number = Date.now(),
  ): AiRateLimitDecision {
    const key = `${userId}:${mode}`;
    let state = this.states.get(key);
    if (!state) {
      state = {
        minuteCount: 0,
        minuteResetAt: nextMinuteBoundary(now),
        dayCount: 0,
        dayResetAt: nextDayBoundary(now),
        dayBuckets: [],
      };
      this.states.set(key, state);
    }
    if (state.minuteResetAt <= now) {
      state.minuteCount = 0;
      state.minuteResetAt = nextMinuteBoundary(now);
    }
    if (state.dayResetAt <= now) {
      state.dayCount = 0;
      state.dayResetAt = nextDayBoundary(now);
      state.dayBuckets = [];
    }
    state.dayBuckets = state.dayBuckets.filter((b) => b.resetAt > now);
    if (state.minuteCount >= this.perMinute) {
      return {
        allowed: false,
        triggered: 'perMinute',
        retryAfterSec: Math.max(1, Math.ceil((state.minuteResetAt - now) / 1000)),
      };
    }
    if (state.dayCount + state.dayBuckets.length >= this.perDay) {
      const oldestResetAt = state.dayBuckets[0]?.resetAt ?? state.dayResetAt;
      return {
        allowed: false,
        triggered: 'perDay',
        retryAfterSec: Math.max(1, Math.ceil((oldestResetAt - now) / 1000)),
      };
    }
    state.minuteCount += 1;
    state.dayBuckets.push({ resetAt: state.dayResetAt });
    return {
      allowed: true,
      triggered: null,
      retryAfterSec: 0,
    };
  }

  reset(): void {
    this.states.clear();
  }

  resetUser(userId: string): void {
    for (const key of [...this.states.keys()]) {
      if (key.startsWith(`${userId}:`)) {
        this.states.delete(key);
      }
    }
  }

  size(): number {
    return this.states.size;
  }
}

function nextMinuteBoundary(now: number): number {
  return Math.floor(now / 60_000) * 60_000 + 60_000;
}

function nextDayBoundary(now: number): number {
  const d = new Date(now);
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}
