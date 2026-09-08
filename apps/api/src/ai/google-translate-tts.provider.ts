import { Injectable } from '@nestjs/common';
import {
  TTS_PROVIDER_TIMEOUT_MS,
  TtsProviderFailedError,
  type TtsProvider,
  type TtsSynthesizeOptions,
} from './tts-provider.interface';

const MAX_CHUNK_LEN = 180;
const TTS_URL = 'https://translate.google.com/translate_tts';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

@Injectable()
export class GoogleTranslateTtsProvider implements TtsProvider {
  async synthesize(options: TtsSynthesizeOptions): Promise<Buffer> {
    const tl = mapLang(options.lang);
    const chunks = splitForTts(options.text, MAX_CHUNK_LEN);
    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const buf = await this.fetchChunk(chunk, tl);
      buffers.push(buf);
    }
    return Buffer.concat(buffers);
  }

  private async fetchChunk(text: string, tl: string): Promise<Buffer> {
    const url = `${TTS_URL}?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${encodeURIComponent(tl)}&client=tw-ob`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new TtsProviderFailedError(`gtts_status_${res.status}`);
      }
      const ab = await res.arrayBuffer();
      return Buffer.from(Buffer.from(ab));
    } catch (err) {
      if (err instanceof TtsProviderFailedError) {
        throw err;
      }
      if ((err as { name?: string })?.name === 'AbortError') {
        throw new TtsProviderFailedError('gtts_timeout');
      }
      throw new TtsProviderFailedError('gtts_network', err);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function mapLang(lang: string): string {
  if (!lang) return 'en';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('en')) return 'en';
  return lang.split('-')[0] || 'en';
}

function splitForTts(text: string, maxLen: number): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) {
    return trimmed.length > 0 ? [trimmed] : [];
  }
  const chunks: string[] = [];
  let remaining = trimmed;
  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf('. ', maxLen);
    if (cut < maxLen / 2) {
      cut = remaining.lastIndexOf(', ', maxLen);
    }
    if (cut < maxLen / 2) {
      cut = remaining.lastIndexOf(' ', maxLen);
    }
    if (cut <= 0) {
      cut = maxLen;
    }
    chunks.push(remaining.slice(0, cut + 1).trim());
    remaining = remaining.slice(cut + 1).trim();
  }
  if (remaining.length > 0) {
    chunks.push(remaining);
  }
  return chunks;
}
