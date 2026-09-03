## 1. Monorepo bootstrap

- [x] 1.1 Add `pnpm-workspace.yaml` at the project root listing `apps/*` and `packages/*`
- [x] 1.2 Add `tsconfig.base.json` at the project root with strict mode, `target: ES2022`, `module: ESNext`, shared compiler options
- [x] 1.3 Update root `package.json` to add `packageManager`, root scripts (`build`, `lint`, `test`), and declare pnpm-only via `"engines": { "node": ">=20", "pnpm": ">=9" }`
- [x] 1.4 Create the empty `apps/` directory with a `.gitkeep` placeholder so the workspace glob resolves

## 2. `packages/shared` package skeleton

- [x] 2.1 Create `packages/shared/package.json` with name `@engclass/shared`, version `0.1.0`, `"private": true`, `"type": "module"`, `"sideEffects": false`, and scripts `build` (`tsc -b`), `test` (`jest`), `lint` (`eslint src`)
- [x] 2.2 Create `packages/shared/tsconfig.json` extending `../../tsconfig.base.json` with `composite: true`, `declaration: true`, `declarationMap: true`, `outDir: dist`, `rootDir: src`
- [x] 2.3 Create `packages/shared/jest.config.ts` using `ts-jest` preset with ESM mode (`extensionsToTreatAsEsm: ['.ts']`)
- [x] 2.4 Create `packages/shared/.eslintrc.cjs` with `@typescript-eslint/recommended` and `prettier` rules, zero-warnings tolerance
- [x] 2.5 Create `packages/shared/.prettierrc` with project defaults
- [x] 2.6 Create `packages/shared/README.md` listing public exports and commands

## 3. Type definitions

- [x] 3.1 Create `packages/shared/src/annotation.ts` exporting `Annotation` interface and `ANNOTATION_LIMITS` constants
- [x] 3.2 Create `packages/shared/src/dto/submission.ts` exporting `SubmissionStatus`, `SubmissionPayload`, `isDraft`, `isImmutable`
- [x] 3.3 Create `packages/shared/src/dto/auth.ts` exporting `LoginRequest`, `RefreshResponse`
- [x] 3.4 Create `packages/shared/src/dto/pdf.ts` exporting `UploadResponse`, `TemplateSummary`
- [x] 3.5 Create `packages/shared/src/error-envelope.ts` exporting `ErrorCode`, `ErrorEnvelope`, `ERROR_CODE_BY_STATUS`, `isErrorEnvelope`
- [x] 3.6 Create `packages/shared/src/index.ts` re-exporting every public symbol

## 4. Runtime validators

- [x] 4.1 Create `packages/shared/src/validators/errors.ts` exporting `SharedValidationError` (carries `code: 'VALIDATION'`, `field: string`, `message: string`)
- [x] 4.2 Create `packages/shared/src/validators/annotation.ts` exporting `assertAnnotation(value: unknown): asserts value is Annotation` with the rules from the spec (control-char strip, length cap, null-byte rejection, font-size range, pageIndex ≥ 0, finite coords)
- [x] 4.3 Create `packages/shared/src/validators/submission.ts` exporting `assertSubmissionPayload(value: unknown): asserts value is SubmissionPayload` that validates `templateId` and every `answers[i]` via `assertAnnotation`
- [x] 4.4 Re-export the validators from `index.ts`

## 5. Tests

- [x] 5.1 Create `packages/shared/src/validators/annotation.spec.ts` with valid case + every rejection branch
- [x] 5.2 Create `packages/shared/src/validators/submission.spec.ts` with valid case + empty answers + oversized answers + invalid nested annotation
- [x] 5.3 Create `packages/shared/src/error-envelope.spec.ts` covering `isErrorEnvelope` true/false branches and `ERROR_CODE_BY_STATUS` completeness (every documented HTTP code maps to a known `ErrorCode`)
- [x] 5.4 Create `packages/shared/src/submission-status.spec.ts` covering `isDraft` and `isImmutable` truth table
- [x] 5.5 Configure Jest coverage threshold (`coverageThreshold: { statements: 90 }`)

## 6. Build verification and documentation

- [x] 6.1 Run `pnpm install` at the root and confirm `packages/shared` resolves via the workspace
- [x] 6.2 Run `pnpm --filter @engclass/shared build` and confirm `dist/index.js` and `dist/index.d.ts` are emitted
- [x] 6.3 Run `pnpm --filter @engclass/shared test` and confirm coverage ≥ 90% statements
- [x] 6.4 Run `pnpm --filter @engclass/shared lint` and confirm zero warnings
- [x] 6.5 Update root `README.md` to mention `packages/shared` and the `pnpm -r build` workflow
- [x] 6.6 Add a `docs/shared-types.md` (or extend root `README.md`) describing every exported symbol and a one-line example per validator

## 7. Validation

- [x] 7.1 Run `openspec validate "scaffold-shared-types-package" --strict` and resolve every reported issue
- [x] 7.2 Confirm that `apps/web` (when scaffolded later) can `import { Annotation } from '@engclass/shared'` without any TS path-mapping configuration beyond the workspace link