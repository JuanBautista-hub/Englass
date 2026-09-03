## Why

The current `front-prompt.md` and `backend-prompt.md` describe a working PDF annotation feature for Fase 1, but they leave critical production concerns unspecified: security hardening, observability, accessibility, performance, collaboration between frontend and backend (shared types), versioning of templates/submissions, grading workflow, and explicit quality bars. An AI assistant (or any engineer) producing code from these prompts will make inconsistent decisions and miss non-functional requirements. We need to tighten them so generated code is production-ready by construction, not by accident.

## What Changes

- **Add shared-types & API contract section**: introduce a `packages/shared` workspace (or equivalent) so the `Annotation` model and request/response DTOs are single-sourced across frontend and backend.
- **Harden security**: extend auth from `Bearer JWT only` to include refresh tokens, httpOnly cookie storage, CSRF strategy for cookie auth, rate-limit per user (not only IP), input sanitization for annotation text, hardened file-upload checks (magic bytes, not just MIME), and explicit secret-management rules.
- **Add observability**: structured logging fields, request correlation IDs end-to-end, health/readiness endpoints, and an explicit error-tracking hook point.
- **Add accessibility requirements**: keyboard-navigable annotation boxes, ARIA roles on overlays, focus management when opening/cancelling inputs, contrast targets for annotation markers.
- **Add performance budgets**: PDF rendering strategy (progressive page mount, virtualization for large PDFs), debounce/coalesce auto-save, max annotation count, payload size limits.
- **Add versioning & lifecycle**: API versioning prefix (`/api/v1`), soft-delete for templates, immutability of submissions after `SUBMITTED`, teacher re-publish flow that forks submissions.
- **Add grading workflow**: extend `SubmissionStatus` flow with rubric support (schema-only for Fase 1, interface-ready), endpoint surface, and the data model implication on `answersJson`.
- **Tighten quality bars**: test coverage threshold, lint/format requirements, naming conventions, error-handling patterns, structured commit/PR conventions.
- **Clarify ambiguous items in current prompts**: remove the deprecated pdfjs-dist `convertToPdfPoint` usage note, align font handling, and unify the error response shape between frontend and backend.

## Capabilities

### New Capabilities

- `frontend-system-prompt`: requirements that the Angular frontend system prompt must cover (stack, structure, signals, accessibility, performance, auth, shared types, error UX).
- `backend-system-prompt`: requirements that the Node/Express backend system prompt must cover (stack, structure, security, observability, lifecycle, grading hooks, shared types, error contracts).

### Modified Capabilities

_None — no existing capability specs are present in `openspec/specs/`._

## Impact

- `front-prompt.md` (root): rewritten with new sections and tightened wording.
- `backend-prompt.md` (root): rewritten with new sections and tightened wording.
- New `packages/shared/` (or `libs/shared-types/`) folder implied by the shared-types requirement — the prompts will instruct the assistant to scaffold it. No code yet; this change is **docs + scaffolds only**.
- No runtime code is produced by this change. Downstream changes that implement the requirements (e.g., "implement refresh-token auth", "implement grading endpoint") will be separate changes with their own proposals.