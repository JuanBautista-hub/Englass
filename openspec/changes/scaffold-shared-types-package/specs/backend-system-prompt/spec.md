## ADDED Requirements

### Requirement: Backend prompt lists the exact named exports the backend consumes from `@engclass/shared`
The backend system prompt SHALL list every named export from `@engclass/shared` that the backend imports, including `Annotation`, `SubmissionPayload`, `SubmissionStatus`, `isDraft`, `isImmutable`, `ErrorEnvelope`, `ErrorCode`, `isErrorEnvelope`, `ERROR_CODE_BY_STATUS`, `assertAnnotation`, `assertSubmissionPayload`, `SharedValidationError`, `ANNOTATION_LIMITS`, `LoginRequest`, `UploadResponse`, and `TemplateSummary`. The prompt SHALL require that zod DTO schemas use `assertSubmissionPayload` as the post-parse runtime check (or replicate its rules byte-for-byte) so client and server agree on what passes.

#### Scenario: Prompt enumerates the named exports
- **WHEN** the prompt describes the "Tipos compartidos" section
- **THEN** it lists `Annotation`, `SubmissionPayload`, `SubmissionStatus`, `isDraft`, `isImmutable`, `ErrorEnvelope`, `ErrorCode`, `isErrorEnvelope`, `ERROR_CODE_BY_STATUS`, `assertAnnotation`, `assertSubmissionPayload`, `SharedValidationError`, `ANNOTATION_LIMITS`, `LoginRequest`, `UploadResponse`, and `TemplateSummary`

#### Scenario: Prompt mandates alignment between zod and shared validators
- **WHEN** the prompt describes the `POST /api/v1/pdfs/submissions` schema
- **THEN** it requires that the zod schema and `assertSubmissionPayload` reject the same inputs (same length cap, same control-char handling, same null-byte rejection)

#### Scenario: Prompt mandates envelope helpers in the error handler
- **WHEN** the prompt describes the global `errorHandler` middleware
- **THEN** it requires using `ERROR_CODE_BY_STATUS` to map `HttpError.statusCode` to `ErrorCode` and using `isErrorEnvelope` to detect already-shaped responses