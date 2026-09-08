import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { initialSrsState, sm2Next } from './sm2';
import { computeMastery } from './mastery';
import type { Rating } from './sm2';
import { LEVEL_ORDER } from '../labels/labels.constants';

export interface CardProgressView {
  cardId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt: string | null;
  mastery: ReturnType<typeof computeMastery>;
}

export interface ApplyReviewResult {
  progress: CardProgressView;
  newlyAwarded: string[];
  userBefore: { currentStreak: number; bestStreak: number };
  userAfter: { currentStreak: number; bestStreak: number };
}

const LEVEL_RANK_SRS: Record<string, number> = Object.fromEntries(
  (LEVEL_ORDER as readonly string[]).map((l, i) => [l, i]),
);

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
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
        create: { userId, cardId: c.id, ...initialSrsState(now) },
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
    });
    return rows.map(toView);
  }

  async applyReview(userId: string, cardId: string, rating: Rating): Promise<ApplyReviewResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.cardProgress.findUnique({
        where: { userId_cardId: { userId, cardId } },
      });
      if (!current) {
        throw new Error('card_not_enrolled');
      }
      const state = {
        easeFactor: current.easeFactor,
        intervalDays: current.intervalDays,
        repetitions: current.repetitions,
        lapses: current.lapses,
        dueAt: current.dueAt,
      };
      const now = new Date();
      const next = sm2Next({ rating, state, now });
      const updated = await tx.cardProgress.update({
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
      await tx.reviewLog.create({
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
      const streak = await this.bumpStreak(tx, userId, now);
      return {
        progress: toView(updated),
        userBefore: streak.before,
        userAfter: streak.after,
      };
    });
    const newlyAwarded = await this.maybeAwardLevelBadges(userId, result.progress.cardId);
    return { ...result, newlyAwarded };
  }

  private async bumpStreak(
    tx: Prisma.TransactionClient,
    userId: string,
    now: Date,
  ): Promise<{ before: { currentStreak: number; bestStreak: number }; after: { currentStreak: number; bestStreak: number } }> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, bestStreak: true, lastReviewedAt: true },
    });
    if (!user) {
      throw new Error('user_not_found');
    }
    const before = { currentStreak: user.currentStreak, bestStreak: user.bestStreak };
    const today = startOfUtcDay(now);
    const lastDay = user.lastReviewedAt ? startOfUtcDay(user.lastReviewedAt) : null;
    let current = user.currentStreak;
    if (!lastDay) {
      current = 1;
    } else {
      const dayDiff = Math.floor((today.getTime() - lastDay.getTime()) / (24 * 60 * 60 * 1000));
      if (dayDiff <= 0) {
        // already reviewed today: no change
      } else if (dayDiff === 1) {
        current = user.currentStreak + 1;
      } else {
        current = 1;
      }
    }
    const best = Math.max(user.bestStreak, current);
    await tx.user.update({
      where: { id: userId },
      data: { currentStreak: current, bestStreak: best, lastReviewedAt: now },
    });
    return { before, after: { currentStreak: current, bestStreak: best } };
  }

  private async maybeAwardLevelBadges(
    userId: string,
    _justReviewedCardId: string,
  ): Promise<string[]> {
    const awarded: string[] = [];
    for (const level of LEVEL_ORDER) {
      const slug = `${level.toLowerCase()}-complete`;
      const achievement = await this.prisma.achievement.findUnique({ where: { slug } });
      if (!achievement) {
        continue;
      }
      const existing = await this.prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId: achievement.id } },
      });
      if (existing) {
        continue;
      }
      const total = await this.prisma.lesson.count({
        where: { ownerId: userId, level },
      });
      if (total === 0) {
        continue;
      }
      const completed = await this.prisma.lesson.count({
        where: { ownerId: userId, level, sourceLessonId: { not: null } },
      });
      if (completed < total) {
        continue;
      }
      const allMastered = await this.allCardsMasteredInLevel(userId, level);
      if (!allMastered) {
        continue;
      }
      await this.prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id },
      });
      awarded.push(slug);
    }
    return awarded;
  }

  private async allCardsMasteredInLevel(
    userId: string,
    level: string,
  ): Promise<boolean> {
    const lessons = await this.prisma.lesson.findMany({
      where: { ownerId: userId, level, sourceLessonId: { not: null } },
      select: { id: true },
    });
    if (lessons.length === 0) {
      return false;
    }
    const lessonIds = lessons.map((l) => l.id);
    const cards = await this.prisma.vocabularyCard.findMany({
      where: { lessonId: { in: lessonIds } },
      select: { id: true },
    });
    if (cards.length === 0) {
      return false;
    }
    const cardIds = cards.map((c) => c.id);
    const progress = await this.prisma.cardProgress.findMany({
      where: { userId, cardId: { in: cardIds } },
    });
    if (progress.length !== cardIds.length) {
      return false;
    }
    for (const cp of progress) {
      const m = computeMastery(cp);
      if (m !== 'mastered') {
        return false;
      }
    }
    return true;
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
    mastery: computeMastery({
      repetitions: row.repetitions,
      easeFactor: row.easeFactor,
      intervalDays: row.intervalDays,
    }),
  };
}
