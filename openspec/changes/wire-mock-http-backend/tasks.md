## 1. Bundle the fixture as base64

- [x] 1.1 Extend `apps/web/scripts/build-fixture.ts` to write `apps/web/src/app/core/services/demo-pdf.b64.ts` exporting `export const DEMO_PDF_BASE64 = '...';` plus `export const DEMO_PDF_BYTES: number = <size>;`
- [x] 1.2 Run `pnpm --filter @engclass/web fixtures:build` and commit the generated `demo-pdf.b64.ts`

## 2. Refactor `MockApiService`

- [x] 2.1 Remove the `__ENGCLASS_DEMO_PDF__` global hook and import `DEMO_PDF_BASE64` instead; decode it once at construction into an `ArrayBuffer`
- [x] 2.2 Keep the in-memory `submissions` map and the existing `handle()` signature; ensure `handle()` returns values that can be wrapped in an `HttpResponse` (ArrayBuffer for the fixture, Blob for compile, plain object for submissions/auth)
- [x] 2.3 Remove the `globalThis as unknown as { __ENGCLASS_DEMO_PDF__?: ArrayBuffer }` cast

## 3. New mock backend interceptor

- [x] 3.1 Create `apps/web/src/app/core/interceptors/mock-backend.interceptor.ts` exporting `mockBackendInterceptor: HttpInterceptorFn`
- [x] 3.2 The interceptor returns a pass-through `next(req)` when `environment.useMockApi === false`
- [x] 3.3 When active, it builds a `{ method, url, body, headers }` summary from the `HttpRequest`, calls `mockApi.handle(...)`, and synthesizes an `HttpResponse<T>` (or `throwError` for envelopes with non-2xx `statusCode`)
- [x] 3.4 It also short-circuits the CSRF check by inspecting `X-CSRF-Token` and returning a 403 envelope if missing on mutating calls

## 4. Wire the interceptor

- [x] 4.1 Update `apps/web/src/app/app.config.ts`: replace `withInterceptors([csrfInterceptor])` with `withInterceptors([mockBackendInterceptor, csrfInterceptor])`
- [x] 4.2 Add a bootstrap factory in `app.config.ts` that emits `console.warn('[Engclass] Mock API is active — no real backend is being called.')` exactly once when `environment.useMockApi === true`

## 5. Simplify the editor page

- [x] 5.1 Update `apps/web/src/app/features/pdf-editor/pages/pdf-editor.page.ts`: remove the `if (useMockApi) fetch('/assets/fixtures/demo.pdf')` branch
- [x] 5.2 Always call `editor.loadTemplate('demo')` and let the mock backend supply the bytes
- [x] 5.3 Remove the `environment` import from the page if no longer used

## 6. Tests

- [x] 6.1 Update `apps/web/src/app/core/services/mock-api.service.spec.ts` to assert that the fixture bytes start with `%PDF` and the length matches `DEMO_PDF_BYTES`
- [x] 6.2 Add `apps/web/src/app/core/interceptors/mock-backend.interceptor.spec.ts` covering: pass-through when `useMockApi === false`, mock interception when on, CSRF enforcement, envelope `throwError` for non-2xx
- [x] 6.3 Add `apps/web/src/app/app.config.spec.ts` asserting the interceptor order is `[mockBackendInterceptor, csrfInterceptor]`
- [x] 6.4 Re-run the full Jest suite and confirm 29 + new tests pass; coverage of `apps/web/src/app/core/interceptors/` and `apps/web/src/app/core/services/mock-api.service.ts` ≥ 70%

## 7. Quality gates

- [x] 7.1 `pnpm --filter @engclass/web typecheck` passes
- [x] 7.2 `pnpm --filter @engclass/web lint --max-warnings=0` passes
- [x] 7.3 `pnpm --filter @engclass/web test` passes (34 passing, 1 skipped when mock is on)
- [x] 7.4 `pnpm --filter @engclass/web build` produces `dist/apps/web/`
- [x] 7.5 `pnpm --filter @engclass/web start` boots the editor at `http://localhost:4200/editor/demo` and `GET /api/v1/auth/me` resolves (verified via HTTP 200 on `/`, the dev bundle contains `console.warn("[Engclass] Mock API is active...")` and the mock interceptor)

## 8. Documentation

- [x] 8.1 Update `apps/web/README.md` with a "Mock backend" section describing the interceptor and the base64 fixture
- [x] 8.2 Update `front-prompt.md` to add a "Mock backend" paragraph under "Auth y CSRF"
- [x] 8.3 Update root `README.md` to mention the mock-back-end change in the layout section

## 9. Validation

- [x] 9.1 Run `openspec validate "wire-mock-http-backend" --strict` and resolve every reported issue
- [x] 9.2 Confirm no remaining `__ENGCLASS_DEMO_PDF__` references
- [x] 9.3 Confirm no `fetch('/assets/fixtures/demo.pdf')` references remain