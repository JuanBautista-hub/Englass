import {
  ERROR_CODE_BY_STATUS,
  isErrorEnvelope,
  type ErrorCode,
  type ErrorEnvelope,
} from './error-envelope.js';

describe('isErrorEnvelope', () => {
  const valid: ErrorEnvelope = {
    statusCode: 400,
    message: 'bad input',
    code: 'VALIDATION',
    requestId: 'req-123',
  };

  it('accepts a complete envelope', () => {
    expect(isErrorEnvelope(valid)).toBe(true);
    const narrowed: ErrorEnvelope = valid;
    expect(narrowed.code).toBe('VALIDATION');
  });

  it('accepts an envelope with details', () => {
    expect(isErrorEnvelope({ ...valid, details: { field: 'email' } })).toBe(true);
  });

  it('rejects null', () => {
    expect(isErrorEnvelope(null)).toBe(false);
  });

  it('rejects primitives', () => {
    expect(isErrorEnvelope('error')).toBe(false);
    expect(isErrorEnvelope(42)).toBe(false);
  });

  it('rejects when statusCode is missing or non-numeric', () => {
    expect(isErrorEnvelope({ ...valid, statusCode: '400' })).toBe(false);
    expect(isErrorEnvelope({ ...valid, statusCode: undefined })).toBe(false);
  });

  it('rejects when message is missing', () => {
    expect(isErrorEnvelope({ ...valid, message: undefined })).toBe(false);
  });

  it('rejects when code is unknown', () => {
    expect(isErrorEnvelope({ ...valid, code: 'WEIRD' as unknown as ErrorCode })).toBe(false);
  });

  it('rejects when requestId is missing', () => {
    expect(isErrorEnvelope({ ...valid, requestId: undefined })).toBe(false);
  });
});

describe('ERROR_CODE_BY_STATUS', () => {
  it('maps every documented HTTP status to a known ErrorCode', () => {
    const known: ReadonlyArray<ErrorCode> = [
      'VALIDATION',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'RATE_LIMITED',
      'INVALID_FILE',
      'INTERNAL',
    ];
    for (const [status, code] of Object.entries(ERROR_CODE_BY_STATUS)) {
      expect(known).toContain(code);
      expect(Number(status)).toBeGreaterThanOrEqual(400);
    }
  });

  it('maps 401 → UNAUTHORIZED', () => {
    expect(ERROR_CODE_BY_STATUS[401]).toBe('UNAUTHORIZED');
  });

  it('maps 429 → RATE_LIMITED', () => {
    expect(ERROR_CODE_BY_STATUS[429]).toBe('RATE_LIMITED');
  });

  it('maps 500 → INTERNAL', () => {
    expect(ERROR_CODE_BY_STATUS[500]).toBe('INTERNAL');
  });
});