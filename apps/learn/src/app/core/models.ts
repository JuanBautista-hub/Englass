export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconKey: string | null;
}

export interface VocabularyCard {
  id: string;
  term: string;
  definition: string;
  example: string | null;
  translation: string | null;
  explanationEs: string | null;
  audioKey: string | null;
  level: string;
  ordinal: number;
}

export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  level: string;
  categoryId: string;
  ownerId: string;
  sourceLessonId: string | null;
  cards: VocabularyCard[];
  createdAt: string;
  updatedAt: string;
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
