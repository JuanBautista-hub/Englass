import { Injectable } from '@angular/core';

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

export interface SpeakHandle {
  voice: string;
  lang: string;
  done: Promise<void>;
  cancel: () => void;
}

export interface BilingualSegment {
  text: string;
  lang: 'en' | 'es';
}

export interface SpeakBilingualOptions {
  rate?: number;
  onSegment?: (segment: BilingualSegment, index: number, total: number) => void;
}

const QUOTE_REGEX = /"([^"\n]+)"|'([^'\n]+)'/g;

export function parseBilingual(text: string): BilingualSegment[] {
  const segments: BilingualSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(QUOTE_REGEX)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      const chunk = text.slice(lastIndex, idx);
      if (chunk.trim().length > 0) {
        segments.push({ text: chunk, lang: 'es' });
      }
    }
    const inner = match[1] ?? match[2] ?? '';
    if (inner.trim().length > 0) {
      segments.push({ text: inner, lang: 'en' });
    }
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < text.length) {
    const chunk = text.slice(lastIndex);
    if (chunk.trim().length > 0) {
      segments.push({ text: chunk, lang: 'es' });
    }
  }
  if (segments.length === 0 && text.trim().length > 0) {
    segments.push({ text, lang: 'es' });
  }
  return segments;
}

@Injectable({ providedIn: 'root' })
export class TtsService {
  private get synth(): SpeechSynthesis | null {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis
      : null;
  }

  isSupported(): boolean {
    return this.synth !== null;
  }

  listVoices(): SpeechSynthesisVoice[] {
    return this.synth?.getVoices() ?? [];
  }

  async pickVoice(lang = 'en'): Promise<SpeechSynthesisVoice | null> {
    const synth = this.synth;
    if (!synth) {
      return null;
    }
    let voices = synth.getVoices();
    if (voices.length === 0) {
      voices = await this.waitForVoices();
    }
    const exact = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (exact) {
      return exact;
    }
    const anyEnglish = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    return anyEnglish ?? voices[0] ?? null;
  }

  speak(text: string, options: SpeakOptions = {}): SpeakHandle | null {
    const synth = this.synth;
    if (!synth) {
      return null;
    }
    synth.cancel();
    return this.speakRaw(text, options);
  }

  async speakBilingual(
    text: string,
    options: SpeakBilingualOptions = {},
  ): Promise<void> {
    const synth = this.synth;
    if (!synth) {
      return;
    }
    synth.cancel();
    const segments = parseBilingual(text);
    const rate = options.rate ?? 0.95;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      options.onSegment?.(seg, i, segments.length);
      const handle = this.speakRaw(seg.text, {
        lang: seg.lang === 'en' ? 'en-US' : 'es-ES',
        rate,
      });
      if (!handle) {
        return;
      }
      try {
        await handle.done;
      } catch {
        return;
      }
    }
  }

  cancel(): void {
    this.synth?.cancel();
  }

  private speakRaw(text: string, options: SpeakOptions): SpeakHandle {
    const synth = this.synth!;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang ?? 'en-US';
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = options.pitch ?? 1;
    let resolveDone: () => void = () => {};
    let rejectDone: (reason: Error) => void = () => {};
    const done = new Promise<void>((resolve, reject) => {
      resolveDone = resolve;
      rejectDone = reject;
    });
    utterance.onend = () => resolveDone();
    utterance.onerror = (ev: SpeechSynthesisErrorEvent) => {
      if (ev.error === 'canceled' || ev.error === 'interrupted') {
        resolveDone();
      } else {
        rejectDone(new Error(`speech_${ev.error}`));
      }
    };
    void this.pickVoice(utterance.lang).then((voice) => {
      if (voice) {
        utterance.voice = voice;
      }
      synth.speak(utterance);
    });
    return {
      voice: utterance.voice?.name ?? 'default',
      lang: utterance.lang,
      done,
      cancel: () => synth.cancel(),
    };
  }

  private waitForVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const synth = this.synth;
      if (!synth) {
        resolve([]);
        return;
      }
      const initial = synth.getVoices();
      if (initial.length > 0) {
        resolve(initial);
        return;
      }
      const handler = () => {
        const v = synth.getVoices();
        if (v.length > 0) {
          synth.removeEventListener('voiceschanged', handler);
          resolve(v);
        }
      };
      synth.addEventListener('voiceschanged', handler);
      window.setTimeout(() => {
        synth.removeEventListener('voiceschanged', handler);
        resolve(synth.getVoices());
      }, timeoutMs);
    });
  }
}
