import { Injectable } from '@angular/core';
import { BilingualSegment } from '../models';

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

export interface SpeakBilingualOptions {
  rate?: number;
  onSegment?: (segment: BilingualSegment, index: number, total: number) => void;
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
    const wanted = lang.toLowerCase();
    const matches = voices.filter((v) => v.lang.toLowerCase().startsWith(wanted));
    if (matches.length === 0) {
      const anyEnglish = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      return anyEnglish ?? voices[0] ?? null;
    }
    const qualityKeywords = ['natural', 'neural', 'premium', 'enhanced', 'google', 'online'];
    const ranked = [...matches].sort((a, b) => {
      const score = (v: SpeechSynthesisVoice): number => {
        const n = v.name.toLowerCase();
        let s = 0;
        if (v.localService) s += 1;
        for (const kw of qualityKeywords) {
          if (n.includes(kw)) s += 10;
        }
        if (v.default) s += 2;
        return s;
      };
      return score(b) - score(a);
    });
    return ranked[0] ?? null;
  }

  speak(text: string, options: SpeakOptions = {}): SpeakHandle | null {
    const synth = this.synth;
    if (!synth) {
      return null;
    }
    synth.cancel();
    return this.speakRaw(text, options);
  }

  async speakSegments(
    segments: BilingualSegment[],
    options: SpeakBilingualOptions = {},
  ): Promise<void> {
    const synth = this.synth;
    if (!synth) {
      return;
    }
    synth.cancel();
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
    utterance.rate = options.rate ?? 0.95;
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