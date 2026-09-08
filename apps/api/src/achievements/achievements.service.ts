import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AchievementView {
  slug: string;
  name: string;
  description: string | null;
  iconKey: string | null;
  awardedAt: string;
}

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<AchievementView[]> {
    const rows = await this.prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { awardedAt: 'desc' },
      include: { achievement: true },
    });
    return rows.map((r) => ({
      slug: r.achievement.slug,
      name: r.achievement.name,
      description: r.achievement.description,
      iconKey: r.achievement.iconKey,
      awardedAt: r.awardedAt.toISOString(),
    }));
  }
}
