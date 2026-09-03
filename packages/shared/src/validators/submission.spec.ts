import { assertSubmissionPayload } from './submission.js';
import { SharedValidationError } from './errors.js';

const validAnnotation = {
  id: 'a-1',
  pageIndex: 0,
  x: 10.5,
  y: 20.25,
  text: 'Hello',
  fontSize: 12,
};

const validPayload = {
  templateId: 'tmpl-1',
  answers: [validAnnotation],
};

describe('assertSubmissionPayload', () => {
  it('accepts a well-formed payload', () => {
    expect(() => assertSubmissionPayload(validPayload)).not.toThrow();
    assertSubmissionPayload(validPayload);
    expect(validPayload.templateId).toBe('tmpl-1');
  });

  it('accepts an empty answers array', () => {
    expect(() => assertSubmissionPayload({ ...validPayload, answers: [] })).not.toThrow();
  });

  it('rejects null', () => {
    expect(() => assertSubmissionPayload(null)).toThrow(SharedValidationError);
  });

  it('rejects missing templateId', () => {
    const { templateId: _templateId, ...rest } = validPayload;
    expect(() => assertSubmissionPayload(rest)).toThrow(/templateId/);
  });

  it('rejects empty templateId', () => {
    expect(() =>
      assertSubmissionPayload({ ...validPayload, templateId: '' }),
    ).toThrow(/templateId/);
  });

  it('rejects non-array answers', () => {
    expect(() =>
      assertSubmissionPayload({ ...validPayload, answers: 'not-array' }),
    ).toThrow(/answers must be an array/);
  });

  it('reports the index when a nested annotation is invalid', () => {
    const bad = { ...validAnnotation, text: 'bad\u0000' };
    expect(() =>
      assertSubmissionPayload({ ...validPayload, answers: [validAnnotation, bad] }),
    ).toThrow(/answers\[1\]/);
  });

  it('rejects unknown status values', () => {
    expect(() =>
      assertSubmissionPayload({ ...validPayload, status: 'BANANA' }),
    ).toThrow(/status/);
  });

  it('accepts the three canonical statuses', () => {
    for (const status of ['DRAFT', 'SUBMITTED', 'GRADED'] as const) {
      expect(() => assertSubmissionPayload({ ...validPayload, status })).not.toThrow();
    }
  });
});