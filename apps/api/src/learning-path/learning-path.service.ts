import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_USER_ID } from '../common/constants';
import { LessonsService } from '../lessons/lessons.service';
import { LEVEL_ORDER } from '../labels/labels.constants';

export type PathLevelStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface LearningPathLessonView {
  lessonId: string;
  title: string;
  categoryName: string;
  categorySlug: string;
  cardCount: number;
}

export interface LearningPathLevelView {
  level: string;
  order: number;
  totalLessons: number;
  completedLessons: number;
  percent: number;
  recommendedLessonId: string | null;
  status: PathLevelStatus;
  lessons: LearningPathLessonView[];
}

const LEVEL_RANK: Record<string, number> = Object.fromEntries(
  (LEVEL_ORDER as readonly string[]).map((l, i) => [l, i]),
);

function computeMaxLevel(
  completedLevelSlugs: Set<string>,
  userLessons: Array<{ level: string }>,
): string {
  const order = LEVEL_ORDER as readonly string[];
  let highestIdx = -1;
  for (let i = 0; i < order.length; i += 1) {
    if (completedLevelSlugs.has(order[i].toLowerCase())) {
      highestIdx = i;
    } else {
      break;
    }
  }
  for (const l of userLessons) {
    const idx = order.indexOf(l.level);
    if (idx > highestIdx) {
      highestIdx = idx;
    }
  }
  if (highestIdx < 0) {
    return 'A1';
  }
  return order[Math.min(highestIdx + 1, order.length - 1)];
}

@Injectable()
export class LearningPathService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lessons: LessonsService,
  ) {}

  async getLearningPath(userId: string): Promise<LearningPathLevelView[]> {
    const catalogLessons = await this.prisma.lesson.findMany({
      where: { ownerId: SYSTEM_USER_ID },
      include: { _count: { select: { cards: true } }, category: true },
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
    });

    let userLessons = await this.prisma.lesson.findMany({
      where: { ownerId: userId, sourceLessonId: { not: null } },
      include: {
        category: { select: { name: true, slug: true } },
        cards: { include: { progress: { where: { userId } } } },
      },
    });

    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: { select: { slug: true } } },
    });
    const completedLevels = new Set(
      userAchievements.map((a) => a.achievement.slug.replace('-complete', '')),
    );

    const maxLevel = computeMaxLevel(completedLevels, userLessons);

    await this.lessons.autoEnrollAllForUser(userId, maxLevel);
    userLessons = await this.prisma.lesson.findMany({
      where: { ownerId: userId, sourceLessonId: { not: null } },
      include: {
        category: { select: { name: true, slug: true } },
        cards: { include: { progress: { where: { userId } } } },
      },
    });

    const userByLevel = new Map<string, typeof userLessons>();
    for (const l of userLessons) {
      const list = userByLevel.get(l.level) ?? [];
      list.push(l);
      userByLevel.set(l.level, list);
    }

    const dueCountByLesson = new Map<string, number>();
    for (const l of userLessons) {
      const due = l.cards.reduce(
        (acc, c) => acc + c.progress.filter((p) => p.dueAt.getTime() <= Date.now()).length,
        0,
      );
      dueCountByLesson.set(l.id, due);
    }

    const result: LearningPathLevelView[] = [];
    let lastStatus: PathLevelStatus = 'available';

    for (const level of LEVEL_ORDER) {
      const catalogForLevel = catalogLessons.filter((l) => l.level === level);
      const totalLessons = catalogForLevel.length;
      if (totalLessons === 0 && (userByLevel.get(level)?.length ?? 0) === 0) {
        continue;
      }
      const userForLevel = userByLevel.get(level) ?? [];
      const completedLessons = userForLevel.length;
      const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      let status: PathLevelStatus;
      if (completedLessons === 0 && totalLessons > 0) {
        status = lastStatus === 'available' || lastStatus === 'completed' ? 'available' : 'locked';
      } else if (completedLessons >= totalLessons && totalLessons > 0) {
        status = 'completed';
      } else {
        status = 'in_progress';
      }

      let recommendedLessonId: string | null = null;
      if (status === 'in_progress') {
        const sortedByDue = [...userForLevel].sort(
          (a, b) => (dueCountByLesson.get(b.id) ?? 0) - (dueCountByLesson.get(a.id) ?? 0),
        );
        const top = sortedByDue.find((l) => (dueCountByLesson.get(l.id) ?? 0) > 0);
        if (top) {
          recommendedLessonId = top.id;
        }
      } else if (status === 'available' && userForLevel.length > 0) {
        recommendedLessonId = userForLevel[0].id;
      }

      result.push({
        level,
        order: LEVEL_ORDER.indexOf(level),
        totalLessons: Math.max(totalLessons, completedLessons),
        completedLessons,
        percent,
        recommendedLessonId,
        status,
        lessons: userForLevel.map((l) => ({
          lessonId: l.id,
          title: l.title,
          categoryName: l.category.name,
          categorySlug: l.category.slug,
          cardCount: l.cards.length,
        })),
      });

      lastStatus = status;
    }

    return result;
  }
}
