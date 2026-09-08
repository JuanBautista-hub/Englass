import { Module } from '@nestjs/common';
import { TtsSegmentsService } from './tts-segments.service';
import { TtsSegmentsController } from './tts-segments.controller';

@Module({
  providers: [TtsSegmentsService],
  controllers: [TtsSegmentsController],
  exports: [TtsSegmentsService],
})
export class TtsSegmentsModule {}