import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

export interface LessonView {
  id: string;
  title: string;
  prompt: string;
  translation: string | null;
  level: string;
  audioKey: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

type LessonRow = {
  id: string;
  title: string;
  prompt: string;
  translation: string | null;
  level: string;
  audioKey: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

function toView(row: LessonRow): LessonView {
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    translation: row.translation,
    level: row.level,
    audioKey: row.audioKey,
    ownerId: row.ownerId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string): Promise<LessonView[]> {
    const rows = await this.prisma.lesson.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toView);
  }

  async findOne(id: string, ownerId: string): Promise<LessonView> {
    const row = await this.prisma.lesson.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('lesson_not_found');
    }
    if (row.ownerId !== ownerId) {
      throw new ForbiddenException('lesson_not_owned');
    }
    return toView(row);
  }

  async create(ownerId: string, dto: CreateLessonDto): Promise<LessonView> {
    const row = await this.prisma.lesson.create({
      data: {
        ownerId,
        title: dto.title,
        prompt: dto.prompt,
        translation: dto.translation ?? null,
        level: dto.level ?? 'A1',
      },
    });
    return toView(row);
  }

  async update(id: string, ownerId: string, dto: UpdateLessonDto): Promise<LessonView> {
    await this.findOne(id, ownerId);
    const row = await this.prisma.lesson.update({ where: { id }, data: dto });
    return toView(row);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findOne(id, ownerId);
    await this.prisma.lesson.delete({ where: { id } });
  }
}
