import { assertAnnotation } from './annotation.js';
import { SharedValidationError } from './errors.js';
import { ANNOTATION_LIMITS } from '../annotation.js';

const valid = {
  id: 'a-1',
  pageIndex: 0,
  x: 10.5,
  y: 20.25,
  text: 'Hello, world!',
  fontSize: 12,
};

describe('assertAnnotation', () => {
  it('accepts a well-formed annotation', () => {
    expect(() => assertAnnotation(valid)).not.toThrow();
    assertAnnotation(valid);
    expect(valid.id).toBe('a-1');
  });

  it('round-trips through JSON without losing validity', () => {
    const round = JSON.parse(JSON.stringify(valid));
    expect(() => assertAnnotation(round)).not.toThrow();
  });

  it('rejects null', () => {
    expect(() => assertAnnotation(null)).toThrow(SharedValidationError);
  });

  it('rejects primitives', () => {
    expect(() => assertAnnotation(42)).toThrow(SharedValidationError);
    expect(() => assertAnnotation('hello')).toThrow(SharedValidationError);
  });

  it('rejects missing id', () => {
    const { id: _id, ...rest } = valid;
    expect(() => assertAnnotation(rest)).toThrow(/id/);
  });

  it('rejects empty id', () => {
    expect(() => assertAnnotation({ ...valid, id: '' })).toThrow(/id/);
  });

  it('rejects negative pageIndex', () => {
    expect(() => assertAnnotation({ ...valid, pageIndex: -1 })).toThrow(/pageIndex/);
  });

  it('rejects non-integer pageIndex', () => {
    expect(() => assertAnnotation({ ...valid, pageIndex: 1.5 })).toThrow(/pageIndex/);
  });

  it('rejects non-finite x', () => {
    expect(() => assertAnnotation({ ...valid, x: Number.POSITIVE_INFINITY })).toThrow(/x/);
    expect(() => assertAnnotation({ ...valid, x: NaN })).toThrow(/x/);
  });

  it('rejects non-finite y', () => {
    expect(() => assertAnnotation({ ...valid, y: Number.NaN })).toThrow(/y/);
  });

  it('rejects text with null bytes', () => {
    expect(() => assertAnnotation({ ...valid, text: 'bad\u0000text' })).toThrow(/null/);
  });

  it('rejects text with control characters', () => {
    expect(() => assertAnnotation({ ...valid, text: 'ctrl\x01here' })).toThrow(/control/);
  });

  it('rejects text over the max length', () => {
    const long = 'x'.repeat(ANNOTATION_LIMITS.MAX_TEXT_LENGTH + 1);
    expect(() => assertAnnotation({ ...valid, text: long })).toThrow(/maximum length/);
  });

  it('accepts text at exactly the max length', () => {
    const edge = 'x'.repeat(ANNOTATION_LIMITS.MAX_TEXT_LENGTH);
    expect(() => assertAnnotation({ ...valid, text: edge })).not.toThrow();
  });

  it('rejects fontSize below the minimum', () => {
    expect(() =>
      assertAnnotation({ ...valid, fontSize: ANNOTATION_LIMITS.MIN_FONT_SIZE - 1 }),
    ).toThrow(/fontSize/);
  });

  it('rejects fontSize above the maximum', () => {
    expect(() =>
      assertAnnotation({ ...valid, fontSize: ANNOTATION_LIMITS.MAX_FONT_SIZE + 1 }),
    ).toThrow(/fontSize/);
  });

  it('preserves \\t, \\n, \\r in text', () => {
    const text = 'line1\nline2\tcol\r';
    expect(() => assertAnnotation({ ...valid, text })).not.toThrow();
  });
});