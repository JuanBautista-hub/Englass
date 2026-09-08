import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_USER_ID } from '../common/constants';
import { computeMastery } from '../srs/mastery';

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

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

@Injectable()
export class LearningPathService {
  constructor(private readonly prisma: PrismaService) {}

  async getLearningPath(userId: string): Promise<LearningPathLevelView[]> {
    const catalogLevels = await this.prisma.category.findMany();
    const [catalogLessons, userLessons, userAchievements] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { ownerId: SYSTEM_USER_ID },
        include: { _count: { select: { cards: true } }, category: true },
        orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.lesson.findMany({
        where: { ownerId: userId, sourceLessonId: { not: null } },
        include: { cards: { include: { progress: { where: { userId } } } } },
      }),
      this.prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: { select: { slug: true } } },
      }),
    ]);

    const completedLevelSlugs = new Set(
      userAchievements.map((a) => a.achievement.slug.replace('-complete', '')),
    );

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
      } else if (status === 'available' && totalLessons > 0) {
        const firstCatalog = catalogForLevel[0];
        if (firstCatalog) {
          recommendedLessonId = firstCatalog.id;
        }
      }

      result.push({
        level,
        order: LEVEL_ORDER.indexOf(level),
        totalLessons: Math.max(totalLessons, completedLessons),
        completedLessons,
        percent,
        recommendedLessonId,
        status,
        lessons: catalogForLevel.map((l) => ({
          lessonId: l.id,
          title: l.title,
          categoryName: l.category.name,
          categorySlug: l.category.slug,
          cardCount: l._count.cards,
        })),
      });

      lastStatus = status;
    }

    void catalogLevels;
    return result;
  }
}
