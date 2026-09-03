## ADDED Requirements

### Requirement: Workspace exposes `@engclass/shared` as an ESM package
The shared-types workspace SHALL be installed as `@engclass/shared` and SHALL emit ESM only with declaration files. The package SHALL be private, tree-shakeable (`"sideEffects": false`), and SHALL declare zero runtime dependencies.

#### Scenario: Package resolves via the workspace protocol
- **WHEN** a downstream app adds `"@engclass/shared": "workspace:*"` to its `package.json`
- **THEN** pnpm links `packages/shared` into the app's `node_modules/@engclass/shared` and TypeScript resolves `import { Annotation } from '@engclass/shared'` against `packages/shared/dist/index.d.ts`

#### Scenario: Build produces declaration files
- **WHEN** `pnpm --filter @engclass/shared build` runs
- **THEN** `packages/shared/dist/` contains `index.js`, `index.d.ts`, and `*.d.ts.map` files for every public module

### Requirement: Annotation is exported with user-space coordinates and font defaults
The package SHALL export `Annotation` with the fields `id: string`, `pageIndex: number`, `x: number`, `y: number`, `text: string`, and `fontSize: number` (default `12`). Coordinates SHALL be documented as PDF user-space (origin bottom-left, units = points). The package SHALL also export `ANNOTATION_LIMITS` with `MAX_TEXT_LENGTH = 2000`, `MIN_FONT_SIZE = 6`, and `MAX_FONT_SIZE = 72`.

#### Scenario: Annotation type compiles
- **WHEN** a consumer writes `const a: Annotation = { id: 'x', pageIndex: 0, x: 1, y: 2, text: 'hi', fontSize: 12 }`
- **THEN** TypeScript accepts the value without errors

#### Scenario: ANNOTATION_LIMITS constants are exported and stable
- **WHEN** a consumer imports `ANNOTATION_LIMITS`
- **THEN** `MAX_TEXT_LENGTH`, `MIN_FONT_SIZE`, and `MAX_FONT_SIZE` are all defined as `number`

### Requirement: SubmissionStatus and SubmissionPayload are exported
The package SHALL export `SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'GRADED'` and the `SubmissionPayload` interface with `templateId: string`, `answers: Annotation[]`, and `status?: SubmissionStatus`. The package SHALL also export type guards `isDraft(status): boolean` and `isImmutable(status): boolean` where `isImmutable` returns `true` for `'SUBMITTED'` and `'GRADED'`.

#### Scenario: SubmissionStatus narrows correctly
- **WHEN** a consumer annotates `status: SubmissionStatus` and assigns the value `'DRAFT'`
- **THEN** TypeScript accepts it and `isDraft('DRAFT')` returns `true`

#### Scenario: isImmutable marks SUBMITTED and GRADED
- **WHEN** `isImmutable` is called with `'SUBMITTED'` or `'GRADED'`
- **THEN** it returns `true`; with `'DRAFT'` it returns `false`

### Requirement: Auth and PDF DTOs are exported
The package SHALL export `LoginRequest { email: string; password: string }`, `RefreshResponse { ok: true }` (placeholder for Fase 1; replaced by real shape when auth lands), `UploadResponse { id: string; title: string; fileUrl: string; version: number; createdAt: string }`, and `TemplateSummary { id: string; title: string; version: number; deletedAt: string | null; createdAt: string }`.

#### Scenario: DTOs compile and are importable
- **WHEN** a consumer imports `LoginRequest`, `RefreshResponse`, `UploadResponse`, and `TemplateSummary` from `@engclass/shared`
- **THEN** TypeScript accepts the imports and the type signatures match the documented shapes

### Requirement: ErrorEnvelope and ErrorCode are exported as the single shared error contract
The package SHALL export `ErrorEnvelope { statusCode: number; message: string; code: ErrorCode; details?: unknown; requestId: string }` and `ErrorCode = 'VALIDATION' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED' | 'INVALID_FILE' | 'INTERNAL'`. The package SHALL also export `ERROR_CODE_BY_STATUS: Record<number, ErrorCode>` for ad-hoc mapping and `isErrorEnvelope(value: unknown): value is ErrorEnvelope` for runtime detection.

#### Scenario: ErrorEnvelope shape is type-checked
- **WHEN** a consumer types a variable as `ErrorEnvelope`
- **THEN** missing `statusCode`, `message`, `code`, or `requestId` is a compile-time error

#### Scenario: isErrorEnvelope discriminates at runtime
- **WHEN** a consumer calls `isErrorEnvelope(unknownValue)`
- **THEN** TypeScript narrows `unknownValue` to `ErrorEnvelope` in the truthy branch

### Requirement: Runtime validators mirror backend sanitization rules
The package SHALL export `assertAnnotation(value: unknown): asserts value is Annotation` and `assertSubmissionPayload(value: unknown): asserts value is SubmissionPayload`. `assertAnnotation` SHALL strip control characters from `text` (preserving `\t`, `\n`, `\r`), reject `text` containing `\x00`, reject `text.length > ANNOTATION_LIMITS.MAX_TEXT_LENGTH`, reject `fontSize` outside `[MIN_FONT_SIZE, MAX_FONT_SIZE]`, reject `pageIndex < 0`, and reject non-finite `x` / `y`. Both validators SHALL throw `SharedValidationError` (also exported) carrying a `code: 'VALIDATION'` field and a `field` string.

#### Scenario: assertAnnotation accepts a valid value
- **WHEN** `assertAnnotation` is called with a well-formed object
- **THEN** it returns without throwing and TypeScript narrows the value to `Annotation`

#### Scenario: assertAnnotation rejects overlong text
- **WHEN** `assertAnnotation` is called with `text.length > 2000`
- **THEN** it throws `SharedValidationError` with `field: 'text'`

#### Scenario: assertAnnotation strips control characters
- **WHEN** `assertAnnotation` is called with `text` containing `\x01`
- **THEN** it throws `SharedValidationError` with `field: 'text'` and a message referencing "control character"

### Requirement: Package ships an exhaustive Jest test suite for every type and validator
The package SHALL include `validators/annotation.spec.ts`, `validators/submission.spec.ts`, and `error-envelope.spec.ts` covering valid cases, every rejection branch, and the round-trip property (a value that passes `assertAnnotation` then serializes/deserializes via JSON and still passes). Coverage SHALL be ≥ 90% statements.

#### Scenario: Test suite passes
- **WHEN** `pnpm --filter @engclass/shared test` runs
- **THEN** all specs pass with coverage ≥ 90% statements

#### Scenario: Test fixtures match backend sanitization rules
- **WHEN** the test suite asserts that text containing `\x00` is rejected
- **THEN** the same fixture is also referenced in the backend's supertest suite (separate change) to keep the rules in lockstep

### Requirement: Project layout and tooling conventions
The package SHALL live under `packages/shared/` with `src/index.ts` as the only public entry. `tsconfig.json` SHALL set `"composite": true`, `"declaration": true`, `"declarationMap": true`, `"strict": true`, `"target": "ES2022"`, and `"module": "ESNext"`. The package SHALL include a `README.md` that documents the public exports and the build/test commands. The monorepo root SHALL declare `pnpm-workspace.yaml` listing `apps/*` and `packages/*`.

#### Scenario: tsc -b succeeds
- **WHEN** `pnpm -r build` runs at the monorepo root
- **THEN** `packages/shared` builds without errors and produces `dist/`

#### Scenario: README documents public exports
- **WHEN** a new contributor reads `packages/shared/README.md`
- **THEN** the document lists every exported symbol and links to the corresponding source file