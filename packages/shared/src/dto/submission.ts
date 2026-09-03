import type { Annotation } from '../annotation.js';

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'GRADED';

export interface SubmissionPayload {
  templateId: string;
  answers: Annotation[];
  status?: SubmissionStatus;
}

export function isDraft(status: SubmissionStatus): boolean {
  return status === 'DRAFT';
}

export function isImmutable(status: SubmissionStatus): boolean {
  return status === 'SUBMITTED' || status === 'GRADED';
}