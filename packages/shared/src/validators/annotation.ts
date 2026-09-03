import { ANNOTATION_LIMITS, type Annotation } from '../annotation.js';
import { SharedValidationError } from './errors.js';

// eslint-disable-next-line no-control-regex -- intentional: this regex is the validator itself
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function assertAnnotation(value: unknown): asserts value is Annotation {
  if (value === null || typeof value !== 'object') {
    throw new SharedValidationError('Annotation must be an object', 'root');
  }
  const v = value as Record<string, unknown>;

  assertString(v.id, 'id');

  if (typeof v.pageIndex !== 'number' || !Number.isInteger(v.pageIndex) || v.pageIndex < 0) {
    throw new SharedValidationError('pageIndex must be a non-negative integer', 'pageIndex');
  }

  if (typeof v.x !== 'number' || !Number.isFinite(v.x)) {
    throw new SharedValidationError('x must be a finite number', 'x');
  }
  if (typeof v.y !== 'number' || !Number.isFinite(v.y)) {
    throw new SharedValidationError('y must be a finite number', 'y');
  }

  assertSanitizedText(v.text, 'text');

  if (
    typeof v.fontSize !== 'number' ||
    v.fontSize < ANNOTATION_LIMITS.MIN_FONT_SIZE ||
    v.fontSize > ANNOTATION_LIMITS.MAX_FONT_SIZE
  ) {
    throw new SharedValidationError(
      `fontSize must be between ${ANNOTATION_LIMITS.MIN_FONT_SIZE} and ${ANNOTATION_LIMITS.MAX_FONT_SIZE}`,
      'fontSize',
    );
  }
}

function assertString(value: unknown, field: string): void {
  if (typeof value !== 'string' || value.length === 0) {
    throw new SharedValidationError(`${field} must be a non-empty string`, field);
  }
}

function assertSanitizedText(value: unknown, field: string): void {
  if (typeof value !== 'string') {
    throw new SharedValidationError(`${field} must be a string`, field);
  }
  if (value.includes('\x00')) {
    throw new SharedValidationError(`${field} contains null bytes`, field);
  }
  if (CONTROL_CHARS.test(value)) {
    throw new SharedValidationError(`${field} contains control characters`, field);
  }
  if (value.length > ANNOTATION_LIMITS.MAX_TEXT_LENGTH) {
    throw new SharedValidationError(
      `${field} exceeds maximum length of ${ANNOTATION_LIMITS.MAX_TEXT_LENGTH}`,
      field,
    );
  }
}