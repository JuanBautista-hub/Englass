## ADDED Requirements

### Requirement: Mastery labels endpoint
The system SHALL expose `GET /api/v1/mastery/labels` (authenticated) returning a JSON object that maps each mastery enum value to a display label and a Tailwind badge class string. The response MUST contain exactly three keys: `learning`, `reviewing`, `mastered`. Each value MUST contain `label` (human-readable English string) and `badgeClass` (Tailwind class string ready for Angular `[class]` binding).

#### Scenario: Default labels
- **WHEN** an authenticated user calls `GET /mastery/labels`
- **THEN** the response contains exactly `learning`, `reviewing`, `mastered`
- **AND** `learning.badgeClass` equals `'bg-slate-100 text-slate-700'`
- **AND** `reviewing.badgeClass` equals `'bg-amber-100 text-amber-800'`
- **AND** `mastered.badgeClass` equals `'bg-emerald-100 text-emerald-800'`

#### Scenario: Shape contract
- **WHEN** the endpoint is called
- **THEN** every key in the response has both `label: string` and `badgeClass: string` fields
- **AND** no extra keys are present

### Requirement: Single source of truth for mastery labels
The system SHALL derive mastery labels and badge classes from one constant in `labels.constants.ts`. The frontend MUST consume them via `GET /mastery/labels` and MUST NOT redeclare the mapping locally.

#### Scenario: Frontend reads from API
- **WHEN** a page renders a card with `mastery: 'mastered'`
- **THEN** the displayed label and Tailwind classes come from `MasteryLabelsService.get()`
- **AND** the components `StudyPage` and `LessonDetailPage` no longer define `masteryLabel()` / `masteryClass()` methods

#### Scenario: Adding a new mastery value
- **WHEN** the backend adds a 4th mastery value (e.g. `'expert'`)
- **THEN** it appears automatically in `GET /mastery/labels`
- **AND** the frontend renders it without code changes (the existing fallback is bypassed because the API now returns it)

### Requirement: Frontend fallback for offline / cold start
The frontend MUST keep a minimal in-memory fallback for both labels endpoints. While the HTTP request is in flight or fails, the components MUST render with the same strings and classes they use today so there is no UX regression.

#### Scenario: API not yet loaded
- **WHEN** a page mounts and `CefrService` / `MasteryLabelsService` have not completed their first fetch
- **THEN** the components render using the fallback maps (identical to the current hardcoded values)
- **AND** once the fetch resolves, the rendered output updates without a page reload

#### Scenario: API returns 500
- **WHEN** the backend is unreachable
- **THEN** the frontend keeps rendering with the fallback
- **AND** no user-visible error appears