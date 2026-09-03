# Engclass

Educational PDF annotation system (Fase 1). pnpm + TypeScript monorepo.

## Repository layout

```
apps/
  web/                # @engclass/web — Angular 17+ frontend (lazy-loaded pdf-editor feature)
packages/
  shared/             # @engclass/shared — canonical types + runtime validators
  canvas-stub/        # Local stub for the `canvas` npm package on Windows CI
openspec/             # OpenSpec change workflow (specs, changes, archive)
front-prompt.md      # AI-assistant spec for the Angular module
backend-prompt.md    # AI-assistant spec for the Express + Prisma backend
```

## Tooling

- Node.js ≥ 20, pnpm ≥ 9 (pinned via `packageManager`).
- TypeScript strict mode (`tsconfig.base.json`).

Install once at the root:

```sh
pnpm install
```

Common scripts (run from the repo root):

```sh
pnpm -r build     # build every package and app
pnpm -r test      # run tests across packages and apps
pnpm -r lint      # lint across packages and apps
pnpm -r typecheck # type-check across packages and apps
```

Scoped to a single package/app:

```sh
pnpm --filter @engclass/shared build
pnpm --filter @engclass/web start
```

## `@engclass/shared`

The frontend and backend both consume `@engclass/shared` for cross-cutting types (`Annotation`, `SubmissionPayload`, `ErrorEnvelope`, etc.) and runtime validators (`assertAnnotation`, `assertSubmissionPayload`). Both prompts forbid redeclaring these types locally.

See [`packages/shared/README.md`](./packages/shared/README.md) for the full public surface.

## `@engclass/web`

Angular 17+ frontend implementing the pdf-editor feature described in `front-prompt.md`. Boots at `http://localhost:4200/`, redirects to `/editor/demo`, and (with the mock enabled by default) loads a bundled 1-page PDF fixture and persists annotations in memory.

See [`apps/web/README.md`](./apps/web/README.md) for installation, scripts, and the mock toggle.

## Source of truth for AI-assisted code generation

This repository uses two system prompts as the canonical specification for AI-assisted code generation. Any assistant generating or modifying code in this repo MUST follow them:

- [`front-prompt.md`](./front-prompt.md) — Angular 17+ frontend module for visualizing and annotating master PDFs.
- [`backend-prompt.md`](./backend-prompt.md) — Node.js + Express + Prisma backend serving `/api/v1/...` endpoints.

The prompts are normative: they define the stack, structure, contracts, accessibility, performance, observability, security, lifecycle, and quality bars. Do not invent alternatives without proposing a change via OpenSpec.

## Capabilities (OpenSpec)

The requirements on the two prompts (and on the shared package and the Angular app) are tracked as OpenSpec capabilities:

- [`frontend-system-prompt`](./openspec/specs/frontend-system-prompt/spec.md)
- [`backend-system-prompt`](./openspec/specs/backend-system-prompt/spec.md)
- [`shared-types-package`](./openspec/specs/shared-types-package/spec.md)
- [`angular-frontend`](./openspec/specs/angular-frontend/spec.md)

Each spec MUST be satisfied by the corresponding prompt or package.

## Active changes

See `openspec/changes/` for in-flight proposals. Use `/opsx-propose` to draft a new change, `/opsx-apply` to implement one, and `/opsx-archive` to finalize.