## Why

`front-prompt.md` and `openspec/specs/frontend-system-prompt/spec.md` describe the canonical Angular 17+ frontend for Engclass Fase 1, but no app code exists yet. `apps/` is empty and there is no runnable UI. We need to scaffold `apps/web` so that the prompt becomes concrete, executable code that can be visually inspected and unit-tested. The previous `scaffold-shared-types-package` change already shipped the `@engclass/shared` workspace that this change will consume.

## What Changes

- **New Angular workspace app**: `apps/web/` with Angular 17+, standalone components, Signals, new control flow, ESBuild application builder (faster than Webpack, default since Angular 17), strict mode, project references to `packages/shared`.
- **Tooling**: Tailwind CSS, Jest with `jest-preset-angular`, ESLint + Prettier (zero warnings), Conventional Commits.
- **Feature module** `pdf-editor` (lazy-loaded):
  - `<pdf-viewer>` (scrollable container with `ResizeObserver`, `requestIdleCallback`, progressive mount policy: visible ± 1 page).
  - `<page-canvas>` (canvas + overlay with `role="region"`).
  - `<annotation-input>` (floating textarea with Enter/Esc/Shift+Enter/F2/Delete/Tab/Arrow keyboard map, focus trap, auto-focus).
  - `<toolbar>` (Save, Download, last-saved indicator, error banner with `requestId` + Copy button, retry-after on `RATE_LIMITED`).
  - Live region (`aria-live="polite"`) for save/error announcements.
- **Services**:
  - `PdfEditorService` — HTTP under `/api/v1`, calls `assertSubmissionPayload` before sending, uses `isErrorEnvelope` on every non-2xx response.
  - `PdfRendererService` — wraps `pdfjs-dist`, exposes `screenToPdfPoint` / `pdfPointToScreen` using the current `getViewport` + `convertToPdfPoint` / `convertToViewportPoint` API.
  - `AuthService` — `me()` probe via `/api/v1/auth/me`; never reads/writes tokens in JS.
- **Cross-cutting**:
  - `csrf.interceptor.ts` — reads non-httpOnly `csrf_token` cookie, adds `X-CSRF-Token` header on non-GET.
  - `auth.guard.ts` — redirects to `/login` if `/api/v1/auth/me` returns non-2xx.
  - Signals for `annotations`, `isLoading`, `hasError`, `lastSavedAt`, `activePage`, `isInputOpen`; `effect()` with `debounceTime(2000)` for autosave, suppressed while input is open; `beforeunload` flush with 5s budget; 500-annotation and 256 KB payload caps.
- **No backend yet**: the app talks to `/api/v1` via `API_BASE_URL`. For Fase 1 visualization we ship a `MockApiService` (only enabled via `environment.useMockApi = true`) that returns a bundled 1-page PDF fixture so the UI can be visually exercised without the backend. The mock is wired only for `apps/web` and has zero impact on production behavior.
- **Routing**: `app.routes.ts` lazy-loads `pdf-editor.routes.ts`; the default route redirects to `/editor/<demoTemplateId>` for Fase 1 so the UI opens immediately.
- **Status-driven UI modes**: `isDraft` / `isImmutable` from `@engclass/shared` decide whether the editor is editable or read-only.

## Capabilities

### New Capabilities

- `angular-frontend`: requirements on the `apps/web` Angular app — its structure, signals, services, components, a11y, performance, CSRF posture, error envelope handling, autosave, and the mock-API fixture strategy.

### Modified Capabilities

- `frontend-system-prompt`: no requirement-level changes. The prompt is already normative; this change **implements** it. We do not edit the prompt in this change.

## Impact

- `apps/web/` (new directory, complete Angular workspace).
- Root `pnpm-workspace.yaml` already lists `apps/*` — no change needed.
- `apps/_smoke-test` (if ever reintroduced) would consume the same workspace link; no conflict.
- No runtime code in `packages/shared` or any backend is touched.
- Conventional Commits + OpenSpec: follow-up changes (e.g., `wire-real-auth`, `add-grading-ui`) will be proposed separately.