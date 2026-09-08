import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../common/config';
import {
  TTS_PROVIDER,
  TtsProviderFailedError,
  TTS_PROVIDER_TIMEOUT_MS,
  type TtsProvider,
  type TtsSynthesizeOptions,
} from './tts-provider.interface';

interface GeminiTtsRequest {
  contents: Array<{ parts: Array<{ text: string }> }>;
  generationConfig: {
    response_modalities: ['AUDIO'];
    speech_config: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: string } };
      languageCode: string;
    };
  };
}

interface GeminiTtsResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
}

const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;
const PCM_BITS_PER_SAMPLE = 16;

@Injectable()
export class GeminiTtsProvider implements TtsProvider {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async synthesize(options: TtsSynthesizeOptions): Promise<Buffer> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.aiTtsModel}:generateContent`;
    const body: GeminiTtsRequest = {
      contents: [{ parts: [{ text: options.text }] }],
      generationConfig: {
        response_modalities: ['AUDIO'],
        speech_config: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: options.voice } },
          languageCode: options.lang,
        },
      },
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TTS_PROVIDER_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.aiApiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.status >= 500) {
        throw new TtsProviderFailedError(`tts_provider_status_${res.status}`);
      }
      if (!res.ok) {
        throw new TtsProviderFailedError(`tts_provider_status_${res.status}`);
      }
      const json = (await res.json()) as GeminiTtsResponse;
      const b64 = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (typeof b64 !== 'string' || b64.length === 0) {
        throw new TtsProviderFailedError('tts_provider_empty_audio');
      }
      const pcm = Buffer.from(b64, 'base64');
      return wrapPcmAsWav(pcm);
    } catch (err: unknown) {
      if (err instanceof TtsProviderFailedError) {
        throw err;
      }
      if ((err as { name?: string })?.name === 'AbortError') {
        throw new TtsProviderFailedError('tts_provider_timeout');
      }
      throw new TtsProviderFailedError('tts_provider_network', err);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function wrapPcmAsWav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  const dataLength = pcm.length;
  const fileLength = dataLength + 36;
  header.write('RIFF', 0);
  header.writeUInt32LE(fileLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(PCM_CHANNELS, 22);
  header.writeUInt32LE(PCM_SAMPLE_RATE, 24);
  header.writeUInt32LE(PCM_SAMPLE_RATE * PCM_CHANNELS * (PCM_BITS_PER_SAMPLE / 8), 28);
  header.writeUInt16LE(PCM_CHANNELS * (PCM_BITS_PER_SAMPLE / 8), 32);
  header.writeUInt16LE(PCM_BITS_PER_SAMPLE, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return Buffer.concat([header, pcm]);
}
