export interface Annotation {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export const ANNOTATION_LIMITS = {
  MAX_TEXT_LENGTH: 2000,
  MIN_FONT_SIZE: 6,
  MAX_FONT_SIZE: 72,
} as const;

export type AnnotationLimits = typeof ANNOTATION_LIMITS;