## ADDED Requirements

### Requirement: A mock HTTP interceptor is registered when `useMockApi` is true
The application SHALL register `mockBackendInterceptor` as the first entry in the `provideHttpClient(withInterceptors([...]))` chain. When `environment.useMockApi === true`, the interceptor SHALL short-circuit every matching request and return an `HttpResponse` event from `MockApiService.handle()` instead of forwarding the request to the network. When `useMockApi === false`, the interceptor SHALL be a pass-through.

#### Scenario: mock backend serves `GET /api/v1/auth/me`
- **WHEN** `environment.useMockApi === true` and any component calls `http.get('/api/v1/auth/me')`
- **THEN** the response resolves to `{ id: 'demo-user', email: 'demo@engclass.local', role: 'STUDENT' }` without any network call

#### Scenario: mock backend is a pass-through in production
- **WHEN** `environment.useMockApi === false`
- **THEN** requests reach the real `HttpClient` backend unchanged

### Requirement: The mock interceptor enforces CSRF on mutating calls
The mock interceptor SHALL only accept mutating requests (POST/PUT/PATCH/DELETE) when the incoming `X-CSRF-Token` header equals the value of the `csrf_token` cookie. Calls missing the header or with a mismatched value SHALL return an `ErrorEnvelope` with `code: 'FORBIDDEN'` and `statusCode: 403`.

#### Scenario: POST without `X-CSRF-Token` returns 403 envelope
- **WHEN** a POST to `/api/v1/pdfs/submissions` arrives without `X-CSRF-Token`
- **THEN** the mock returns a 403 envelope (`code: 'FORBIDDEN'`, `requestId: 'mock-...'`)

#### Scenario: POST with the cookie-mirrored `X-CSRF-Token` is accepted
- **WHEN** the request has `X-CSRF-Token` matching the `csrf_token` cookie value
- **THEN** the mock persists the submission and returns a 200 envelope

### Requirement: The mock serves the demo PDF synchronously
`MockApiService` SHALL bundle the demo PDF as a base64 string in `apps/web/src/app/core/services/demo-pdf.b64.ts`. `GET /api/v1/pdfs/templates/demo/file` SHALL decode that string and return the bytes as an `ArrayBuffer` synchronously inside the mock interceptor. The legacy `globalThis.__ENGCLASS_DEMO_PDF__` hook SHALL be removed.

#### Scenario: GET template returns an ArrayBuffer
- **WHEN** `http.get('/api/v1/pdfs/templates/demo/file', { responseType: 'arraybuffer' })` runs in mock mode
- **THEN** the returned `ArrayBuffer` length matches the fixture size and starts with `%PDF`

#### Scenario: legacy global hook is removed
- **WHEN** the assistant grep's the codebase for `__ENGCLASS_DEMO_PDF__`
- **THEN** no matches exist

### Requirement: A bootstrap warning is emitted when the mock is active
When `environment.useMockApi === true`, the application bootstrap factory SHALL emit exactly one `console.warn('[Engclass] Mock API is active — no real backend is being called.')`. When `useMockApi === false`, the warning is suppressed.

#### Scenario: warn appears on first in mock mode
- **WHEN** `bootstrapApplication` runs with `useMockApi === true`
- **THEN** `console.warn` is called exactly once with the documented message

#### Scenario: warn is suppressed in production
- **WHEN** `bootstrapApplication` runs with `useMockApi === false`
- **THEN** `console.warn` is not called

### Requirement: The page component no longer fetches the fixture separately
`PdfEditorPage` SHALL call `editor.loadTemplate('demo')` regardless of `environment.useMockApi`. The mock backend returns the fixture bytes; the real backend (when present) returns them via `/api/v1/pdfs/templates/:id/file`. The page SHALL NOT use `fetch('/assets/fixtures/demo.pdf')`.

#### Scenario: editor page loads with the mock
- **WHEN** the editor page mounts in mock mode
- **THEN** it requests `GET /api/v1/pdfs/templates/demo/file` via `HttpClient` and the mock interceptor returns the fixture

#### Scenario: editor page loads with the real backend
- **WHEN** the editor page mounts with `useMockApi === false` and the backend is reachable
- **THEN** the request reaches `/api/v1/pdfs/templates/demo/file` over the network and the page renders the PDF

### Requirement: Interceptor order is documented and tested
The application SHALL declare interceptors in the order `[mockBackendInterceptor, csrfInterceptor]`. A test SHALL assert this ordering by inspecting the resolved interceptors list returned by `withInterceptors(...)`.

#### Scenario: mock runs before csrf
- **WHEN** a mutating request is sent with `X-CSRF-Token` set
- **THEN** the mock intercepts it before the CSRF check happens; the request is still successful because the mock itself enforces the same CSRF rule

#### Scenario: csrf runs alone when the mock is off
- **WHEN** `useMockApi === false` and a mutating request is sent
- **THEN** `csrfInterceptor` adds the `X-CSRF-Token` header based on the `csrf_token` cookie