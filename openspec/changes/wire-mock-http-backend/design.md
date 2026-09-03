## Context

`wire-mock-http-backend` follows directly on the gap left by `scaffold-angular-frontend`: a `MockApiService` class exists, but `HttpClient` never reaches it, so the UI is unreachable in mock environments. This change closes that loop so `pnpm --filter @engclass/web start` with `environment.useMockApi === true` actually renders the editor with the bundled fixture and in-memory submissions, with no backend required.

Stakeholders: Engclass maintainer, AI/engineer running the app locally without the backend.

## Goals / Non-Goals

**Goals:**
- Make `HttpClient` calls actually return mock responses when `environment.useMockApi === true`.
- Keep production behavior identical to today (no mock wiring at all in prod).
- Bundle the demo PDF as base64 inside the JS bundle so the mock can serve it synchronously.
- Surface a `console.warn` at bootstrap when the mock is active.

**Non-Goals:**
- Replacing the mock with MSW or a real server. The mock stays inline.
- Persisting mock state across page reloads (in-memory only).
- Mocking every endpoint — only the ones `frontend` consumes today (`/auth/me`, `/pdfs/templates/:id/file`, `/pdfs/submissions`, `/pdfs/compile`).

## Decisions

### 1. Custom `HttpBackend` instead of an `HttpInterceptorFn`
We extend `HttpBackend` and bind it via `provideHttpClientTesting`-style override. The cleanest way in Angular 17 is to provide a custom backend via `{ provide: HttpBackend, useClass: ... }` *after* `provideHttpClient(withFetch(), withInterceptors([csrfInterceptor]))`. The order matters: `HttpBackend` is the lowest layer; interceptors wrap above it. We can't easily inject the mock backend *below* `csrfInterceptor` using only interceptors — interceptors always run before reaching the backend.

To get the ordering we want (mock first, then CSRF for non-mock), we use a different strategy: a single `HttpInterceptorFn` that wraps every request and short-circuits when the mock is active. Inside the interceptor we manually call `MockApiService.handle()` and return an `Observable<HttpEvent>` that Angular's HTTP machinery accepts.

This keeps the wiring inside the existing interceptor list (no custom `HttpBackend`), keeps the CSRF interceptor functional for non-mock flows, and lets the mock return its own `HttpResponse<T>` events.

Alternatives considered:
- `HttpBackend` override — rejected because injecting a backend below `csrfInterceptor` requires dropping `provideHttpClient(withFetch())`, which breaks the rest of the app.
- MSW (Mock Service Worker) — rejected as overkill for Fase 1.

### 2. Mock fixture as base64 inside the bundle
The current `mock-api.service.ts` looks for the fixture via `globalThis.__ENGCLASS_DEMO_PDF__`, which is never set. We extend `scripts/build-fixture.ts` to write `apps/web/src/app/core/services/demo-pdf.b64.ts` containing a default export of the base64 string. The mock service imports that constant and decodes it once at construction time. This makes the mock work offline and in unit tests alike.

Alternatives considered:
- A separate `.pdf` file under `assets/` — rejected because Angular's application builder only ships files declared in `angular.json`'s `assets` array, and we already do that. But fetching the asset round-trips through the dev server, which we want to avoid for the mock. Inline base64 is simpler.

### 3. The mock interceptor short-circuits with a `HttpResponse` event
`HttpInterceptorFn` returns `Observable<HttpEvent<T>>`. We synthesize an `HttpResponse({ body, status: 200, headers: ... })` from the mock service. For 4xx/5xx we throw via `throwError(...)` (which the `csrfInterceptor` and downstream services already know how to handle).

### 4. Single `MockHttpInterceptorFn` instead of a class
We export a function `mockBackendInterceptor: HttpInterceptorFn` from `core/interceptors/mock-backend.interceptor.ts`. It's added to the interceptor list *before* `csrfInterceptor` (interceptors run in declaration order) so the mock sees the request first. When `useMockApi === false`, the interceptor is a passthrough.

### 5. Bootstrap warning
`app.config.ts` registers a `bootstrap` factory that, when `useMockApi === true`, emits `console.warn('[Engclass] Mock API is active — no real backend is being called.')`. This is intentional developer-visible noise.

### 6. Page component simplification
The page component currently does `if (useMockApi) fetch('/assets/fixtures/demo.pdf') else editor.loadTemplate(id)`. After this change, the page calls `editor.loadTemplate('demo')` regardless of mock state — the mock backend handles it.

## Risks / Trade-offs

- **Risk**: the mock base64 fixture bloats the bundle. → **Mitigation**: a 1 KB PDF stays under 2 KB after base64 (~3 KB), negligible vs. the rest of the bundle.
- **Risk**: production builds accidentally ship the mock. → **Mitigation**: `environment.production.ts` already sets `useMockApi: false`; the interceptor is a passthrough in that mode; the `console.warn` is silenced.
- **Risk**: interceptors in Angular 17 run in declaration order — if someone reorders the list, mock semantics change. → **Mitigation**: the change tasks explicitly add the mock interceptor before `csrfInterceptor`, and a test asserts that ordering.
- **Risk**: in-flight production code that depends on the old `__ENGCLASS_DEMO_PDF__` global. → **Mitigation**: nothing in the codebase references that global; it was always intended as a developer hook, not a contract.

## Migration Plan

1. Apply the four file changes described in the proposal.
2. `pnpm install` (no new deps).
3. `pnpm --filter @engclass/web fixtures:build` regenerates the base64 constant.
4. `pnpm --filter @engclass/web start` boots the editor with the mock active; the browser console shows the warning.
5. To verify the no-op behavior in production, run `pnpm --filter @engclass/web build --configuration production` and inspect the output: no mock module is referenced.

Rollback: revert the four files; nothing is added that depends on persisted state.

## Open Questions

- Confirm whether to keep the legacy `__ENGCLASS_DEMO_PDF__` global hook for ad-hoc Playwright/Cypress tests. Default if silent: **remove it** — the base64 module is the canonical source.
- Confirm whether to also mock `/api/v1/auth/login` and `/api/v1/auth/refresh` for a future "real-auth" change. Default if silent: **defer** — they are unused today.