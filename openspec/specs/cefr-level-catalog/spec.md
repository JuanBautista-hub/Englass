## ADDED Requirements

### Requirement: CEFR levels endpoint
The system SHALL expose `GET /api/v1/cefr/levels` (authenticated) returning the canonical CEFR catalog as a JSON array. Each entry MUST contain `code` (string from the closed set `A1 | A2 | B1 | B2 | C1 | C2`), `order` (integer starting at 0), `label` (human-readable English label), and `description` (one-line learner-facing description). The array MUST be ordered by `order` ascending.

#### Scenario: Default catalog
- **WHEN** an authenticated user calls `GET /cefr/levels`
- **THEN** the response is a JSON array of 6 entries
- **AND** the first entry is `{ code: 'A1', order: 0, label: 'Beginner', description: 'Basic phrases and vocabulary.' }`
- **AND** the entries are returned in order A1, A2, B1, B2, C1, C2

#### Scenario: Stable shape
- **WHEN** the endpoint is called twice
- **THEN** both responses have identical shape and ordering (the catalog is static code, not DB)

### Requirement: Levels ordering single source of truth
The system SHALL derive the CEFR canonical order from the same constant used by the labels endpoint. Services that need to walk levels in order (e.g. `LessonsService.autoEnrollAllForUser`, `LearningPathService.getLearningPath`) MUST consume that constant instead of declaring a local `LEVEL_ORDER` literal.

#### Scenario: LessonsService uses the shared constant
- **WHEN** `LessonsService.autoEnrollAllForUser(userId, 'A2')` is invoked
- **THEN** the eligible levels include A1 and A2 (in that order)
- **AND** the source of `['A1', 'A2']` is the shared `LEVEL_META` constant, not a hardcoded literal in `lessons.service.ts`

#### Scenario: LearningPathService uses the shared constant
- **WHEN** `LearningPathService.getLearningPath(userId)` iterates levels
- **THEN** the iteration order is A1 → A2 → B1 → B2 → C1 → C2
- **AND** the iteration source is the shared `LEVEL_META` constant

### Requirement: Adding a CEFR level
The system MUST allow adding a new CEFR level by appending one entry to `LEVEL_META` in `labels.constants.ts`. No backend code outside that file requires changes.

#### Scenario: Add a new level (e.g. C2 renamed)
- **WHEN** a developer edits `LEVEL_META` to add a 7th entry
- **THEN** `GET /cefr/levels` returns 7 entries
- **AND** no other source file needs editing for the new level to appear in `learning-path` and `lessons/grouped`