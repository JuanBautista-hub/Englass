import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewService } from '../review/review.service';
import { SYSTEM_USER_ID } from '../common/constants';

export type Greeting = 'morning' | 'afternoon' | 'evening';

export interface DashboardLessonSummary {
  lessonId: string;
  title: string;
  categoryName: string;
  categorySlug: string;
  level: string;
  dueCount: number;
}

export interface DashboardAchievementView {
  slug: string;
  name: string;
  description: string | null;
  iconKey: string | null;
  awardedAt: string;
}

export interface DashboardLevelProgress {
  level: string;
  order: number;
  completedLessons: number;
  totalLessons: number;
  percent: number;
}

export interface DashboardView {
  greeting: Greeting;
  displayName: string;
  currentStreak: number;
  bestStreak: number;
  dueNow: number;
  dueToday: number;
  level: string | null;
  levelProgress: DashboardLevelProgress;
  nextLesson: DashboardLessonSummary | null;
  recentAchievements: DashboardAchievementView[];
  dailyGoal: { target: number; completed: number };
}

const DAILY_GOAL_TARGET = 20;
const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

function greetingFor(now: Date): Greeting {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly review: ReviewService,
  ) {}

  async getDashboard(userId: string): Promise<DashboardView> {
    const now = new Date();
    const stats = await this.review.getStats(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, currentStreak: true, bestStreak: true },
    });
    const [userLessons, recentAchievements, dailyCompleted] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          title: true,
          level: true,
          categoryId: true,
          cards: { select: { progress: { where: { userId }, select: { dueAt: true } } } },
          category: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.userAchievement.findMany({
        where: { userId },
        orderBy: { awardedAt: 'desc' },
        take: 3,
        include: { achievement: true },
      }),
      this.prisma.reviewLog.count({
        where: { userId, reviewedAt: { gte: startOfUtcDay(now) } },
      }),
    ]);

    const lessonsByLevel = new Map<string, typeof userLessons>();
    for (const l of userLessons) {
      const list = lessonsByLevel.get(l.level) ?? [];
      list.push(l);
      lessonsByLevel.set(l.level, list);
    }

    let currentLevel: string | null = null;
    for (const lv of LEVEL_ORDER) {
      if ((lessonsByLevel.get(lv)?.length ?? 0) > 0) {
        currentLevel = lv;
        break;
      }
    }

    const levelProgress = await this.computeLevelProgress(userId, currentLevel);

    const nextLesson = await this.pickNextLesson(userId, currentLevel, userLessons);

    return {
      greeting: greetingFor(now),
      displayName: user?.displayName ?? 'Student',
      currentStreak: user?.currentStreak ?? 0,
      bestStreak: user?.bestStreak ?? 0,
      dueNow: stats.dueNow,
      dueToday: stats.dueToday,
      level: currentLevel,
      levelProgress,
      nextLesson,
      recentAchievements: recentAchievements.map((row) => ({
        slug: row.achievement.slug,
        name: row.achievement.name,
        description: row.achievement.description,
        iconKey: row.achievement.iconKey,
        awardedAt: row.awardedAt.toISOString(),
      })),
      dailyGoal: { target: DAILY_GOAL_TARGET, completed: dailyCompleted },
    };
  }

  private async computeLevelProgress(
    userId: string,
    level: string | null,
  ): Promise<DashboardLevelProgress> {
    if (!level) {
      const total = await this.prisma.lesson.count({
        where: { ownerId: SYSTEM_USER_ID, level: { in: LEVEL_ORDER as unknown as string[] } },
      });
      const index = LEVEL_ORDER.indexOf(level as (typeof LEVEL_ORDER)[number]);
      return {
        level: level ?? LEVEL_ORDER[0],
        order: index >= 0 ? index : 0,
        completedLessons: 0,
        totalLessons: Math.max(total, 0),
        percent: 0,
      };
    }
    const order = LEVEL_ORDER.indexOf(level as (typeof LEVEL_ORDER)[number]);
    const [catalogTotal, userEnrolled] = await Promise.all([
      this.prisma.lesson.count({ where: { ownerId: SYSTEM_USER_ID, level } }),
      this.prisma.lesson.count({
        where: { ownerId: userId, level, sourceLessonId: { not: null } },
      }),
    ]);
    const percent = catalogTotal > 0 ? Math.round((userEnrolled / catalogTotal) * 100) : 0;
    return {
      level,
      order: order >= 0 ? order : 0,
      completedLessons: userEnrolled,
      totalLessons: catalogTotal,
      percent,
    };
  }

  private async pickNextLesson(
    userId: string,
    level: string | null,
    userLessons: Array<{
      id: string;
      title: string;
      level: string;
      categoryId: string;
      cards: Array<{ progress: Array<{ dueAt: Date }> }>;
      category: { name: string; slug: string };
    }>,
  ): Promise<DashboardLessonSummary | null> {
    const candidateLessons = level
      ? userLessons.filter((l) => l.level === level)
      : userLessons;
    let best: { lesson: (typeof userLessons)[number]; dueCount: number } | null = null;
    for (const l of candidateLessons) {
      const dueCount = l.cards.reduce(
        (acc, c) => acc + c.progress.filter((p) => p.dueAt.getTime() <= Date.now()).length,
        0,
      );
      if (dueCount > 0 && (!best || dueCount > best.dueCount)) {
        best = { lesson: l, dueCount };
      }
    }
    if (best) {
      return this.toSummary(best.lesson, best.dueCount);
    }
    if (level) {
      const firstCatalog = await this.prisma.lesson.findFirst({
        where: { ownerId: SYSTEM_USER_ID, level },
        orderBy: { createdAt: 'asc' },
        include: { category: { select: { name: true, slug: true } } },
      });
      if (firstCatalog) {
        return {
          lessonId: firstCatalog.id,
          title: firstCatalog.title,
          categoryName: firstCatalog.category.name,
          categorySlug: firstCatalog.category.slug,
          level: firstCatalog.level,
          dueCount: 0,
        };
      }
    }
    return null;
  }

  private toSummary(
    l: { id: string; title: string; level: string; category: { name: string; slug: string } },
    dueCount: number,
  ): DashboardLessonSummary {
    return {
      lessonId: l.id,
      title: l.title,
      categoryName: l.category.name,
      categorySlug: l.category.slug,
      level: l.level,
      dueCount,
    };
  }
}
