import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BilingualSegment, parseBilingual, sanitizeForTts } from './tts-segments.constants';

@Injectable()
export class TtsSegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSegmentsForCard(cardId: string, userId: string): Promise<BilingualSegment[]> {
    const card = await this.prisma.vocabularyCard.findUnique({
      where: { id: cardId },
      include: { lesson: { select: { ownerId: true } } },
    });
    if (!card) {
      throw new NotFoundException('card_not_found');
    }
    if (card.lesson.ownerId !== userId) {
      throw new NotFoundException('card_not_found');
    }
    if (!card.explanationEs) {
      return [];
    }
    return parseBilingual(sanitizeForTts(card.explanationEs));
  }
}