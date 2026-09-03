## ADDED Requirements

### Requirement: `apps/web` is a standalone-components Angular 17+ workspace
The application SHALL live at `apps/web/` and SHALL use Angular 17+ with standalone components, Signals, the new control flow (`@if`, `@for`, `@switch`), strict TypeScript, and the ESBuild application builder. The workspace SHALL consume `@engclass/shared` via the pnpm workspace link declared as `"@engclass/shared": "workspace:*"`.

#### Scenario: app builds with the ESBuild builder
- **WHEN** `pnpm --filter @engclass/web build` runs
- **THEN** Angular CLI produces `dist/apps/web/` without errors using the `@angular-devkit/build-angular:application` builder

#### Scenario: app imports types from `@engclass/shared`
- **WHEN** any file under `apps/web/src/app/` imports `Annotation`, `SubmissionPayload`, `ErrorEnvelope`, `isErrorEnvelope`, `assertSubmissionPayload`, `isDraft`, or `isImmutable`
- **THEN** the import resolves to `packages/shared/dist/index.d.ts` without any `paths` mapping in `tsconfig.json`

### Requirement: Project structure mirrors the prompt's mandatory layout
The folder layout SHALL match `front-prompt.md`: `core/{interceptors,guards,services}`, `features/pdf-editor/{components,services,pages,pdf-editor.routes.ts}`, plus `app.routes.ts` and `app.config.ts`. The `features/pdf-editor/services/` directory SHALL contain `pdf-editor.service.ts` and `pdf-renderer.service.ts`.

#### Scenario: required folders exist
- **WHEN** the assistant lists `apps/web/src/app/`
- **THEN** all mandatory subfolders exist and contain the expected files

#### Scenario: no shared types are redeclared
- **WHEN** the assistant grep's for `interface Annotation` or `interface SubmissionPayload`
- **THEN** no matches exist outside `packages/shared/src/`

### Requirement: `PdfRendererService` exposes user-space coordinate conversion
The service SHALL expose `screenToPdfPoint(canvas, screenX, screenY, pageIndex): { x: number; y: number }` and `pdfPointToScreen(canvas, pageIndex, pdfX, pdfY): { x: number; y: number }`. Both SHALL round to two decimals before returning. The service SHALL use `page.getViewport({ scale })`, `viewport.convertToPdfPoint(...)`, and `viewport.convertToViewportPoint(...)` — no deprecated pdfjs-dist API.

#### Scenario: screen → pdf round-trip preserves value within rounding tolerance
- **WHEN** the unit test calls `screenToPdfPoint(...)` followed by `pdfPointToScreen(...)` with a known viewport
- **THEN** the resulting `{ x, y }` is within 0.01 px of the input

#### Scenario: no deprecated pdfjs-dist API is referenced
- **WHEN** the assistant grep's for `convertToViewportRectangle`, `getPage` (without `getViewport`), or `outputScale`
- **THEN** no matches exist outside the test fixtures

### Requirement: `PdfEditorService` speaks only to `/api/v1` and validates payloads
The service SHALL provide `loadTemplate(templateId): Promise<ArrayBuffer>`, `saveProgress(payload: SubmissionPayload): Promise<void>`, and `downloadCompiled(payload: SubmissionPayload): Promise<Blob>`, all targeting `/api/v1/...`. Before calling `saveProgress` or `downloadCompiled`, the service SHALL invoke `assertSubmissionPayload(payload)`; if it throws, the service SHALL surface the `SharedValidationError.field` in the error banner without sending the request.

#### Scenario: saveProgress rejects invalid payloads locally
- **WHEN** the service receives a payload with `text` containing a null byte
- **THEN** it throws `SharedValidationError` and the HTTP client is never invoked

#### Scenario: saveProgress sends a valid payload
- **WHEN** the service receives a valid payload
- **THEN** it issues `POST /api/v1/pdfs/submissions` with the payload as JSON

#### Scenario: non-2xx responses are surfaced via `isErrorEnvelope`
- **WHEN** the backend returns a 4xx/5xx with an `ErrorEnvelope` body
- **THEN** the service sets `hasError({ message, requestId })` from the envelope; a non-envelope body falls back to a generic message but still sets `requestId` if the `X-Request-Id` header is present

### Requirement: `csrf.interceptor.ts` adds `X-CSRF-Token` on non-GET
The interceptor SHALL read the non-httpOnly `csrf_token` cookie via `document.cookie` and add the `X-CSRF-Token` header to POST/PUT/PATCH/DELETE requests. It SHALL NOT modify GET requests. It SHALL be registered via `withInterceptors([csrfInterceptor])` in `app.config.ts`.

#### Scenario: POST requests carry the CSRF header
- **WHEN** the interceptor processes a `POST /api/v1/pdfs/submissions`
- **THEN** the outgoing request has `X-CSRF-Token: <value>` matching the `csrf_token` cookie

#### Scenario: GET requests are untouched
- **WHEN** the interceptor processes a `GET /api/v1/pdfs/templates/abc/file`
- **THEN** no `X-CSRF-Token` header is added

### Requirement: Auth uses cookies only; no JS token storage
The frontend SHALL NOT read or write access tokens, refresh tokens, or CSRF tokens in `localStorage`, `sessionStorage`, or component variables. `AuthService.me()` SHALL call `GET /api/v1/auth/me` and signal the result. `authGuard` SHALL redirect to `/login` whenever `me()` returns non-2xx.

#### Scenario: authGuard redirects on 401
- **WHEN** `me()` returns 401
- **THEN** the router navigates to `/login`

#### Scenario: no JS code reads the access token
- **WHEN** the assistant grep's for `document.cookie` in non-interceptor files
- **THEN** no reads of `access_token` or `refresh_token` cookies exist; only the interceptor reads `csrf_token`

### Requirement: Signals-based editor state with autosave debounce, flush, and caps
`<pdf-editor-page>` SHALL expose `annotations`, `isLoading`, `hasError`, `lastSavedAt`, `activePage`, `isInputOpen` as signals. An `effect()` SHALL call `saveProgress` with `debounceTime(2000)` whenever `annotations()` changes, suppressed while `isInputOpen()`. A `beforeunload` listener SHALL flush up to 5 seconds. The page SHALL reject adding annotations beyond 500 or payloads whose `JSON.stringify(...).length` exceeds 256 * 1024 bytes.

#### Scenario: autosave debounces 2 seconds
- **WHEN** annotations change twice within 500ms
- **THEN** only one `saveProgress` call is dispatched after the debounce settles

#### Scenario: autosave is suppressed while the input is open
- **WHEN** `isInputOpen()` is `true`
- **THEN** no `saveProgress` is dispatched regardless of annotation changes

#### Scenario: 500-annotation cap blocks new annotations
- **WHEN** the user tries to add a 501st annotation
- **THEN** the annotation is not added and the UI surfaces a "Límite alcanzado" message

#### Scenario: 256 KB payload cap blocks save
- **WHEN** the user clicks "Guardar avance" with a payload that serializes to > 256 KB
- **THEN** `saveProgress` is not called and the UI surfaces a "Payload demasiado grande" error

### Requirement: `<pdf-viewer>` mounts only visible ± 1 page and uses `ResizeObserver` + `requestIdleCallback`
The viewer SHALL track `activePage` via `IntersectionObserver`. It SHALL mount only the pages whose indices are within `[activePage - 1, activePage + 1]`. Off-viewport pages SHALL be scheduled via `requestIdleCallback` (fallback `setTimeout(fn, 0)`). A `ResizeObserver` SHALL recompute every visible annotation's pixel position on container resize.

#### Scenario: only visible ± 1 pages are in the DOM
- **WHEN** the viewer renders and `activePage === 2`
- **THEN** only page canvases for indices `1`, `2`, and `3` are mounted

#### Scenario: container resize recomputes annotation positions
- **WHEN** the viewer's container width changes
- **THEN** every visible annotation's `top`/`left` style is updated within one animation frame

### Requirement: Keyboard-first a11y for every annotation interaction
The annotation input and rendered annotation boxes SHALL respond to the full keyboard map: `Enter` saves, `Esc` cancels, `Shift+Enter` inserts a newline, `F2` enters edit mode, `Delete`/`Backspace` removes, `Tab`/`Shift+Tab` navigates between annotations on the same page, `Arrow` keys do the same. A focus trap SHALL activate when `<annotation-input>` is open.

#### Scenario: Enter saves the input
- **WHEN** the user presses `Enter` (without Shift) inside the input
- **THEN** the annotation is saved and the input closes

#### Scenario: F2 enters edit mode on a focused annotation
- **WHEN** a rendered annotation is focused and the user presses `F2`
- **THEN** the annotation becomes editable

#### Scenario: focus is trapped while the input is open
- **WHEN** the input is open and `Tab` is pressed repeatedly
- **THEN** focus cycles only between the input and its close button

### Requirement: ARIA wiring on overlay, annotations, and live region
The page overlay SHALL carry `role="region"` and `aria-label="Página N"`. Each annotation box SHALL carry `aria-label="Anotación N en página M"`. A single `<div aria-live="polite" aria-atomic="true" class="sr-only">` SHALL exist in the viewer; the toolbar SHALL announce save success and error events through it.

#### Scenario: overlay has region role and label
- **WHEN** a `<page-canvas>` renders
- **THEN** the overlay div has `role="region"` and an `aria-label` matching `"Página <index+1>"`

#### Scenario: live region announces save success
- **WHEN** a save succeeds
- **THEN** the live region's text becomes "Guardado" within one frame

### Requirement: Toolbar surfaces error envelope and respects `RATE_LIMITED`
`<toolbar>` SHALL render an error banner when `hasError()` is non-null. The banner SHALL show `message`, `code`, and `requestId`, plus a "Copiar ID" button that writes `requestId` to the clipboard. When the latest envelope has `code === 'RATE_LIMITED'`, the "Guardar avance" button SHALL be disabled for the duration of the response's `Retry-After` header (in seconds).

#### Scenario: error banner shows the requestId
- **WHEN** the backend returns `code: 'VALIDATION', requestId: 'req-xyz'`
- **THEN** the banner text contains `req-xyz`

#### Scenario: clicking the copy button writes to clipboard
- **WHEN** the user clicks "Copiar ID"
- **THEN** `navigator.clipboard.writeText` is called with the `requestId`

#### Scenario: RATE_LIMITED disables Save for Retry-After seconds
- **WHEN** a 429 with `Retry-After: 30` is received
- **THEN** "Guardar avance" is disabled for ~30 seconds, then re-enabled

### Requirement: Status-driven read-only mode
The editor SHALL inspect `submission.status` and switch to a read-only mode when `status` is `SUBMITTED` or `GRADED`. In read-only mode: `<annotation-input>` does not open on click; rendered annotations display `<textarea readonly>` with no edit affordance; the toolbar hides "Guardar avance" and shows only "Descargar PDF".

#### Scenario: DRAFT allows editing
- **WHEN** the submission status is `DRAFT`
- **THEN** clicking a page opens `<annotation-input>` and "Guardar avance" is visible

#### Scenario: SUBMITTED locks editing
- **WHEN** the submission status is `SUBMITTED`
- **THEN** clicking a page does nothing, annotation textareas are `readonly`, and "Guardar avance" is hidden

### Requirement: Mock API fixture for offline development
The app SHALL ship a `MockApiService` registered in DI only when `environment.useMockApi === true`. The mock SHALL respond to `/api/v1/pdfs/templates/demo/file` with a bundled 1-page PDF fixture, persist annotations in memory for the session, and return a no-op for `saveProgress`. `apps/web/src/assets/fixtures/demo.pdf` SHALL be a 595×842 point PDF and SHALL be generated by `pnpm run fixtures:build` using `pdf-lib`.

#### Scenario: app boots with mock on
- **WHEN** `environment.useMockApi === true` and the user opens `/editor/demo`
- **THEN** the viewer loads the fixture PDF and accepts new annotations without contacting any backend

#### Scenario: app skips the mock in production
- **WHEN** `environment.useMockApi === false`
- **THEN** `MockApiService` is not provided and all calls go to `API_BASE_URL`

#### Scenario: fixture is reproducible
- **WHEN** `pnpm run fixtures:build` runs
- **THEN** `apps/web/src/assets/fixtures/demo.pdf` is overwritten with a byte-identical file (deterministic via pdf-lib options)

### Requirement: Quality bars enforced by package scripts
The package SHALL define scripts: `start` (`ng serve`), `build` (`ng build`), `test` (`jest --coverage`), `lint` (`eslint --max-warnings=0`), `typecheck` (`tsc -p tsconfig.app.json --noEmit`). Jest SHALL be configured with `coverageThreshold.global.statements = 70`. ESLint SHALL exit non-zero on any warning.

#### Scenario: lint passes with zero warnings
- **WHEN** `pnpm --filter @engclass/web lint` runs
- **THEN** the exit code is 0 and no warnings are reported

#### Scenario: coverage threshold blocks under-coverage
- **WHEN** `pnpm --filter @engclass/web test` runs and service/component coverage falls below 70% statements
- **THEN** Jest exits non-zero

#### Scenario: typecheck passes
- **WHEN** `pnpm --filter @engclass/web typecheck` runs
- **THEN** the exit code is 0

### Requirement: Routing with lazy-loaded feature module and auth guard
`app.routes.ts` SHALL have a default route that redirects to `/editor/demo` for Fase 1, plus a lazy-loaded child `pdf-editor.routes.ts` exporting `routes: [{ path: ':templateId', component: PdfEditorPage, canActivate: [authGuard] }]`. `authGuard` SHALL return a `UrlTree` to `/login` whenever `me()` is non-2xx.

#### Scenario: default route redirects to the editor
- **WHEN** the user navigates to `/`
- **THEN** the router redirects to `/editor/demo`

#### Scenario: authGuard blocks unauthenticated access
- **WHEN** `me()` returns 401
- **THEN** the route activation is cancelled and the URL becomes `/login`

### Requirement: Tailwind-only styles, no parallel CSS systems
The app SHALL use Tailwind CSS exclusively for styling. No `.module.css`, `.scss`, or component-scoped CSS files SHALL exist under `apps/web/src/app/`. Tailwind config SHALL include `preflight: true` and the project SHALL define `theme.extend` keys for the colors used by error banners and disabled states.

#### Scenario: no CSS modules exist
- **WHEN** the assistant grep's for `styles: [` in component decorators and `.module.scss` in the repo
- **THEN** no matches exist

#### Scenario: Tailwind config is loaded
- **WHEN** `pnpm --filter @engclass/web build` runs
- **THEN** the production bundle contains Tailwind's reset CSS

### Requirement: Tests cover renderer round-trip, CSRF, error envelope, and keyboard map
The package SHALL include at minimum: `pdf-renderer.service.spec.ts` (round-trip test), `csrf.interceptor.spec.ts` (header injection matrix), `pdf-editor.service.spec.ts` (envelope discrimination), `annotation-input.component.spec.ts` (Enter/Esc/Shift+Enter/F2/Delete/Tab), `toolbar.component.spec.ts` (requestId surfacing and copy button), `pdf-editor.page.spec.ts` (read-only mode toggle).

#### Scenario: every mandatory spec exists
- **WHEN** the assistant lists `apps/web/src/app/**/*.spec.ts`
- **THEN** at least the six files above are present

#### Scenario: keyboard map is exhaustively tested
- **WHEN** the assistant grep's for `keydown.enter`, `keydown.escape`, `keydown.shift.enter`, `keydown.f2`, `keydown.delete`, `keydown.tab` in `annotation-input.component.spec.ts`
- **THEN** all six handlers have at least one matching test