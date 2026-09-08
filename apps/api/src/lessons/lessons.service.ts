import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { SYSTEM_USER_ID } from '../common/constants';
import { APP_CONFIG, type AppConfig } from '../common/config';
import { initialSrsState } from '../srs/sm2';
import { computeMastery, type Mastery } from '../srs/mastery';
import { LEVEL_ORDER, LEVEL_RANK } from '../labels/labels.constants';
import type {
  EnrollResult,
  LessonCardView,
  LessonPermissionFlags,
  LessonView,
} from '@engclass/shared';
import {
  computeFlags,
  emptyFlags,
  isCatalogLessonOwnedByOtherUser,
  lessonRowToWire,
  ownerFlags,
  type CardViewMinimal,
  type LessonRowMinimal,
} from './lesson.flags';

export type { LessonCardView, LessonView, LessonPermissionFlags, EnrollResult };

export interface CardView {
  id: string;
  term: string;
  definition: string;
  example: string | null;
  translation: string | null;
  explanationEs: string | null;
  audioKey: string | null;
  level: string;
  ordinal: number;
  mastery: Mastery | null;
}

export interface CatalogLessonSummary {
  id: string;
  title: string;
  description: string | null;
  level: string;
  cardCount: number;
}

export interface CatalogCategoryGroup {
  id: string;
  slug: string;
  name: string;
  iconKey: string | null;
  lessons: CatalogLessonSummary[];
}

export interface CatalogLevelLesson {
  id: string;
  title: string;
  description: string | null;
  cardCount: number;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  level: string;
}

export interface CatalogLevelGroup {
  level: string;
  order: number;
  lessons: CatalogLevelLesson[];
}

export interface OwnedLessonSummary {
  id: string;
  title: string;
  description: string | null;
  level: string;
  categoryId: string;
  cardCount: number;
  sourceLessonId: string | null;
  createdAt: string;
}

export interface OwnedLessonsByLevelGroup {
  level: string;
  order: number;
  lessons: OwnedLessonSummary[];
}

interface PrismaLessonWithCards {
  id: string;
  title: string;
  description: string | null;
  level: string;
  categoryId: string;
  ownerId: string;
  sourceLessonId: string | null;
  createdAt: Date;
  updatedAt: Date;
  cards: Array<{
    id: string;
    term: string;
    definition: string;
    example: string | null;
    translation: string | null;
    explanationEs: string | null;
    audioKey: string | null;
    level: string;
    ordinal: number;
    progress?: Array<{
      repetitions: number;
      easeFactor: number;
      intervalDays: number;
    }>;
  }>;
}

function toCardView(card: PrismaLessonWithCards['cards'][number]): CardView {
  const cp = card.progress?.[0];
  const mastery = cp
    ? computeMastery({
        repetitions: cp.repetitions,
        easeFactor: cp.easeFactor,
        intervalDays: cp.intervalDays,
      })
    : null;
  return {
    id: card.id,
    term: card.term,
    definition: card.definition,
    example: card.example,
    translation: card.translation,
    explanationEs: card.explanationEs,
    audioKey: card.audioKey,
    level: card.level,
    ordinal: card.ordinal,
    mastery,
  };
}

function cardsToMinimal(cards: CardView[]): CardViewMinimal[] {
  return cards.map((c) => ({
    id: c.id,
    term: c.term,
    definition: c.definition,
    example: c.example,
    translation: c.translation,
    explanationEs: c.explanationEs,
    audioKey: c.audioKey,
    level: c.level,
    ordinal: c.ordinal,
    mastery: c.mastery,
  }));
}

function cardRowToMinimal(
  cards: PrismaLessonWithCards['cards'],
): CardViewMinimal[] {
  return cards.map((c) => {
    const mastery = c.progress?.[0]
      ? computeMastery({
          repetitions: c.progress[0].repetitions,
          easeFactor: c.progress[0].easeFactor,
          intervalDays: c.progress[0].intervalDays,
        })
      : null;
    return {
      id: c.id,
      term: c.term,
      definition: c.definition,
      example: c.example,
      translation: c.translation,
      explanationEs: c.explanationEs,
      audioKey: c.audioKey,
      level: c.level,
      ordinal: c.ordinal,
      mastery,
    };
  });
}

function toRowMinimal(row: PrismaLessonWithCards): LessonRowMinimal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    level: row.level,
    categoryId: row.categoryId,
    ownerId: row.ownerId,
    sourceLessonId: row.sourceLessonId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);
  private readonly flagsEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.flagsEnabled = config.lessonsViewFlagsEnabled;
  }

  async list(ownerId: string): Promise<LessonView[]> {
    const rows = await this.prisma.lesson.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: { cards: { orderBy: { ordinal: 'asc' } } },
    });
    return rows.map((r) =>
      lessonRowToWire(
        toRowMinimal(r),
        this.flagsEnabled ? ownerFlags() : emptyFlags(),
        cardRowToMinimal(r.cards),
      ),
    );
  }

  async findOne(id: string, userId: string): Promise<LessonView> {
    const row = (await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        cards: {
          orderBy: { ordinal: 'asc' },
          include: { progress: { where: { userId } } },
        },
      },
    })) as PrismaLessonWithCards | null;
    if (!row) {
      throw new NotFoundException('lesson_not_found');
    }
    if (!this.flagsEnabled) {
      if (row.ownerId !== userId) {
        throw new ForbiddenException('lesson_not_owned');
      }
      return lessonRowToWire(
        toRowMinimal(row),
        ownerFlags(),
        cardRowToMinimal(row.cards),
      );
    }
    if (isCatalogLessonOwnedByOtherUser(row, userId)) {
      throw new NotFoundException('lesson_not_found');
    }
    let alreadyEnrolled = false;
    if (row.ownerId === SYSTEM_USER_ID) {
      const clone = await this.prisma.lesson.findFirst({
        where: { ownerId: userId, sourceLessonId: row.id },
        select: { id: true },
      });
      alreadyEnrolled = clone !== null;
    }
    return lessonRowToWire(
      toRowMinimal(row),
      computeFlags(row, userId, alreadyEnrolled),
      cardRowToMinimal(row.cards),
    );
  }

  async findOneAsCatalog(id: string, userId?: string): Promise<LessonView> {
    const row = (await this.prisma.lesson.findUnique({
      where: { id },
      include: { cards: { orderBy: { ordinal: 'asc' } } },
    })) as PrismaLessonWithCards | null;
    if (!row) {
      throw new NotFoundException('lesson_not_found');
    }
    const effectiveUserId = userId ?? SYSTEM_USER_ID;
    if (!this.flagsEnabled) {
      return lessonRowToWire(
        toRowMinimal(row),
        ownerFlags(),
        cardRowToMinimal(row.cards),
      );
    }
    let alreadyEnrolled = false;
    if (row.ownerId === SYSTEM_USER_ID && userId) {
      const clone = await this.prisma.lesson.findFirst({
        where: { ownerId: userId, sourceLessonId: row.id },
        select: { id: true },
      });
      alreadyEnrolled = clone !== null;
    }
    return lessonRowToWire(
      toRowMinimal(row),
      computeFlags(row, effectiveUserId, alreadyEnrolled),
      cardRowToMinimal(row.cards),
    );
  }

  async create(ownerId: string, dto: CreateLessonDto): Promise<LessonView> {
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException('category_not_found');
    }
    const row = await this.prisma.lesson.create({
      data: {
        ownerId,
        title: dto.title,
        description: dto.description ?? null,
        level: dto.level ?? 'A1',
        categoryId: dto.categoryId,
      },
      include: { cards: true },
    });
    return lessonRowToWire(
      toRowMinimal(row),
      this.flagsEnabled ? ownerFlags() : emptyFlags(),
      cardRowToMinimal(row.cards),
    );
  }

  async update(id: string, ownerId: string, dto: UpdateLessonDto): Promise<LessonView> {
    await this.findOne(id, ownerId);
    const row = await this.prisma.lesson.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.level !== undefined ? { level: dto.level } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      },
      include: { cards: { orderBy: { ordinal: 'asc' } } },
    });
    return lessonRowToWire(
      toRowMinimal(row),
      this.flagsEnabled ? ownerFlags() : emptyFlags(),
      cardRowToMinimal(row.cards),
    );
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findOne(id, ownerId);
    await this.prisma.lesson.delete({ where: { id } });
  }

  async addCard(lessonId: string, ownerId: string, dto: CreateCardDto): Promise<CardView> {
    await this.findOne(lessonId, ownerId);
    const lastOrdinal = await this.prisma.vocabularyCard.aggregate({
      where: { lessonId },
      _max: { ordinal: true },
    });
    const ordinal = dto.ordinal ?? (lastOrdinal._max.ordinal ?? -1) + 1;
    const card = await this.prisma.vocabularyCard.create({
      data: {
        lessonId,
        term: dto.term,
        definition: dto.definition,
        example: dto.example ?? null,
        translation: dto.translation ?? null,
        explanationEs: dto.explanationEs ?? null,
        level: dto.level ?? 'A1',
        ordinal,
      },
    });
    return toCardView(card);
  }

  async listCards(lessonId: string, ownerId: string): Promise<CardView[]> {
    await this.findOne(lessonId, ownerId);
    const rows = await this.prisma.vocabularyCard.findMany({
      where: { lessonId },
      orderBy: { ordinal: 'asc' },
    });
    return rows.map(toCardView);
  }

  async listCatalog(): Promise<CatalogCategoryGroup[]> {
    const categories = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    const lessons = await this.prisma.lesson.findMany({
      where: { ownerId: SYSTEM_USER_ID },
      include: { _count: { select: { cards: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const byCategory = new Map<string, CatalogLessonSummary[]>();
    for (const l of lessons) {
      const list = byCategory.get(l.categoryId) ?? [];
      list.push({
        id: l.id,
        title: l.title,
        description: l.description,
        level: l.level,
        cardCount: l._count.cards,
      });
      byCategory.set(l.categoryId, list);
    }
    return categories
      .filter((c) => (byCategory.get(c.id)?.length ?? 0) > 0)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        iconKey: c.iconKey,
        lessons: byCategory.get(c.id) ?? [],
      }));
  }

  async listCatalogByLevel(): Promise<CatalogLevelGroup[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: { ownerId: SYSTEM_USER_ID },
      include: {
        _count: { select: { cards: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
    });
    const byLevel = new Map<string, CatalogLevelLesson[]>();
    for (const l of lessons) {
      const list = byLevel.get(l.level) ?? [];
      list.push({
        id: l.id,
        title: l.title,
        description: l.description,
        cardCount: l._count.cards,
        categoryId: l.category.id,
        categoryName: l.category.name,
        categorySlug: l.category.slug,
        level: l.level,
      });
      byLevel.set(l.level, list);
    }
    return Array.from(byLevel.entries())
      .sort((a, b) => {
        const ra = LEVEL_RANK[a[0]] ?? 999;
        const rb = LEVEL_RANK[b[0]] ?? 999;
        return ra - rb;
      })
      .map(([level, items]) => ({
        level,
        order: LEVEL_RANK[level] ?? 999,
        lessons: items,
      }));
  }

  async autoEnrollAllForUser(
    userId: string,
    maxLevel: string = 'A1',
  ): Promise<{ enrolled: number; skipped: number }> {
    const rank = LEVEL_RANK[maxLevel];
    const eligibleLevels = rank === undefined
      ? LEVEL_ORDER.slice()
      : LEVEL_ORDER.slice(0, rank + 1);
    this.logger.log(
      `autoEnrollAllForUser(userId=${userId}, maxLevel=${maxLevel}) eligible=${eligibleLevels.join(',')}`,
    );

    const catalog = await this.prisma.lesson.findMany({
      where: { ownerId: SYSTEM_USER_ID, level: { in: [...eligibleLevels] } },
      include: { cards: { orderBy: { ordinal: 'asc' } } },
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
    });

    if (catalog.length === 0) {
      return { enrolled: 0, skipped: 0 };
    }

    const alreadyEnrolled = new Set(await this.listEnrolledSourceIds(userId));
    const targets = catalog.filter((c) => !alreadyEnrolled.has(c.id));
    const skipped = catalog.length - targets.length;

    const initial = initialSrsState(new Date());

    for (const source of targets) {
      const existing = await this.prisma.lesson.findFirst({
        where: { ownerId: userId, sourceLessonId: source.id },
      });
      if (existing) {
        continue;
      }
      const clone = await this.prisma.lesson.create({
        data: {
          ownerId: userId,
          title: source.title,
          description: source.description,
          level: source.level,
          categoryId: source.categoryId,
          sourceLessonId: source.id,
        },
      });
      if (source.cards.length > 0) {
        await this.prisma.vocabularyCard.createMany({
          data: source.cards.map((src, idx) => ({
            lessonId: clone.id,
            ordinal: idx,
            term: src.term,
            definition: src.definition,
            example: src.example,
            translation: src.translation,
            explanationEs: src.explanationEs,
            audioKey: src.audioKey,
            level: src.level,
          })),
        });
      }
      const clonedCards = await this.prisma.vocabularyCard.findMany({
        where: { lessonId: clone.id },
        select: { id: true },
      });
      if (clonedCards.length > 0) {
        await this.prisma.cardProgress.createMany({
          data: clonedCards.map((c) => ({
            userId,
            cardId: c.id,
            easeFactor: initial.easeFactor,
            intervalDays: initial.intervalDays,
            repetitions: initial.repetitions,
            lapses: initial.lapses,
            dueAt: initial.dueAt,
          })),
        });
      }
    }

    return { enrolled: targets.length, skipped };
  }

  async listOwnedByLevel(userId: string): Promise<OwnedLessonsByLevelGroup[]> {
    const rows = await this.prisma.lesson.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { cards: true } } },
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
    });
    const byLevel = new Map<string, OwnedLessonSummary[]>();
    for (const l of rows) {
      const list = byLevel.get(l.level) ?? [];
      list.push({
        id: l.id,
        title: l.title,
        description: l.description,
        level: l.level,
        categoryId: l.categoryId,
        cardCount: l._count.cards,
        sourceLessonId: l.sourceLessonId,
        createdAt: l.createdAt.toISOString(),
      });
      byLevel.set(l.level, list);
    }
    return Array.from(byLevel.entries())
      .sort((a, b) => {
        const ra = LEVEL_RANK[a[0]] ?? 999;
        const rb = LEVEL_RANK[b[0]] ?? 999;
        return ra - rb;
      })
      .map(([level, items]) => ({
        level,
        order: LEVEL_RANK[level] ?? 999,
        lessons: items,
      }));
  }

  async listEnrolledSourceIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.lesson.findMany({
      where: { ownerId: userId, sourceLessonId: { not: null } },
      select: { sourceLessonId: true },
    });
    return rows
      .map((r) => r.sourceLessonId)
      .filter((s): s is string => s !== null);
  }

  async enrollInCatalog(userId: string, sourceLessonId: string): Promise<EnrollResult> {
    const source = await this.prisma.lesson.findUnique({
      where: { id: sourceLessonId },
      include: { cards: { orderBy: { ordinal: 'asc' } } },
    });
    if (!source) {
      throw new NotFoundException('lesson_not_found');
    }
    if (source.ownerId !== SYSTEM_USER_ID) {
      throw new ForbiddenException('not_a_catalog_lesson');
    }
    const existing = await this.prisma.lesson.findFirst({
      where: { ownerId: userId, sourceLessonId },
      include: { cards: { orderBy: { ordinal: 'asc' } } },
    });
    if (existing) {
      return {
        lesson: lessonRowToWire(
          toRowMinimal(existing),
          {
            isCatalog: true,
            isOwned: true,
            canEdit: true,
            canEnroll: false,
            alreadyEnrolled: true,
          },
          cardRowToMinimal(existing.cards),
        ),
        created: false,
        clonedFromId: sourceLessonId,
      };
    }
    const clone = await this.prisma.lesson.create({
      data: {
        ownerId: userId,
        title: source.title,
        description: source.description,
        level: source.level,
        categoryId: source.categoryId,
        sourceLessonId,
      },
    });
    let ordinal = 0;
    const now = new Date();
    for (const src of source.cards) {
      await this.prisma.vocabularyCard.create({
        data: {
          lessonId: clone.id,
          ordinal,
          term: src.term,
          definition: src.definition,
          example: src.example,
          translation: src.translation,
          audioKey: src.audioKey,
          level: src.level,
        },
      });
      ordinal += 1;
    }
    const clonedCards = await this.prisma.vocabularyCard.findMany({
      where: { lessonId: clone.id },
      orderBy: { ordinal: 'asc' },
    });
    for (const card of clonedCards) {
      await this.prisma.cardProgress.upsert({
        where: { userId_cardId: { userId, cardId: card.id } },
        create: {
          userId,
          cardId: card.id,
          ...initialSrsState(now),
        },
        update: {},
      });
    }
    return {
      lesson: lessonRowToWire(
        toRowMinimal(clone as unknown as PrismaLessonWithCards),
        {
          isCatalog: true,
          isOwned: true,
          canEdit: true,
          canEnroll: false,
          alreadyEnrolled: false,
        },
        cardRowToMinimal(
          clonedCards.map((c) => ({
            id: c.id,
            term: c.term,
            definition: c.definition,
            example: c.example,
            translation: c.translation,
            explanationEs: c.explanationEs,
            audioKey: c.audioKey,
            level: c.level,
            ordinal: c.ordinal,
          })),
        ),
      ),
      created: true,
      clonedFromId: sourceLessonId,
    };
  }
}
