export const TTS_PROVIDER = Symbol('TTS_PROVIDER');

export const TTS_PROVIDER_TIMEOUT_MS = 30_000;

export interface TtsSynthesizeOptions {
  text: string;
  voice: string;
  lang: string;
}

export interface TtsProvider {
  synthesize(options: TtsSynthesizeOptions): Promise<Buffer>;
}

export class TtsProviderFailedError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'TtsProviderFailedError';
  }
}
