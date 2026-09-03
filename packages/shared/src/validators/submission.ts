import type { SubmissionPayload } from '../dto/submission.js';
import { assertAnnotation } from './annotation.js';
import { SharedValidationError } from './errors.js';

export function assertSubmissionPayload(
  value: unknown,
): asserts value is SubmissionPayload {
  if (value === null || typeof value !== 'object') {
    throw new SharedValidationError('Submission payload must be an object', 'root');
  }
  const v = value as Record<string, unknown>;

  if (typeof v.templateId !== 'string' || v.templateId.length === 0) {
    throw new SharedValidationError('templateId must be a non-empty string', 'templateId');
  }

  if (!Array.isArray(v.answers)) {
    throw new SharedValidationError('answers must be an array', 'answers');
  }

  for (let i = 0; i < v.answers.length; i++) {
    try {
      assertAnnotation(v.answers[i]);
    } catch (err) {
      if (err instanceof SharedValidationError) {
        throw new SharedValidationError(
          `answers[${i}]: ${err.message}`,
          `answers[${i}].${err.field}`,
        );
      }
      throw err;
    }
  }

  if (v.status !== undefined) {
    const valid = ['DRAFT', 'SUBMITTED', 'GRADED'] as const;
    if (typeof v.status !== 'string' || !(valid as readonly string[]).includes(v.status)) {
      throw new SharedValidationError(
        `status must be one of ${valid.join(', ')}`,
        'status',
      );
    }
  }
}