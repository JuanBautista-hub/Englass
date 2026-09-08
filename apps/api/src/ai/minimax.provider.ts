import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../common/config';
import {
  AI_PROVIDER,
  AiProviderFailedError,
  PROVIDER_TIMEOUT_MS,
  type AiProvider,
  type AiProviderCompleteOptions,
  type AiProviderResult,
} from './ai-provider.interface';

interface ChatCompletionsRequest {
  model: string;
  temperature: number;
  max_tokens: number;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
}

interface ChatCompletionsResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { total_tokens?: number };
}

@Injectable()
export class MiniMaxProvider implements AiProvider {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async complete(options: AiProviderCompleteOptions): Promise<AiProviderResult> {
    const maxRetries = 2;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.attemptComplete(options);
      } catch (err) {
        lastErr = err;
        if (this.isRetryable(err) && attempt < maxRetries) {
          const backoffMs = 400 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  private isRetryable(err: unknown): boolean {
    if (!(err instanceof AiProviderFailedError)) {
      return false;
    }
    return (
      err.message.startsWith('provider_status_5') ||
      err.message === 'provider_status_429' ||
      err.message === 'provider_timeout' ||
      err.message === 'provider_network'
    );
  }

  private async attemptComplete(options: AiProviderCompleteOptions): Promise<AiProviderResult> {
    const url = `${this.config.aiBaseUrl.replace(/\/+$/, '')}/chat/completions`;
    const body: ChatCompletionsRequest = {
      model: this.config.aiModel,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.user },
      ],
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.aiApiKey}`,
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new AiProviderFailedError(`provider_status_${res.status}`);
      }
      const json = (await res.json()) as ChatCompletionsResponse;
      const text = json.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || text.length === 0) {
        throw new AiProviderFailedError('provider_empty_text');
      }
      return {
        text,
        tokensUsed: json.usage?.total_tokens ?? 0,
      };
    } catch (err: unknown) {
      if (err instanceof AiProviderFailedError) {
        throw err;
      }
      if ((err as { name?: string })?.name === 'AbortError') {
        throw new AiProviderFailedError('provider_timeout');
      }
      throw new AiProviderFailedError('provider_network', err);
    } finally {
      clearTimeout(timeout);
    }
  }
}
