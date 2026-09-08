export type { Annotation, AnnotationLimits } from './annotation.js';
export { ANNOTATION_LIMITS } from './annotation.js';

export type { SubmissionStatus, SubmissionPayload } from './dto/submission.js';
export { isDraft, isImmutable } from './dto/submission.js';

export type { LoginRequest, RefreshResponse } from './dto/auth.js';
export type { UploadResponse, TemplateSummary } from './dto/pdf.js';

export type { ErrorCode, ErrorEnvelope } from './error-envelope.js';
export { ERROR_CODE_BY_STATUS, isErrorEnvelope } from './error-envelope.js';

export { SharedValidationError } from './validators/errors.js';
export { assertAnnotation } from './validators/annotation.js';
export { assertSubmissionPayload } from './validators/submission.js';

export type {
  LessonLevel,
  LessonPermissionFlags,
  LessonCardView,
  LessonView,
  EnrollResult,
} from './lesson.js';

export type {
  Rating,
  RatingCounts,
  StudySessionSummary,
  DueCardView,
  ApplyReviewApiResult,
} from './study.js';
export {
  RATINGS,
  LAST_RATINGS_LIMIT,
  isRating,
  emptyRatingCounts,
  computeRetentionPct,
} from './study.js';

export type { MeView } from './me.js';

export type {
  AiMode,
  CefrCode,
  AiExplainResponse,
  AiDeepenResponse,
  AiHistoryEntry,
  AiErrorCode,
} from './ai.js';
export { EXPLAIN_MAX_TOKENS, DEEPEN_MAX_TOKENS, isAiMode } from './ai.js';
