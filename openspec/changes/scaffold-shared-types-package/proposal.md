## Why

Both `front-prompt.md` and `backend-prompt.md` (just hardened in `improve-engclass-system-prompt`) import cross-cutting types — `Annotation`, `SubmissionPayload`, DTOs, the shared error envelope, `SubmissionStatus` — from a `@engclass/shared` workspace, and explicitly forbid redeclaring them locally. That workspace does not yet exist, so neither the Angular frontend nor the Node/Express backend can be scaffolded without first creating it. We need to scaffold `packages/shared` (workspace, package config, TypeScript project references, and the canonical types) so the rest of the stack has a single source of truth.

## What Changes

- **Monorepo bootstrap**: introduce `pnpm-workspace.yaml` at the project root listing `apps/*` and `packages/*`, and a top-level `tsconfig.base.json` with project reference conventions.
- **New workspace package**: `packages/shared/` with `package.json` (`@engclass/shared`, `"sideEffects": false`, zero runtime deps), `tsconfig.json` (declaration emit, composite, strict), `README.md`.
- **Canonical types in `packages/shared/src/`**:
  - `annotation.ts` — `Annotation` interface with user-space coordinates, default `fontSize: 12`.
  - `dto/submission.ts` — `SubmissionPayload`, `SubmissionStatus` (`DRAFT | SUBMITTED | GRADED`).
  - `dto/auth.ts` — `LoginRequest`, `RefreshResponse`.
  - `dto/pdf.ts` — `UploadResponse`, `TemplateSummary`, `TemplateVersion`.
  - `error-envelope.ts` — `ErrorEnvelope` (`statusCode`, `message`, `code`, `details?`, `requestId`) and the canonical `ErrorCode` union.
  - `submission-status.ts` — re-export of the union plus type guards (`isDraft`, `isImmutable`, etc.).
  - `index.ts` — barrel re-exporting every public symbol.
- **Runtime validators** (lightweight, no runtime deps): `validators/annotation.ts` exporting `assertAnnotation(a): void` that enforces length caps and strips control characters (mirrors the backend sanitization rules so frontend and backend stay aligned at compile-time via a shared test fixture).
- **Build tooling**: `tsc -b packages/shared` declared as the package's `build` script; ESM output (`"type": "module"`); declaration files emitted to `dist/`.
- **README at project root** updated to mention `pnpm -r build` and that `packages/shared` is the first package in the workspace.
- **No app code yet**: this change is purely the shared-types foundation. The Angular and Express apps will be scaffolded in follow-up changes that consume `@engclass/shared`.

## Capabilities

### New Capabilities

- `shared-types-package`: requirements on the `packages/shared` workspace — its build, exports, validators, and the canonical shape of every shared type (annotations, DTOs, error envelope, submission status).

### Modified Capabilities

- `frontend-system-prompt`: the requirement that types are "imported from `@engclass/shared`, not redeclared" becomes concrete once the package exists; we update the requirement to also list the exact named exports the frontend must consume.
- `backend-system-prompt`: same as above for the backend side.

## Impact

- `package.json` (root): add workspace root metadata, `packageManager` field pinned to a pnpm version, root scripts (`build`, `lint`, `test`).
- `pnpm-workspace.yaml` (new).
- `tsconfig.base.json` (new).
- `packages/shared/` (new directory with the full package contents).
- `README.md` (updated).
- No runtime applications are added in this change.