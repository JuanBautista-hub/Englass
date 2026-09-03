## Context

The recent `improve-engclass-system-prompt` change rewrote both system prompts to mandate `import { Annotation, ... } from '@engclass/shared'` and to forbid redeclaring those types locally. That mandate is unenforced today — there is no `packages/shared/` package, no monorepo workspace file, and no TypeScript project references wiring. As a result, no follow-up change (Angular frontend, Express backend) can be scaffolded cleanly: each one would either re-declare the types (violating the prompts) or hand-write a placeholder workspace that drifts.

This change creates the foundation: a pnpm-based monorepo with a single shared package that exports the canonical types and lightweight runtime validators.

Stakeholders: the Engclass maintainer, and any AI/engineer consuming the system prompts.

## Goals / Non-Goals

**Goals:**
- Create the `packages/shared` workspace with a complete TypeScript build (declaration files, composite project) ready to be referenced from `apps/web` and `apps/api`.
- Establish the canonical shapes of `Annotation`, `SubmissionPayload`, DTOs, and `ErrorEnvelope` so they are referenced (not redefined) everywhere downstream.
- Provide runtime validators (`assertAnnotation`, `assertSubmissionPayload`) that mirror the backend sanitization rules, so frontend and backend stay in lockstep on what a valid annotation looks like.
- Set monorepo conventions (pnpm workspaces, TS project references, root scripts) that subsequent app changes can adopt without rework.

**Non-Goals:**
- Building or scaffolding the Angular frontend or the Express backend — those are separate follow-up changes.
- Adding runtime dependencies to `packages/shared`. Validators are hand-written; no `zod`, no `class-validator`, no `ajv`. If a heavy validator is needed later it will be added by a separate change.
- Publishing to npm or any private registry. The package is consumed via workspace links only.
- Replacing the existing root `tsconfig.json` if it exists. We add `tsconfig.base.json` for cross-cutting compiler options and reference it from each project.
- Polyfilling ESM into CJS consumers. Output is ESM (`"type": "module"`); Angular and Node targets both consume ESM natively.

## Decisions

### 1. pnpm workspaces over npm/yarn workspaces
We use pnpm because (a) it has the fastest, most disk-efficient node_modules layout, (b) its workspace protocol is strict about declaring cross-package dependencies, and (c) it integrates cleanly with `tsc -b` and TS project references via `node_modules/.pnpm` symlinks.

Alternatives considered:
- npm workspaces → rejected: hoisting behavior makes TypeScript project references fragile.
- Yarn 1 / Yarn berry → rejected: extra configuration friction without a payoff at this scale.
- Nx / Turborepo → rejected for now: overkill for two apps + one package. We can adopt later if build cache becomes a problem.

### 2. ESM only, no dual CJS/ESM output
`packages/shared` emits ESM (`"type": "module"`, `"module": "dist/index.js"`, `"types": "dist/index.d.ts"`). Both Angular 17+ and Node 20+ consume ESM natively, so dual output would be dead weight.

Alternatives considered:
- Dual ESM/CJS build with `tsup` → rejected: extra toolchain for no consumer benefit.

### 3. Hand-written validators, no schema library
`assertAnnotation` and friends are small pure functions that throw an `AnnotationError` carrying `code: 'VALIDATION'`. They mirror the backend rules verbatim so a Jest round-trip test on both sides can use the same fixtures.

Alternatives considered:
- zod → rejected for Fase 1: introduces a runtime dep, and the backend already uses zod in its own DTO layer. Reusing zod schemas across the boundary would couple backend choices into the frontend; keeping validators framework-agnostic is cheaper.
- io-ts / valibot → rejected: same dependency-coupling argument.

### 4. TypeScript project references + composite
`packages/shared/tsconfig.json` sets `"composite": true`, `"declaration": true`, `"declarationMap": true`. Root `tsconfig.base.json` defines shared compiler options (`strict`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler` for Angular, `node16` for backend — handled per-app).

Alternatives considered:
- Plain `tsc` without composite → rejected: lose incremental rebuild and `tsc -b` orchestration.

### 5. Package shape: flat src/ with named subfolders
```
packages/shared/
  src/
    annotation.ts
    dto/
      submission.ts
      auth.ts
      pdf.ts
    error-envelope.ts
    submission-status.ts
    validators/
      annotation.ts
      submission.ts
    index.ts
```
A single `index.ts` barrel keeps `import { Annotation, ErrorEnvelope } from '@engclass/shared'` ergonomic without re-exports from submodules polluting the public API.

Alternatives considered:
- Deep imports only (no barrel) → rejected: violates the prompt's "single import line" rule.
- Flatten everything into `index.ts` → rejected: file becomes unwieldy as the surface grows.

### 6. Version policy: start at 0.1.0, no semver guarantees
Until the package is consumed by both apps we treat it as `0.1.0`. Subsequent breaking-shape changes bump to `0.2.0`, etc. Pinning `"engclass": "workspace:*"` in app `package.json`s keeps pnpm in sync.

### 7. Distribution: workspace links only, no npm publish
`"private": true` is set so accidental `pnpm publish` fails. Consumers resolve via pnpm's symlinked `node_modules/@engclass/shared` → `packages/shared`.

## Risks / Trade-offs

- **Risk**: pinning the package name `@engclass/shared` now makes renaming costly later. → **Mitigation**: keep it as `@engclass/<app-or-domain>` for everything from day one; the rename cost is the same later.
- **Risk**: hand-written validators can drift from the backend's zod schemas. → **Mitigation**: a round-trip test in `packages/shared` exercises every validator with valid + invalid fixtures; the backend change that adds zod schemas will add a cross-package integration test that consumes the same fixtures.
- **Risk**: ESM-only output breaks any CJS consumer added later. → **Mitigation**: no CJS consumer exists today; if one is needed, add a `tsup`-based dual build in a separate proposal.
- **Risk**: TS project references require every consumer to also be a project (composite). → **Mitigation**: the Angular and backend scaffold changes will set up composite configs from the start; not a new problem.
- **Risk**: pnpm is a new tool requirement for contributors. → **Mitigation**: document the `pnpm` requirement in `README.md` and in the prompt files.

## Migration Plan

This change does not deploy any application runtime. Migration steps for downstream codebases:
1. Run `pnpm install` at the root. This links `packages/shared` into `node_modules/@engclass/shared`.
2. Run `pnpm -r build` to produce `packages/shared/dist/`.
3. Frontend/backend scaffold changes can then add `"@engclass/shared": "workspace:*"` to their `package.json` and `import` the types.

Rollback: delete `packages/shared/`, `pnpm-workspace.yaml`, `tsconfig.base.json`, and the root scripts added to `package.json`. Single git revert covers it.

## Open Questions

- Confirm whether to also include `SubmissionsResponse` and `TemplatesListResponse` DTOs in this change or defer to the backend scaffold. Default if silent: **defer** — keep this change minimal.
- Confirm whether `validators/` should live in a subpath export (`@engclass/shared/validators`) or be re-exported from the main entry. Default if silent: **re-export from main entry** so consumers don't need deep imports for the common case.