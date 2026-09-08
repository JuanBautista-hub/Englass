import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../common/config';
import { createHash } from 'crypto';

interface CacheEntry {
  buffer: Buffer;
  expiresAt: number;
}

@Injectable()
export class AiAudioCacheStore {
  private readonly store = new Map<string, CacheEntry>();

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  get(text: string, voice: string, lang: string): Buffer | null {
    const key = audioCacheKey(text, voice, lang);
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.buffer;
  }

  set(text: string, voice: string, lang: string, buffer: Buffer): void {
    const key = audioCacheKey(text, voice, lang);
    this.store.set(key, {
      buffer,
      expiresAt: Date.now() + this.config.aiCacheTtlMs,
    });
  }
}

export function audioCacheKey(text: string, voice: string, lang: string): string {
  const hash = createHash('sha256');
  hash.update(text);
  hash.update('|');
  hash.update(voice);
  hash.update('|');
  hash.update(lang);
  return hash.digest('hex');
}
