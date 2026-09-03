## ADDED Requirements

### Requirement: Frontend prompt lists the exact named exports the frontend consumes from `@engclass/shared`
The frontend system prompt SHALL list every named export from `@engclass/shared` that the frontend imports, including `Annotation`, `SubmissionPayload`, `SubmissionStatus`, `isDraft`, `isImmutable`, `ErrorEnvelope`, `ErrorCode`, `isErrorEnvelope`, `assertAnnotation`, `assertSubmissionPayload`, `SharedValidationError`, `ANNOTATION_LIMITS`, `LoginRequest`, `UploadResponse`, and `TemplateSummary`. The prompt SHALL require that the frontend run `assertSubmissionPayload` on every payload before sending it to the backend and SHALL require that the frontend's HTTP client use `isErrorEnvelope` to discriminate backend responses.

#### Scenario: Prompt enumerates the named exports
- **WHEN** the prompt describes the import block in the "Modelos y contratos" section
- **THEN** it lists `Annotation`, `SubmissionPayload`, `SubmissionStatus`, `isDraft`, `isImmutable`, `ErrorEnvelope`, `ErrorCode`, `isErrorEnvelope`, `assertAnnotation`, `assertSubmissionPayload`, `SharedValidationError`, `ANNOTATION_LIMITS`, `LoginRequest`, `UploadResponse`, and `TemplateSummary`

#### Scenario: Prompt mandates client-side validation before submission
- **WHEN** the prompt describes the `<toolbar>` save flow
- **THEN** it requires calling `assertSubmissionPayload(payload)` before invoking `saveProgress`

#### Scenario: Prompt mandates envelope discrimination in the HTTP client
- **WHEN** the prompt describes the `PdfEditorService` error handling
- **THEN** it requires using `isErrorEnvelope(body)` before treating the body as an error