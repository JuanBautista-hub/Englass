import type { Mastery } from '../srs/mastery';

export interface CefrLevelMeta {
  code: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  order: number;
  label: string;
  description: string;
}

export interface MasteryMeta {
  label: string;
  badgeClass: string;
}

export const LEVEL_META: readonly CefrLevelMeta[] = [
  { code: 'A1', order: 0, label: 'Beginner', description: 'Basic phrases and vocabulary.' },
  { code: 'A2', order: 1, label: 'Elementary', description: 'Everyday expressions and simple interactions.' },
  { code: 'B1', order: 2, label: 'Intermediate', description: 'Conversational fluency on familiar topics.' },
  { code: 'B2', order: 3, label: 'Upper Intermediate', description: 'Complex topics and fluent argumentation.' },
  { code: 'C1', order: 4, label: 'Advanced', description: 'Expressive, flexible use of the language.' },
  { code: 'C2', order: 5, label: 'Proficiency', description: 'Near-native command of the language.' },
] as const;

export const LEVEL_ORDER: readonly string[] = LEVEL_META.map((l) => l.code);

export const LEVEL_RANK: Readonly<Record<string, number>> = Object.freeze(
  Object.fromEntries(LEVEL_META.map((l) => [l.code, l.order])),
);

export const MASTERY_META: Readonly<Record<Mastery, MasteryMeta>> = Object.freeze({
  learning: { label: 'Learning', badgeClass: 'bg-slate-100 text-slate-700' },
  reviewing: { label: 'Reviewing', badgeClass: 'bg-amber-100 text-amber-800' },
  mastered: { label: 'Mastered', badgeClass: 'bg-emerald-100 text-emerald-800' },
});