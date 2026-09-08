import type { AiMode } from '@engclass/shared';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiProviderCompleteOptions {
  system: string;
  user: string;
  mode: AiMode;
  maxTokens: number;
  temperature: number;
}

export interface AiProviderResult {
  text: string;
  tokensUsed: number;
}

export interface AiProvider {
  complete(options: AiProviderCompleteOptions): Promise<AiProviderResult>;
}

export const PROVIDER_TIMEOUT_MS = 30_000;

export class AiProviderFailedError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AiProviderFailedError';
    this.cause = cause;
  }
}
