import { SYSTEM_USER_ID } from '../common/constants';
import type {
  LessonCardView,
  LessonPermissionFlags,
  LessonView,
} from '@engclass/shared';

export interface CardViewMinimal {
  id: string;
  term: string;
  definition: string;
  example: string | null;
  translation: string | null;
  explanationEs: string | null;
  audioKey: string | null;
  level: string;
  ordinal: number;
  mastery: string | null;
}

export interface LessonRowMinimal {
  id: string;
  title: string;
  description: string | null;
  level: string;
  categoryId: string;
  ownerId: string;
  sourceLessonId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function cardsToWire(cards: CardViewMinimal[]): LessonCardView[] {
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

export function computeFlags(
  row: Pick<LessonRowMinimal, 'ownerId'>,
  userId: string,
  alreadyEnrolled: boolean,
): LessonPermissionFlags {
  const isCatalog = row.ownerId === SYSTEM_USER_ID;
  const isOwned = row.ownerId === userId;
  if (isOwned) {
    return {
      isCatalog: false,
      isOwned: true,
      canEdit: true,
      canEnroll: false,
      alreadyEnrolled: false,
    };
  }
  if (isCatalog) {
    return {
      isCatalog: true,
      isOwned: alreadyEnrolled,
      canEdit: alreadyEnrolled,
      canEnroll: !alreadyEnrolled,
      alreadyEnrolled,
    };
  }
  return {
    isCatalog: false,
    isOwned: false,
    canEdit: false,
    canEnroll: false,
    alreadyEnrolled: false,
  };
}

export function ownerFlags(): LessonPermissionFlags {
  return {
    isCatalog: false,
    isOwned: true,
    canEdit: true,
    canEnroll: false,
    alreadyEnrolled: false,
  };
}

export function emptyFlags(): LessonPermissionFlags {
  return {
    isCatalog: false,
    isOwned: false,
    canEdit: false,
    canEnroll: false,
    alreadyEnrolled: false,
  };
}

export function lessonRowToWire(
  row: LessonRowMinimal,
  flags: LessonPermissionFlags,
  cards: CardViewMinimal[] = [],
): LessonView {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    level: row.level,
    categoryId: row.categoryId,
    ownerId: row.ownerId,
    sourceLessonId: row.sourceLessonId,
    cards: cardsToWire(cards),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...flags,
  };
}

export function isCatalogLessonOwnedByOtherUser(
  row: Pick<LessonRowMinimal, 'ownerId'>,
  userId: string,
): boolean {
  return row.ownerId !== userId && row.ownerId !== SYSTEM_USER_ID;
}
