import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Rating,
  SrsState,
  initialSrsState,
  sm2Next,
} from './sm2';

export interface CardProgressView {
  cardId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt: string | null;
}

@Injectable()
export class SrsService {
  constructor(private readonly prisma: PrismaService) {}

  async enrollUserInLesson(userId: string, lessonId: string): Promise<number> {
    const cards = await this.prisma.vocabularyCard.findMany({
      where: { lessonId },
      select: { id: true },
    });
    const now = new Date();
    let created = 0;
    for (const c of cards) {
      const result = await this.prisma.cardProgress.upsert({
        where: { userId_cardId: { userId, cardId: c.id } },
        create: {
          userId,
          cardId: c.id,
          ...initialSrsState(now),
        },
        update: {},
      });
      if (result.createdAt.getTime() === now.getTime()) {
        created += 1;
      }
    }
    return created;
  }

  async listDueForUser(userId: string, limit = 20): Promise<CardProgressView[]> {
    const rows = await this.prisma.cardProgress.findMany({
      where: { userId, dueAt: { lte: new Date() } },
      orderBy: { dueAt: 'asc' },
      take: limit,
    });
    return rows.map(toView);
  }

  async applyReview(userId: string, cardId: string, rating: Rating): Promise<CardProgressView> {
    const current = await this.prisma.cardProgress.findUnique({
      where: { userId_cardId: { userId, cardId } },
    });
    if (!current) {
      throw new Error('card_not_enrolled');
    }
    const state: SrsState = {
      easeFactor: current.easeFactor,
      intervalDays: current.intervalDays,
      repetitions: current.repetitions,
      lapses: current.lapses,
      dueAt: current.dueAt,
    };
    const now = new Date();
    const next = sm2Next({ rating, state, now });
    const updated = await this.prisma.cardProgress.update({
      where: { userId_cardId: { userId, cardId } },
      data: {
        easeFactor: next.easeFactor,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        dueAt: next.dueAt,
        lastReviewedAt: now,
      },
    });
    await this.prisma.reviewLog.create({
      data: {
        userId,
        cardId,
        rating,
        reviewedAt: now,
        prevIntervalDays: state.intervalDays,
        newIntervalDays: updated.intervalDays,
        prevEaseFactor: state.easeFactor,
        newEaseFactor: updated.easeFactor,
        lapsesAfter: updated.lapses,
      },
    });
    return toView(updated);
  }
}

function toView(row: {
  cardId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: Date;
  lastReviewedAt: Date | null;
}): CardProgressView {
  return {
    cardId: row.cardId,
    easeFactor: row.easeFactor,
    intervalDays: row.intervalDays,
    repetitions: row.repetitions,
    lapses: row.lapses,
    dueAt: row.dueAt.toISOString(),
    lastReviewedAt: row.lastReviewedAt ? row.lastReviewedAt.toISOString() : null,
  };
}
