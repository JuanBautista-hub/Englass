## Context

`front-prompt.md` and `backend-prompt.md` are the single source of truth for AI-generated (and human-authored) code in the Engclass Fase 1 PDF annotation feature. They cover the happy path (template upload → student annotation → compile) but stop short of the non-functional and lifecycle concerns that decide whether the system holds up in production: security hardening, observability, accessibility, performance under large PDFs, shared type contracts, API versioning, template/submission lifecycle, and grading hooks.

This change rewrites both prompts so that the requirements are explicit, consistent, and testable. It is a **docs-only change** that produces no runtime code. Downstream implementation changes (refresh tokens, grading endpoint, shared-types scaffold, etc.) will be proposed separately once the prompts are agreed.

Stakeholders: the Engclass maintainer (the user), and any AI/engineer consuming these prompts.

## Goals / Non-Goals

**Goals:**
- Define what the front and backend prompts MUST cover so generated code is production-ready by construction.
- Eliminate ambiguity and contradictions in the current prompts (e.g., pdfjs-dist deprecated API, annotation text font handling, error shape divergence).
- Introduce a shared-types contract so `Annotation`, DTOs, and error shapes are single-sourced.
- Set explicit quality bars (coverage, lint, naming) the prompt enforces.
- Make security, a11y, performance, and observability first-class sections, not afterthoughts.

**Non-Goals:**
- Writing or refactoring runtime application code.
- Defining new product features (grading rubric UI, collaboration, real-time) — only the interfaces/hooks the prompt must reserve for them.
- Replacing the chosen stack (Angular 17+, pdfjs-dist, Express 4, Prisma+Postgres, pdf-lib) — the change is about how the prompts describe this stack, not swapping it.
- Generating English-translated UI strings or full i18n catalogs.
- Multi-tenant data isolation beyond role-based access.

## Decisions

### 1. Two prompt files stay separated, but reference a shared contract
The front and backend prompts have distinct audiences, so they remain two files. A new section in each references a `shared/contracts.md` (or `packages/shared/`) for the canonical `Annotation` shape, DTOs, and error envelope. The prompts instruct the assistant to import types from the shared package, not redeclare them.

Alternatives considered:
- Single mega-prompt → rejected: harder to maintain, mixes concerns.
- Code-only `packages/shared` without a contracts doc → rejected: still leaves room for divergence.

### 2. Security model: cookie-based auth with refresh + CSRF
Move from `Authorization: Bearer` in `localStorage` to httpOnly `Secure` cookies for the access token, paired with a rotating refresh token (separate cookie or body), and a CSRF token strategy (double-submit cookie or SameSite=Lax + custom header). Rate-limit becomes per-user primary, per-IP secondary.

Alternatives considered:
- Keep bearer tokens → rejected: leaves the system vulnerable to XSS exfiltration of `localStorage`.
- Pure httpOnly access token, no refresh → rejected: forces re-login on every access-token expiry, bad UX.

### 3. Observability: structured logging + correlation IDs + health probes
The backend prompt requires `pino` with a fixed field schema (`requestId`, `userId`, `route`, `latencyMs`, `statusCode`), `pino-http` propagates `X-Request-Id` end-to-end, and the frontend echoes `X-Request-Id` in errors. New endpoints: `/healthz` (liveness) and `/readyz` (DB + storage readiness).

Alternatives considered:
- Winston → rejected: pino is faster and the prompt already uses it.

### 4. Performance: progressive render + virtualization
Frontend prompt mandates mounting only the visible pages (+1 neighbor each side), renders off-viewport pages on `requestIdleCallback`, and uses a `ResizeObserver` to re-layout annotations. Auto-save coalesces via `debounceTime(2000)` plus a 5s flush on `beforeunload`. Hard cap on annotations per submission (e.g., 500) and payload size (e.g., 256 KB).

Alternatives considered:
- Render all pages eagerly → rejected: OOM on 100-page PDFs.

### 5. Accessibility: keyboard-first
Every annotation interaction must work without a mouse. Open with `Enter`/`Space`, edit with `F2`, delete with `Delete`/`Backspace`, navigate between annotations with `Tab`/`Shift+Tab`/`Arrow` keys, escape cancels. Overlay uses `role="region"` with `aria-label`, and live region announces save/error events.

Alternatives considered:
- Mouse-only annotations → rejected: violates WCAG 2.1 AA.

### 6. Lifecycle: versioning + soft-delete + submission immutability
API moves to `/api/v1/...`. Templates use soft-delete (`deletedAt`) and a `version` integer. Submissions flip to immutable once `status='SUBMITTED'`. Re-publishing a template bumps `version` and forks existing drafts into new submission rows; already-submitted rows stay linked to the version they were submitted against.

Alternatives considered:
- Hard delete → rejected: breaks submission history.
- Mutable submitted submissions → rejected: enables grade-tampering.

### 7. Grading: schema-ready, endpoint-ready, UI deferred
Backend prompt reserves a `Rubric` model in Prisma (optional in Fase 1, but the prompt declares the interface), a `grade` field on `StudentSubmission`, and `POST /api/v1/pdfs/submissions/:id/grade` (professor-only). No UI is built — that is a separate change.

Alternatives considered:
- Skip grading entirely → rejected: `GRADED` status already exists in the current schema and is unused.

### 8. Quality bars: explicit numeric thresholds
Prompts require: lint clean (`eslint` + `prettier`), backend test coverage ≥ 80% statements / 75% functions, frontend ≥ 70% statements for services and components. Naming follows the existing Angular and NestJS-style conventions. Commits follow Conventional Commits.

Alternatives considered:
- Soft "high test coverage" wording → rejected: not enforceable, not testable.

## Risks / Trade-offs

- **Risk**: rewriting prompts could break in-flight AI-generated code if any is mid-generation. → **Mitigation**: this change is applied to prompts only; existing generated code in repos is unaffected, and downstream changes are gated by separate proposals.
- **Risk**: shifting from bearer tokens to cookie auth is a breaking contract change for any already-running frontend. → **Mitigation**: documented in the prompts as a Fase 1 → Fase 2 migration; runtime migration is a separate change.
- **Risk**: shared-types package adds a build step (tsconfig path mapping or workspace). → **Mitigation**: keep the package zero-dep and tree-shakeable; use TS project references.
- **Risk**: stricter a11y/performance requirements may force more code, slowing AI generation. → **Mitigation**: prompts include concrete snippets for the hard parts (focus trap, `IntersectionObserver` mount) so generation time stays bounded.
- **Risk**: lifecycle rules (submission immutability) conflict with "autosave draft". → **Mitigation**: immutability only applies once `status='SUBMITTED'`; drafts remain mutable. The prompt states this explicitly.

## Migration Plan

This change does not deploy runtime code. Migration is purely editorial:
1. Apply the rewrites to `front-prompt.md` and `backend-prompt.md`.
2. Add a short `README.md` at the project root pointing to the two prompts as the source of truth for AI-assisted generation.
3. Archive this change.
4. Subsequent changes (`add-refresh-token-auth`, `add-grading-endpoint`, `add-shared-types-package`, `add-soft-delete-templates`) will be proposed and implemented independently.

Rollback: revert the two `.md` files and the README — git revert of this single commit.

## Open Questions

- Confirm with the user whether the shared-types artifact should live as `packages/shared/` (monorepo) or `libs/shared-types/` (single-project path mapping). Default if silent: **monorepo with pnpm workspaces**, because it scales.
- Confirm whether grading must be in Fase 1 or only interface-reserved. Default if silent: **interface-only**, UI deferred.
- Confirm whether API versioning (`/api/v1`) is required now or only when the first breaking change lands. Default if silent: **introduce now** — cheaper than retrofitting.