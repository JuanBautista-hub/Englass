import { Module } from '@nestjs/common';
import { ConfigDefaultsModule } from '../common/config';
import { AiService } from './ai.service';
import { MiniMaxProvider } from './minimax.provider';
import { GoogleTranslateTtsProvider } from './google-translate-tts.provider';
import { AiCacheStore } from './ai-cache.store';
import { AiAudioCacheStore } from './ai-audio-cache.store';
import { AiRateLimitStore } from './ai-rate-limit.store';
import { AI_PROVIDER } from './ai-provider.interface';
import { TTS_PROVIDER } from './tts-provider.interface';
import { AiController } from './ai.controller';

@Module({
  imports: [ConfigDefaultsModule],
  controllers: [AiController],
  providers: [
    AiService,
    MiniMaxProvider,
    GoogleTranslateTtsProvider,
    AiCacheStore,
    AiAudioCacheStore,
    AiRateLimitStore,
    {
      provide: AI_PROVIDER,
      useExisting: MiniMaxProvider,
    },
    {
      provide: TTS_PROVIDER,
      useExisting: GoogleTranslateTtsProvider,
    },
  ],
  exports: [AiService, AiCacheStore, AiAudioCacheStore, AiRateLimitStore],
})
export class AiModule {}
