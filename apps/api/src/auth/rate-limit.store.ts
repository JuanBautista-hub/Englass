import { Injectable } from '@nestjs/common';

export interface RateLimitBucket {
  count: number;
  resetAt: Date;
}

@Injectable()
export class RateLimitStore {
  private readonly buckets = new Map<string, RateLimitBucket>();

  hit(key: string, windowMs: number, limit: number): { allowed: boolean; remaining: number; resetAt: Date } {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt.getTime() <= now) {
      const resetAt = new Date(now + windowMs);
      this.buckets.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetAt };
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
    }
    return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
  }

  clear(key: string): void {
    this.buckets.delete(key);
  }

  clearUser(userId: string): void {
    for (const key of this.buckets.keys()) {
      if (key.includes(`:u:${userId}:`) || key.endsWith(`:u:${userId}`)) {
        this.buckets.delete(key);
      }
    }
  }

  reset(): void {
    this.buckets.clear();
  }

  size(): number {
    return this.buckets.size;
  }
}
