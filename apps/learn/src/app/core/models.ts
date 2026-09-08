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
  mastery: Mastery | null;
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

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

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

export type Mastery = 'learning' | 'reviewing' | 'mastered';

export interface DashboardLevelProgress {
  level: string;
  order: number;
  completedLessons: number;
  totalLessons: number;
  percent: number;
}

export interface DashboardNextLesson {
  lessonId: string;
  title: string;
  categoryName: string;
  categorySlug: string;
  level: string;
  dueCount: number;
}

export interface DashboardAchievement {
  slug: string;
  name: string;
  description: string | null;
  iconKey: string | null;
  awardedAt: string;
}

export interface DashboardView {
  greeting: 'morning' | 'afternoon' | 'evening';
  displayName: string;
  currentStreak: number;
  bestStreak: number;
  dueNow: number;
  dueToday: number;
  level: string | null;
  levelProgress: DashboardLevelProgress;
  nextLesson: DashboardNextLesson | null;
  recentAchievements: DashboardAchievement[];
  dailyGoal: { target: number; completed: number };
}

export type PathLevelStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface LearningPathLesson {
  lessonId: string;
  title: string;
  categoryName: string;
  categorySlug: string;
  cardCount: number;
}

export interface LearningPathLevel {
  level: string;
  order: number;
  totalLessons: number;
  completedLessons: number;
  percent: number;
  recommendedLessonId: string | null;
  status: PathLevelStatus;
  lessons: LearningPathLesson[];
}
