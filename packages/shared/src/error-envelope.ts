export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INVALID_FILE'
  | 'INTERNAL';

export interface ErrorEnvelope {
  statusCode: number;
  message: string;
  code: ErrorCode;
  details?: unknown;
  requestId: string;
}

export const ERROR_CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: 'VALIDATION',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'INVALID_FILE',
  415: 'INVALID_FILE',
  422: 'VALIDATION',
  429: 'RATE_LIMITED',
  500: 'INTERNAL',
  502: 'INTERNAL',
  503: 'INTERNAL',
  504: 'INTERNAL',
};

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.statusCode === 'number' &&
    typeof v.message === 'string' &&
    typeof v.code === 'string' &&
    typeof v.requestId === 'string' &&
    isErrorCode(v.code)
  );
}

function isErrorCode(code: unknown): code is ErrorCode {
  const valid: ReadonlyArray<ErrorCode> = [
    'VALIDATION',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'CONFLICT',
    'RATE_LIMITED',
    'INVALID_FILE',
    'INTERNAL',
  ];
  return typeof code === 'string' && (valid as readonly string[]).includes(code);
}