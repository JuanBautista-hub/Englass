import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SrsService, type ApplyReviewResult } from '../srs/srs.service';
import type { Rating } from '../srs/sm2';
import { computeMastery, type Mastery } from '../srs/mastery';

export interface DueCardView {
  progressId: string;
  cardId: string;
  lessonId: string;
  lessonTitle: string;
  term: string;
  definition: string;
  example: string | null;
  translation: string | null;
  explanationEs: string | null;
  ordinal: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt: string | null;
  mastery: Mastery;
  lastRatings: Array<{ rating: string; reviewedAt: string }>;
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

interface LastRatingRow {
  rating: string;
  reviewedAt: Date;
}

const LAST_RATINGS_LIMIT = 5;

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
    const cardIds = rows.map((r) => r.cardId);
    const lastRatingsByCard = await this.fetchLastRatings(cardIds, userId);
    return rows.map((r) => this.toDueCardView(r, lesson.id, lesson.title, lastRatingsByCard));
  }

  async listAllDueForUser(userId: string, limit = 50): Promise<DueCardView[]> {
    const rows = await this.prisma.cardProgress.findMany({
      where: { userId, dueAt: { lte: new Date() } },
      include: { card: { include: { lesson: { select: { title: true } } } } },
      orderBy: { dueAt: 'asc' },
      take: limit,
    });
    const cardIds = rows.map((r) => r.cardId);
    const lastRatingsByCard = await this.fetchLastRatings(cardIds, userId);
    return rows.map((r) =>
      this.toDueCardView(r, r.card.lessonId, r.card.lesson.title, lastRatingsByCard),
    );
  }

  async applyReview(userId: string, cardId: string, rating: Rating): Promise<ApplyReviewResult> {
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

  private toDueCardView(
    r: {
      id: string;
      cardId: string;
      easeFactor: number;
      intervalDays: number;
      repetitions: number;
      lapses: number;
      dueAt: Date;
      lastReviewedAt: Date | null;
      card: {
        term: string;
        definition: string;
        example: string | null;
        translation: string | null;
        explanationEs: string | null;
        ordinal: number;
      };
    },
    lessonId: string,
    lessonTitle: string,
    lastRatingsByCard: Map<string, LastRatingRow[]>,
  ): DueCardView {
    const mastery = computeMastery({
      repetitions: r.repetitions,
      easeFactor: r.easeFactor,
      intervalDays: r.intervalDays,
    });
    const lastRatings = (lastRatingsByCard.get(r.cardId) ?? []).map((x) => ({
      rating: x.rating,
      reviewedAt: x.reviewedAt.toISOString(),
    }));
    return {
      progressId: r.id,
      cardId: r.cardId,
      lessonId,
      lessonTitle,
      term: r.card.term,
      definition: r.card.definition,
      example: r.card.example,
      translation: r.card.translation,
      explanationEs: r.card.explanationEs,
      ordinal: r.card.ordinal,
      easeFactor: r.easeFactor,
      intervalDays: r.intervalDays,
      repetitions: r.repetitions,
      lapses: r.lapses,
      dueAt: r.dueAt.toISOString(),
      lastReviewedAt: r.lastReviewedAt ? r.lastReviewedAt.toISOString() : null,
      mastery,
      lastRatings,
    };
  }

  private async fetchLastRatings(
    cardIds: string[],
    userId: string,
  ): Promise<Map<string, LastRatingRow[]>> {
    if (cardIds.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.reviewLog.findMany({
      where: { userId, cardId: { in: cardIds } },
      orderBy: { reviewedAt: 'desc' },
    });
    const grouped = new Map<string, LastRatingRow[]>();
    for (const row of rows) {
      const list = grouped.get(row.cardId) ?? [];
      if (list.length < LAST_RATINGS_LIMIT) {
        list.push({ rating: row.rating, reviewedAt: row.reviewedAt });
        grouped.set(row.cardId, list);
      }
    }
    return grouped;
  }
}
