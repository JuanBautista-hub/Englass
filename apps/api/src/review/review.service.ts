import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SrsService } from '../srs/srs.service';
import type { Rating } from '../srs/sm2';
import type { CardProgressView } from '../srs/srs.service';

export interface DueCardView {
  progressId: string;
  cardId: string;
  lessonId: string;
  lessonTitle: string;
  term: string;
  definition: string;
  example: string | null;
  translation: string | null;
  ordinal: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt: string | null;
}

export interface StudySessionSummary {
  totalReviewed: number;
  byRating: { again: number; hard: number; good: number; easy: number };
  nextDueAt: string | null;
}

export interface ReviewStatsView {
  dueToday: number;
  dueNow: number;
  learned: number;
  total: number;
  averageEase: number;
  lapses: number;
}

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly srs: SrsService,
  ) {}

  async listDueForLesson(userId: string, lessonId: string): Promise<DueCardView[]> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, ownerId: userId },
      select: { id: true, title: true },
    });
    if (!lesson) {
      throw new NotFoundException('lesson_not_found');
    }
    const rows = await this.prisma.cardProgress.findMany({
      where: {
        userId,
        dueAt: { lte: new Date() },
        card: { lessonId },
      },
      include: { card: true },
      orderBy: [{ dueAt: 'asc' }, { card: { ordinal: 'asc' } }],
    });
    return rows.map((r) => ({
      progressId: r.id,
      cardId: r.cardId,
      lessonId,
      lessonTitle: lesson.title,
      term: r.card.term,
      definition: r.card.definition,
      example: r.card.example,
      translation: r.card.translation,
      ordinal: r.card.ordinal,
      easeFactor: r.easeFactor,
      intervalDays: r.intervalDays,
      repetitions: r.repetitions,
      lapses: r.lapses,
      dueAt: r.dueAt.toISOString(),
      lastReviewedAt: r.lastReviewedAt ? r.lastReviewedAt.toISOString() : null,
    }));
  }

  async listAllDueForUser(userId: string, limit = 50): Promise<DueCardView[]> {
    const rows = await this.prisma.cardProgress.findMany({
      where: { userId, dueAt: { lte: new Date() } },
      include: { card: { include: { lesson: { select: { title: true } } } } },
      orderBy: { dueAt: 'asc' },
      take: limit,
    });
    return rows.map((r) => ({
      progressId: r.id,
      cardId: r.cardId,
      lessonId: r.card.lessonId,
      lessonTitle: r.card.lesson.title,
      term: r.card.term,
      definition: r.card.definition,
      example: r.card.example,
      translation: r.card.translation,
      ordinal: r.card.ordinal,
      easeFactor: r.easeFactor,
      intervalDays: r.intervalDays,
      repetitions: r.repetitions,
      lapses: r.lapses,
      dueAt: r.dueAt.toISOString(),
      lastReviewedAt: r.lastReviewedAt ? r.lastReviewedAt.toISOString() : null,
    }));
  }

  async applyReview(userId: string, cardId: string, rating: Rating): Promise<CardProgressView> {
    const progress = await this.prisma.cardProgress.findUnique({
      where: { userId_cardId: { userId, cardId } },
    });
    if (!progress) {
      throw new NotFoundException('card_not_enrolled');
    }
    const card = await this.prisma.vocabularyCard.findUnique({
      where: { id: cardId },
      select: { lesson: { select: { ownerId: true } } },
    });
    if (!card || card.lesson.ownerId !== userId) {
      throw new ForbiddenException('card_not_owned');
    }
    return this.srs.applyReview(userId, cardId, rating);
  }

  async getStats(userId: string): Promise<ReviewStatsView> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [dueNow, dueToday, total, easeAgg, lapsesAgg, learnedCount] = await Promise.all([
      this.prisma.cardProgress.count({
        where: { userId, dueAt: { lte: now } },
      }),
      this.prisma.cardProgress.count({
        where: { userId, dueAt: { gte: startOfDay, lt: endOfDay } },
      }),
      this.prisma.cardProgress.count({ where: { userId } }),
      this.prisma.cardProgress.aggregate({
        where: { userId },
        _avg: { easeFactor: true },
      }),
      this.prisma.cardProgress.aggregate({
        where: { userId },
        _sum: { lapses: true },
      }),
      this.prisma.cardProgress.count({
        where: { userId, repetitions: { gte: 2 } },
      }),
    ]);
    return {
      dueNow,
      dueToday,
      learned: learnedCount,
      total,
      averageEase: Number((easeAgg._avg.easeFactor ?? 2.5).toFixed(2)),
      lapses: lapsesAgg._sum.lapses ?? 0,
    };
  }
}
