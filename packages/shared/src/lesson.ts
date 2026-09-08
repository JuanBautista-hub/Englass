export type LessonLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface LessonPermissionFlags {
  isCatalog: boolean;
  isOwned: boolean;
  canEdit: boolean;
  canEnroll: boolean;
  alreadyEnrolled: boolean;
}

export interface LessonCardView {
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

export interface LessonView extends LessonPermissionFlags {
  id: string;
  title: string;
  description: string | null;
  level: string;
  categoryId: string;
  ownerId: string;
  sourceLessonId: string | null;
  cards: LessonCardView[];
  createdAt: string;
  updatedAt: string;
}

export interface EnrollResult {
  lesson: LessonView;
  created: boolean;
  clonedFromId: string;
}
