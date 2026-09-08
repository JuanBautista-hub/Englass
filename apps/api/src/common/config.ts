import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AppConfig {
  lessonsViewFlagsEnabled: boolean;
  lessonsCatalogDeprecationSunsetDays: number;
  aiEnabled: boolean;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiTtsModel: string;
  aiCacheTtlMs: number;
  aiRatePerMinute: number;
  aiRatePerDay: number;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

export function loadAppConfig(config: ConfigService): AppConfig {
  const rawFlags = config.get<string>('LESSONS_VIEW_FLAGS_ENABLED');
  const rawSunset = config.get<string>('LESSONS_CATALOG_DEPRECATION_DAYS');
  const rawAiEnabled = config.get<string>('AI_ENABLED');
  return {
    lessonsViewFlagsEnabled: rawFlags ? rawFlags === 'true' : true,
    lessonsCatalogDeprecationSunsetDays: rawSunset ? Number(rawSunset) : 30,
    aiEnabled: rawAiEnabled ? rawAiEnabled === 'true' : false,
    aiBaseUrl: config.get<string>('AI_BASE_URL') ?? 'https://api.minimax.io/v1',
    aiApiKey: config.get<string>('AI_API_KEY') ?? '',
    aiModel: config.get<string>('AI_MODEL') ?? 'MiniMax-M3',
    aiTtsModel: config.get<string>('AI_TTS_MODEL') ?? 'gemini-2.5-flash-preview-tts',
    aiCacheTtlMs: Number(config.get<string>('AI_CACHE_TTL_MS') ?? 24 * 60 * 60 * 1000),
    aiRatePerMinute: Number(config.get<string>('AI_RATE_PER_MINUTE') ?? 5),
    aiRatePerDay: Number(config.get<string>('AI_RATE_PER_DAY') ?? 60),
  };
}

@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: loadAppConfig,
      inject: [ConfigService],
    },
  ],
  exports: [APP_CONFIG],
})
export class ConfigDefaultsModule {}
