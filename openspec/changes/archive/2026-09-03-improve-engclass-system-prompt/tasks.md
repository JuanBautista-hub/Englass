## 1. Project-level setup

- [x] 1.1 Create `openspec/specs/frontend-system-prompt/spec.md` baseline copy from this change so the spec survives archive
- [x] 1.2 Create `openspec/specs/backend-system-prompt/spec.md` baseline copy from this change so the spec survives archive
- [x] 1.3 Add a short `README.md` at the project root pointing to `front-prompt.md`, `backend-prompt.md`, and the new `openspec/specs/` capabilities

## 2. Rewrite `front-prompt.md`

- [x] 2.1 Replace the "Stack obligatorio" section to add the `packages/shared` reference for `Annotation` and DTOs
- [x] 2.2 Update the coordinate-transformation snippet to use the current pdfjs-dist `getViewport` + `convertToPdfPoint` / `convertToViewportPoint` API and remove any deprecated calls
- [x] 2.3 Add an "Accesibilidad" section enumerating every required key binding (`Enter`, `Esc`, `Shift+Enter`, `F2`, `Delete`, `Tab`, arrows) and ARIA wiring (`role="region"`, `aria-label`, `aria-live="polite"`)
- [x] 2.4 Add a "Rendimiento" section mandating visible + 1 neighbor page mount, `requestIdleCallback` for off-viewport render, and `ResizeObserver` for annotation relayout
- [x] 2.5 Update the auto-save section to specify `debounceTime(2000)`, a 5s `beforeunload` flush, suppression while input is open, and the 500-annotation / 256 KB payload caps
- [x] 2.6 Replace the "Auth" section with httpOnly `Secure` cookie storage, the CSRF header `X-CSRF-Token` requirement, and an explicit "no localStorage for tokens" line
- [x] 2.7 Add an "Errores" section that documents the shared envelope `{ statusCode, message, code, details?, requestId }` and requires surfacing the `requestId` in the error banner
- [x] 2.8 Add a "Versionado y lifecycle" section describing API base `/api/v1`, template `version` / `deletedAt` display, and the editable-vs-read-only modes keyed on submission `status`
- [x] 2.9 Update the "Tests" section to declare the ≥ 70% statement coverage threshold for services and components
- [x] 2.10 Update the "Entrega" checklist to require `npm run lint` and `npm run test` to pass before declaring done, and Conventional Commits

## 3. Rewrite `backend-prompt.md`

- [x] 3.1 Replace the "Stack obligatorio" section to add the `packages/shared` reference for DTOs
- [x] 3.2 Add an "Auth" section with httpOnly `Secure` `SameSite=Lax` cookies, `/api/v1/auth/refresh` rotation, double-submit CSRF via `X-CSRF-Token`, and an explicit "no bearer parsing" rule
- [x] 3.3 Add a "Rate limiting" section requiring per-user primary keying (100 req/min general, 10 req/min auth) and the `RATE_LIMITED` error code
- [x] 3.4 Add an "Input sanitization" subsection to the DTO docs requiring control-character strip, length cap (2000), null-byte rejection, and zod validation per DTO
- [x] 3.5 Update the "Upload" docs to require size + MIME + magic-byte (`%PDF-`) checks in that order, and the explicit "MIME untrusted" note
- [x] 3.6 Add a "Logging" section documenting the required pino fields (`requestId`, `userId`, `route`, `method`, `statusCode`, `latencyMs`), `X-Request-Id` propagation, and the "never log" list (passwords, tokens, auth headers)
- [x] 3.7 Add "Health" endpoints `/healthz` (liveness) and `/readyz` (DB + storage) with the unauthenticated, no-access-log rules
- [x] 3.8 Update the routes table to mount every route under `/api/v1/...` and add a "breaking changes" rule requiring a new versioned mount
- [x] 3.9 Update the Prisma schema section to add `deletedAt DateTime?` and `version Int` on `PdfTemplate`, plus `grade Int?` on `StudentSubmission` (grading reserved)
- [x] 3.10 Add a "Submission immutability" rule that rejects `answersJson` mutation once `status='SUBMITTED'`, and only allows `grade` + `status` mutations
- [x] 3.11 Add a "Grading" reserved endpoint `POST /api/v1/pdfs/submissions/:id/grade` (professor-only) and document the optional `Rubric` model interface
- [x] 3.12 Replace the "Errores" section with the shared envelope `{ statusCode, message, code, details?, requestId }`, Prisma mappings (`P2002 → 409`, `P2025 → 404`), and the "no stack traces in 5xx message" rule
- [x] 3.13 Update the "Tests" section to declare ≥ 80% statement / ≥ 75% function coverage
- [x] 3.14 Update the "Entrega" checklist to require `npm run lint` and `npm test` to pass before declaring done, and Conventional Commits

## 4. Cross-prompt consistency

- [x] 4.1 Verify both prompts agree on the `Annotation` shape (import from `@engclass/shared`, not redefined)
- [x] 4.2 Verify both prompts agree on the error envelope fields and on the `requestId` propagation direction (backend → `X-Request-Id` response header → frontend banner)
- [x] 4.3 Verify both prompts agree on the API base path (`/api/v1`) and forbid unversioned paths
- [x] 4.4 Verify both prompts use the same `StandardFonts.Helvetica` / 12pt default for annotation rendering

## 5. Validation

- [x] 5.1 Run `openspec validate "improve-engclass-system-prompt" --strict` and resolve every reported issue
- [x] 5.2 Manually read both rewritten prompts end-to-end and confirm every requirement in `specs/frontend-system-prompt/spec.md` and `specs/backend-system-prompt/spec.md` is satisfied by some prompt section
- [x] 5.3 Spot-check that no prompt section references a deprecated pdfjs-dist API or instructs `localStorage` token storage