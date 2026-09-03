## ADDED Requirements

### Requirement: Frontend prompt mandates Angular 17+ stack with shared types
The frontend system prompt SHALL require Angular 17+ with standalone components, Signals, and the new control flow (`@if`, `@for`, `@switch`), pdfjs-dist as the PDF engine, Tailwind CSS as the exclusive styling system, and a `packages/shared` workspace from which all cross-cutting models (including `Annotation`) are imported rather than redeclared.

#### Scenario: Prompt declares the stack and shared-types dependency
- **WHEN** an engineer reads the "Stack obligatorio" section of the frontend prompt
- **THEN** the section lists Angular 17+, pdfjs-dist, Tailwind, and references `packages/shared` as the source for `Annotation` and DTOs

#### Scenario: Prompt forbids redeclaring shared types
- **WHEN** the prompt instructs how to implement the `Annotation` model
- **THEN** it explicitly forbids local copies and requires `import { Annotation } from '@engclass/shared'`

### Requirement: Frontend prompt mandates user-space PDF coordinates
The frontend system prompt SHALL require that all annotation coordinates stored, transmitted, and rendered MUST be in PDF user-space (origin bottom-left, units = points), and SHALL describe the pdfjs-dist viewport conversion using the current `getViewport` API plus `convertToPdfPoint` / `convertToViewportPoint` (not any deprecated method).

#### Scenario: Prompt documents the round-trip
- **WHEN** the prompt describes the coordinate transformation
- **THEN** it shows both directions (screen → pdf and pdf → screen) and rounds to two decimal places before persistence

#### Scenario: Prompt forbids pixel-space persistence
- **WHEN** the prompt discusses persistence
- **THEN** it contains an explicit rule that coordinates MUST NEVER be saved in canvas pixel space

### Requirement: Frontend prompt mandates keyboard-first accessibility
The frontend system prompt SHALL require that every annotation interaction be operable by keyboard alone: open with `Enter`/`Space`, save with `Enter`, cancel with `Esc`, multi-line with `Shift+Enter`, edit with `F2`, delete with `Delete`/`Backspace`, navigate between annotations with `Tab`/`Shift+Tab`/`Arrow`. The annotation overlay SHALL use `role="region"` with an `aria-label`, and a live region SHALL announce save and error events.

#### Scenario: Prompt lists required key bindings
- **WHEN** the prompt describes `<annotation-input>` and rendered annotations
- **THEN** it enumerates every required key binding explicitly

#### Scenario: Prompt requires ARIA wiring
- **WHEN** the prompt describes the overlay structure
- **THEN** it requires `role="region"`, an `aria-label` per page, and an `aria-live="polite"` status region

### Requirement: Frontend prompt mandates progressive PDF rendering
The frontend system prompt SHALL require that only the visible page and its immediate neighbors be mounted at any time, that off-viewport pages be rendered via `requestIdleCallback`, and that a `ResizeObserver` recompute annotation positions on viewport changes.

#### Scenario: Prompt declares the mount policy
- **WHEN** the prompt describes the `<pdf-viewer>` rendering strategy
- **THEN** it requires visible + 1 neighbor each side as the mount window

#### Scenario: Prompt requires resize handling
- **WHEN** the prompt describes annotation positioning
- **THEN** it requires a `ResizeObserver` to trigger `pdfPointToScreen` recomputation

### Requirement: Frontend prompt mandates auto-save with debounce and flush
The frontend system prompt SHALL require an `effect()`-driven auto-save with `debounceTime(2000)` while editing, a 5-second flush on `beforeunload`, suppression while an annotation input is open, and a hard cap of 500 annotations per submission plus a 256 KB payload limit enforced client-side before submission.

#### Scenario: Prompt declares debounce and flush
- **WHEN** the prompt describes the auto-save behavior
- **THEN** it specifies the 2s debounce and 5s `beforeunload` flush

#### Scenario: Prompt declares hard caps
- **WHEN** the prompt describes submission payloads
- **THEN** it lists the maximum annotation count and the maximum payload size

### Requirement: Frontend prompt mandates httpOnly cookie auth with CSRF posture
The frontend system prompt SHALL require that the auth token be stored in an httpOnly `Secure` cookie set by the backend, that the frontend NEVER reads or writes the access token in JavaScript, and that mutating requests carry a CSRF token via a custom header (`X-CSRF-Token`) whose value is mirrored from a non-httpOnly cookie. The prompt SHALL explicitly forbid `localStorage` for auth tokens.

#### Scenario: Prompt forbids localStorage tokens
- **WHEN** the prompt describes token storage
- **THEN** it explicitly states that `localStorage` MUST NOT be used for the access token

#### Scenario: Prompt documents CSRF header
- **WHEN** the prompt describes the HTTP client
- **THEN** it requires the CSRF header on all non-GET requests

### Requirement: Frontend prompt mandates the shared error envelope
The frontend system prompt SHALL require that the frontend recognizes and renders the backend's shared error envelope `{ statusCode, message, code, details?, requestId }`, and that the user-facing error banner MUST surface the `requestId` so users can quote it when reporting issues.

#### Scenario: Prompt defines the error envelope shape
- **WHEN** the prompt describes the error UX
- **THEN** it lists the exact envelope fields the UI MUST consume

#### Scenario: Prompt requires requestId surfacing
- **WHEN** the prompt describes the error banner
- **THEN** it requires the `requestId` to be visible and copyable

### Requirement: Frontend prompt mandates quality bars
The frontend system prompt SHALL require `eslint` + `prettier` with zero warnings, Jest unit tests with ≥ 70% statement coverage for services and components, Conventional Commits, and a `npm run lint` / `npm run test` step that blocks the assistant from declaring a task complete.

#### Scenario: Prompt lists numeric coverage targets
- **WHEN** the prompt describes the tests section
- **THEN** it states the 70% statement coverage threshold explicitly

#### Scenario: Prompt forbids premature completion
- **WHEN** the prompt describes the delivery checklist
- **THEN** it requires lint and test commands to pass before declaring done

### Requirement: Frontend prompt reserves versioning and lifecycle hooks
The frontend system prompt SHALL describe how the frontend consumes `/api/v1/...` endpoints, how it displays template `version` and `deletedAt` indicators when present, and how it transitions submission UI from "editable draft" to "read-only submitted" based on the `status` returned by the backend.

#### Scenario: Prompt declares API version usage
- **WHEN** the prompt describes the HTTP base URL
- **THEN** it uses `/api/v1` and forbids unversioned paths

#### Scenario: Prompt describes status-driven UI modes
- **WHEN** the prompt describes the editor
- **THEN** it lists the editable-vs-read-only behavior keyed on submission `status`