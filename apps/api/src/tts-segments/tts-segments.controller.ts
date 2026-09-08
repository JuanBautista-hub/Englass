import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { TtsSegmentsService } from './tts-segments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { BilingualSegment } from './tts-segments.constants';

interface AuthenticatedRequest {
  user: { id: string };
}

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class TtsSegmentsController {
  constructor(private readonly ttsSegments: TtsSegmentsService) {}

  @Get(':cardId/tts-segments')
  segments(
    @Req() req: AuthenticatedRequest,
    @Param('cardId') cardId: string,
  ): Promise<BilingualSegment[]> {
    return this.ttsSegments.getSegmentsForCard(cardId, req.user.id);
  }
}