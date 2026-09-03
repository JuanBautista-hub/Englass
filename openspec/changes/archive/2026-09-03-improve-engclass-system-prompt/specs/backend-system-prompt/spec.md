## ADDED Requirements

### Requirement: Backend prompt mandates Node 20+ Express stack with shared types
The backend system prompt SHALL require Node.js 20+, TypeScript strict mode, Express 4, Prisma with PostgreSQL, `pdf-lib` for compilation, `pino` for logging, `helmet`, `cors`, and `express-rate-limit`. The prompt SHALL require that all cross-cutting models (including `Annotation`) and DTOs are imported from `packages/shared`, never redeclared.

#### Scenario: Prompt lists the stack and shared-types dependency
- **WHEN** the prompt describes "Stack obligatorio"
- **THEN** it lists Node 20+, Express 4, Prisma+Postgres, pdf-lib, pino, and references `packages/shared`

#### Scenario: Prompt forbids redeclaring shared types
- **WHEN** the prompt discusses request/response shapes
- **THEN** it requires `import` from `@engclass/shared` and forbids inline redefinitions

### Requirement: Backend prompt mandates user-space PDF coordinates and pdf-lib usage
The backend system prompt SHALL require that all incoming annotation coordinates are interpreted in PDF user-space (origin bottom-left, units = points) and drawn verbatim with `pdf-lib` using `page.drawText`. The prompt SHALL require `StandardFonts.Helvetica` as the default font and `fontSize` defaulting to 12.

#### Scenario: Prompt describes the draw call
- **WHEN** the prompt documents `POST /api/v1/pdfs/compile`
- **THEN** it shows the exact `page.drawText` invocation with the user-space coordinates

#### Scenario: Prompt documents font fallback
- **WHEN** the prompt describes annotation rendering
- **THEN** it specifies `StandardFonts.Helvetica` and the default 12pt size

### Requirement: Backend prompt mandates cookie-based auth with refresh and CSRF
The backend system prompt SHALL require that access tokens be issued as httpOnly `Secure` `SameSite=Lax` cookies, that a separate `/api/v1/auth/refresh` endpoint rotates the access token using a rotating refresh token, and that mutating endpoints validate a double-submit CSRF token (header `X-CSRF-Token` mirrored from a non-httpOnly cookie). The prompt SHALL forbid returning access tokens in JSON response bodies and SHALL forbid `Authorization: Bearer` parsing from headers.

#### Scenario: Prompt describes cookie issuance
- **WHEN** the prompt documents `POST /api/v1/auth/login`
- **THEN** it specifies `Set-Cookie` with `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/`

#### Scenario: Prompt describes refresh rotation
- **WHEN** the prompt documents `POST /api/v1/auth/refresh`
- **THEN** it requires the refresh token to be rotated and the old one revoked

#### Scenario: Prompt forbids bearer parsing
- **WHEN** the prompt describes the JWT strategy
- **THEN** it explicitly forbids `passport-jwt`'s `fromAuthHeaderAsBearerToken` extractor

### Requirement: Backend prompt mandates rate limiting per user
The backend system prompt SHALL require `express-rate-limit` keyed primarily on the authenticated user id (when present) and secondarily on IP, at 100 req/min for general routes and 10 req/min for auth endpoints, returning the shared error envelope with `code: "RATE_LIMITED"`.

#### Scenario: Prompt defines rate limit key
- **WHEN** the prompt describes the rate-limit middleware
- **THEN** it requires `keyGenerator` to prefer `req.user.id` over IP

#### Scenario: Prompt defines error code on 429
- **WHEN** the prompt describes the rate-limit response
- **THEN** it specifies the shared envelope and the `RATE_LIMITED` code

### Requirement: Backend prompt mandates input sanitization for annotation text
The backend system prompt SHALL require that every annotation `text` value be sanitized: stripped of control characters, length-capped (e.g., 2000 chars), and rejected if it contains null bytes. The prompt SHALL also require zod validation of the full payload (template id, answers array, status).

#### Scenario: Prompt describes annotation text sanitization
- **WHEN** the prompt documents the submission DTO
- **THEN** it lists the control-character strip, the length cap, and the null-byte rejection

#### Scenario: Prompt describes zod schema
- **WHEN** the prompt documents request validation
- **THEN** it requires a zod schema per DTO and a `validate(schema)` middleware

### Requirement: Backend prompt mandates hardened file uploads
The backend system prompt SHALL require `multer` with a 20 MB limit, MIME filter as a first pass, and a mandatory magic-byte check (`%PDF-`) before persistence. Files failing any check MUST be rejected with the shared error envelope.

#### Scenario: Prompt lists the three checks
- **WHEN** the prompt documents `POST /api/v1/pdfs/upload`
- **THEN** it requires size, MIME, and magic-byte checks in that order

#### Scenario: Prompt forbids trusting client MIME
- **WHEN** the prompt describes multer configuration
- **THEN** it explicitly states that `mimetype` is untrusted and MUST be revalidated

### Requirement: Backend prompt mandates structured logging and correlation IDs
The backend system prompt SHALL require `pino` with a documented field schema (`requestId`, `userId`, `route`, `method`, `statusCode`, `latencyMs`), `pino-http` to generate or propagate `X-Request-Id`, and the error envelope to include `requestId`. The prompt SHALL forbid logging passwords, tokens, or raw authorization headers.

#### Scenario: Prompt documents log fields
- **WHEN** the prompt describes logging
- **THEN** it lists the required fields and their types

#### Scenario: Prompt forbids sensitive logging
- **WHEN** the prompt describes logging
- **THEN** it contains an explicit "never log" list including passwords, tokens, and authorization headers

### Requirement: Backend prompt mandates health and readiness probes
The backend system prompt SHALL require `GET /healthz` (process liveness, returns 200 if the event loop is responsive) and `GET /readyz` (DB ping + storage backend reachable, returns 200 only when both succeed). Both MUST be unauthenticated and MUST NOT appear in access logs.

#### Scenario: Prompt defines /healthz
- **WHEN** the prompt documents endpoints
- **THEN** it lists `/healthz` as unauthenticated liveness probe

#### Scenario: Prompt defines /readyz
- **WHEN** the prompt documents endpoints
- **THEN** it lists `/readyz` with explicit DB and storage checks

### Requirement: Backend prompt mandates API versioning
The backend system prompt SHALL require every route to be mounted under `/api/v1`, and SHALL forbid unversioned routes. The prompt SHALL also require that breaking changes trigger a new `/api/v2` mount while keeping the previous version operational.

#### Scenario: Prompt declares versioned base path
- **WHEN** the prompt describes the routes table
- **THEN** every route starts with `/api/v1/`

#### Scenario: Prompt describes breaking-change policy
- **WHEN** the prompt describes the architecture section
- **THEN** it states that breaking changes MUST ship a new versioned mount

### Requirement: Backend prompt mandates template lifecycle
The backend system prompt SHALL require soft-delete (`deletedAt`) and a `version` integer on `PdfTemplate`, with monotonic version bumps on re-publish. Hard delete MUST be reserved for GDPR-style erasure and SHALL be logged.

#### Scenario: Prompt requires soft-delete
- **WHEN** the prompt documents the Prisma schema
- **THEN** it includes `deletedAt DateTime?` on `PdfTemplate`

#### Scenario: Prompt requires version increment
- **WHEN** the prompt describes the re-publish endpoint
- **THEN** it requires `version` to increment and existing draft submissions to be cloned under the new version

### Requirement: Backend prompt mandates submission immutability after SUBMITTED
The backend system prompt SHALL require that once `status='SUBMITTED'`, the submission row is immutable except for the `grade` and `status` fields. Direct upserts on `answersJson` MUST be rejected for submitted rows.

#### Scenario: Prompt forbids mutation of submitted answers
- **WHEN** the prompt documents `POST /api/v1/pdfs/submissions`
- **THEN** it states that submitted submissions reject changes to `answersJson`

#### Scenario: Prompt reserves grading mutation
- **WHEN** the prompt documents the grading endpoint
- **THEN** it lists `grade` and `status` as the only mutable fields on a submitted row

### Requirement: Backend prompt reserves grading workflow surface
The backend system prompt SHALL reserve `POST /api/v1/pdfs/submissions/:id/grade` (professor-only), an optional `Rubric` Prisma model interface, and a `grade` field on `StudentSubmission`. UI implementation is out of scope, but the endpoint and schema MUST be declared so downstream changes can build on them.

#### Scenario: Prompt declares the grading endpoint
- **WHEN** the prompt documents the routes table
- **THEN** it includes `POST /api/v1/pdfs/submissions/:id/grade` with the professor role

#### Scenario: Prompt declares the grade field
- **WHEN** the prompt documents the Prisma schema
- **THEN** it includes a `grade Int?` (or equivalent documented type) on `StudentSubmission`

### Requirement: Backend prompt mandates the shared error envelope
The backend system prompt SHALL require every error response (including validation, rate limit, auth, and Prisma-mapped errors) to use the envelope `{ statusCode, message, code, details?, requestId }`. Prisma errors MUST be mapped: `P2002` → 409, `P2025` → 404, others → 500. The prompt SHALL also require that 5xx responses never leak stack traces in the `message`.

#### Scenario: Prompt defines the envelope
- **WHEN** the prompt describes the error handler
- **THEN** it lists the exact envelope fields and types

#### Scenario: Prompt defines Prisma mapping
- **WHEN** the prompt describes the error handler
- **THEN** it lists the P2002 → 409 and P2025 → 404 mappings

### Requirement: Backend prompt mandates quality bars
The backend system prompt SHALL require `eslint` + `prettier` with zero warnings, Jest unit + supertest integration tests with ≥ 80% statement coverage and ≥ 75% function coverage, Conventional Commits, and a `npm run lint` / `npm test` step that the assistant must run before declaring a task complete.

#### Scenario: Prompt lists numeric coverage targets
- **WHEN** the prompt describes the tests section
- **THEN** it states the 80%/75% coverage thresholds

#### Scenario: Prompt forbids premature completion
- **WHEN** the prompt describes the delivery checklist
- **THEN** it requires lint and test commands to pass before declaring done