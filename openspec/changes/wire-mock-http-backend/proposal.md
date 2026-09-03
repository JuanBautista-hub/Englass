## Why

`scaffold-angular-frontend` shipped an opt-in `MockApiService` and a `mockApiProvider`, but the HTTP client never actually routes through it. As a result, every `http.get('/api/v1/...')` call hits the real backend (or fails when there is none), `authGuard.me()` returns `null`, and the router redirects to `/login`. The editor page is unreachable until a real backend exists. We need to wire the mock in front of `HttpClient` so the UI is exercisable end-to-end without a backend.

## What Changes

- Add `MockHttpBackend` (Angular `HttpBackend`) that, when registered as the lowest-level backend via `provideHttpClientTesting`-style wiring, intercepts every outgoing request and delegates to `MockApiService.handle()`.
- Refactor `MockApiService` so its `handle()` accepts a normalized `{ method, url, body?, headers? }` and returns an `Observable<ArrayBuffer | Blob | object>` that matches the Angular `HttpEvent` contract. The service still tracks submissions in memory and still enforces `X-CSRF-Token` on mutating calls.
- Bundle the demo PDF as a base64 string inside `mock-api.service.ts` (generated at scaffold-time) so the mock can serve `GET /api/v1/pdfs/templates/demo/file` synchronously, no `fetch()` round-trip required.
- In `mockApiProvider`, when `environment.useMockApi === true`, register the mock backend via a custom `HttpInterceptorFn` placed *first* in the interceptor chain (so it short-circuits everything below it). The CSRF interceptor keeps running for real backends.
- Add a `console.warn` at bootstrap when `useMockApi === true` to make the mock obvious during development.
- Update `apps/web/src/app/features/pdf-editor/pages/pdf-editor.page.ts` to no longer fetch `/assets/fixtures/demo.pdf` separately when the mock is on — it gets the bytes from the mock backend directly.
- Tests: add `mock-api.backend.spec.ts` covering GET/POST through the full HTTP pipeline (verifying that the mock backend actually intercepts), and a small smoke test that the editor page loads in mock mode.

## Capabilities

### New Capabilities

- `mock-http-backend`: requirements on how the mock HTTP backend intercepts requests, enforces CSRF, serves the bundled fixture, and is conditionally registered.

### Modified Capabilities

- `angular-frontend`: clarify that the mock backend is the lowest-level HttpBackend (not an interceptor), and that the CSRF interceptor still applies for non-mock flows.

## Impact

- `apps/web/src/app/core/services/mock-api.service.ts` — refactor + bundle the fixture as base64.
- `apps/web/src/app/core/interceptors/mock-backend.interceptor.ts` (new).
- `apps/web/src/app/core/providers/mock-api.provider.ts` — extend with the conditional mock backend registration.
- `apps/web/src/app/app.config.ts` — add the mock backend interceptor before `csrfInterceptor` when `useMockApi === true`.
- `apps/web/scripts/build-fixture.ts` — also write `apps/web/src/app/core/services/demo-pdf.b64.ts` as a generated module that re-exports the fixture as a base64 constant.
- `apps/web/src/app/features/pdf-editor/pages/pdf-editor.page.ts` — simplify the fixture load path.

No production runtime behavior changes: in production builds `useMockApi === false`, the mock backend is not registered, and HTTP goes through normally.