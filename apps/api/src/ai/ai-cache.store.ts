import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class AiCacheStore {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string, now: number = Date.now()): T | null {
    const entry = this.entries.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number, now: number = Date.now()): void {
    this.entries.set(key, { value, expiresAt: now + ttlMs });
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }
}

export function aiCacheKey(input: {
  lessonId: string;
  cardId: string;
  mode: string;
  level: string;
}): string {
  const raw = `${input.lessonId}:${input.cardId}:${input.mode}:${input.level}`;
  return createHash('sha256').update(raw).digest('hex');
}
