import { Injectable, Logger } from '@nestjs/common';

export interface MockSynthesis {
  buffer: Uint8Array;
  voice: string;
  durationMs: number;
}

const SAMPLE_RATE = 16_000;
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
    const words = text.trim().split(/\s+/).filter(Boolean).length || 1;
    const approxDurationMs = Math.min(8000, Math.max(700, words * 380));
    const sampleCount = Math.floor((approxDurationMs / 1000) * SAMPLE_RATE);
    const dataBytes = sampleCount * (BITS_PER_SAMPLE / 8);
    const header = buildWavHeader(dataBytes);
    const data = new Uint8Array(dataBytes);
    const view = new DataView(data.buffer);
    const baseFreq = 180 + (text.length % 5) * 25;
    const amplitude = 0.18 * 0x7fff;
    for (let i = 0; i < sampleCount; i++) {
      const t = i / SAMPLE_RATE;
      const envelope = Math.min(1, Math.min(t / 0.05, (approxDurationMs / 1000 - t) / 0.1));
      const sample = Math.sin(2 * Math.PI * baseFreq * t) * amplitude * envelope;
      view.setInt16(i * 2, sample | 0, true);
    }
    const buffer = new Uint8Array(header.length + data.length);
    buffer.set(header, 0);
    buffer.set(data, header.length);
    const voice = text.length % 2 === 0 ? 'mock-female' : 'mock-male';
    this.logger.debug(`mock TTS: ${words} words, ${approxDurationMs}ms, voice=${voice}`);
    return { buffer, voice, durationMs: approxDurationMs };
  }
}
