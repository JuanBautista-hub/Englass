import { Injectable, Logger } from '@nestjs/common';

export interface MockSynthesis {
  buffer: Uint8Array;
  voice: string;
  durationMs: number;
}

const SAMPLE_RATE = 22_050;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1;

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function buildWavHeader(dataLength: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8), true);
  view.setUint16(32, CHANNELS * (BITS_PER_SAMPLE / 8), true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  return new Uint8Array(header);
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  synthesizeMock(text: string): MockSynthesis {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = Math.max(1, words.length);
    const perWordMs = 320;
    const gapMs = 80;
    const approxDurationMs = Math.min(8000, wordCount * perWordMs + (wordCount - 1) * gapMs);
    const sampleCount = Math.floor((approxDurationMs / 1000) * SAMPLE_RATE);
    const dataBytes = sampleCount * (BITS_PER_SAMPLE / 8);
    const header = buildWavHeader(dataBytes);
    const data = new Uint8Array(dataBytes);
    const view = new DataView(data.buffer);

    const amplitude = 0.45 * 0x7fff;
    const attack = 0.015;
    const release = 0.04;
    const totalSec = approxDurationMs / 1000;

    const wordFreqs: number[] = words.map((w) => {
      const hash = [...w].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
      const base = 392 + (Math.abs(hash) % 5) * 66;
      return base + (text.length % 3) * 33;
    });
    if (wordFreqs.length === 0) {
      wordFreqs.push(440);
    }

    for (let i = 0; i < sampleCount; i++) {
      const t = i / SAMPLE_RATE;
      const wordIdx = Math.min(wordCount - 1, Math.floor(t / ((perWordMs + gapMs) / 1000)));
      const wordStart = wordIdx * (perWordMs + gapMs) / 1000;
      const localT = t - wordStart;
      const wordSec = perWordMs / 1000;

      let env = 0;
      if (localT >= 0 && localT < wordSec) {
        if (localT < attack) {
          env = localT / attack;
        } else if (localT > wordSec - release) {
          env = Math.max(0, (wordSec - localT) / release);
        } else {
          env = 1;
        }
      }

      const baseFreq = wordFreqs[wordIdx] ?? 440;
      const vibrato = Math.sin(2 * Math.PI * 5 * t) * 8;
      const freq = baseFreq + vibrato;
      const sample = Math.sin(2 * Math.PI * freq * t) * amplitude * env;
      view.setInt16(i * 2, clamp16(sample), true);
    }

    const buffer = new Uint8Array(header.length + data.length);
    buffer.set(header, 0);
    buffer.set(data, header.length);
    const voice = text.length % 2 === 0 ? 'mock-female' : 'mock-male';
    this.logger.debug(`mock TTS: ${wordCount} words, ${approxDurationMs}ms, voice=${voice}`);
    return { buffer, voice, durationMs: approxDurationMs };
  }
}

function clamp16(sample: number): number {
  if (sample > 0x7fff) {
    return 0x7fff;
  }
  if (sample < -0x8000) {
    return -0x8000;
  }
  return sample | 0;
}
