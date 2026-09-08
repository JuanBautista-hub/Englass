## ADDED Requirements

### Requirement: Backend prompt mandates single source of truth for domain constants
The backend system prompt SHALL require that every domain constant (`LEVEL_META`, `MASTERY_META`, `DAILY_GOAL_TARGET`, `LAST_RATINGS_LIMIT`, `STREAK_DAILY_GOAL`, etc.) live in a single file under `apps/api/src/`. The prompt SHALL require that such constants are exposed to clients via HTTP endpoints (`/cefr/levels`, `/mastery/labels`, dashboard payload, review response) and SHALL forbid redeclaring the same constant in the frontend.

#### Scenario: Prompt lists the constants
- **WHEN** the prompt describes "Reglas no negociables"
- **THEN** it lists each domain constant and the file where it lives
- **AND** it lists the endpoint that exposes the constant to clients

#### Scenario: Prompt forbids frontend redeclaration
- **WHEN** the prompt describes cross-cutting client behavior
- **THEN** it contains an explicit "no redeclares dominio en el cliente" rule
- **AND** it points to `/cefr/levels`, `/mastery/labels`, and the dashboard response as the source

### Requirement: Backend prompt mandates that the retention formula and session summary live server-side
The backend system prompt SHALL require that the formula for retention, the trim size of `lastRatings`, the length caps for `dueAt` history, and the structure of `StudySessionSummary` live in `apps/api/src/review/`. The frontend SHALL consume `StudySessionSummary` verbatim from `POST /review/sessions/end` and SHALL NOT recompute retention locally.

#### Scenario: Prompt identifies the SRS module as the source
- **WHEN** the prompt documents the SRS module
- **THEN** it lists `SrsService`, `LAST_RATINGS_LIMIT`, the retention formula, and `StudySessionSummary` as part of the same authoritative unit

#### Scenario: Prompt forbids client-side recomputation
- **WHEN** the prompt describes the study workflow
- **THEN** it states explicitly that retention and longest-interval are returned by the server
