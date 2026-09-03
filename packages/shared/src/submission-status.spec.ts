import { isDraft, isImmutable, type SubmissionStatus } from './dto/submission.js';

describe('isDraft', () => {
  it.each<[SubmissionStatus, boolean]>([
    ['DRAFT', true],
    ['SUBMITTED', false],
    ['GRADED', false],
  ])('isDraft(%s) === %s', (status, expected) => {
    expect(isDraft(status)).toBe(expected);
  });
});

describe('isImmutable', () => {
  it.each<[SubmissionStatus, boolean]>([
    ['DRAFT', false],
    ['SUBMITTED', true],
    ['GRADED', true],
  ])('isImmutable(%s) === %s', (status, expected) => {
    expect(isImmutable(status)).toBe(expected);
  });
});