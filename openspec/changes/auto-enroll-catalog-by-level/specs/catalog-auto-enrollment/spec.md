## ADDED Requirements

### Requirement: Auto-enroll on signup
The system SHALL automatically enroll a newly-registered user into every catalog lesson whose CEFR level is at or below the user's current target level on `POST /api/v1/auth/signup`. If the user's level cannot be determined, the system SHALL default to enrolling all `A1` lessons. The system MUST be idempotent: calling signup twice or restarting the process MUST NOT create duplicate user-owned lessons.

#### Scenario: New user signs up at A1
- **WHEN** a user signs up and has no prior learning data
- **THEN** the system creates one user-owned `Lesson` row per `A1` catalog lesson, copying every card with its `term`, `definition`, `example`, `translation`, `explanationEs`, `level`, and `ordinal`
- **AND** each cloned lesson has `ownerId = userId` and `sourceLessonId = <catalog lesson id>`

#### Scenario: Idempotent re-run
- **WHEN** the auto-enroll process is invoked twice for the same user (e.g., signup retried, retry on transient error)
- **THEN** the system creates zero new lesson rows because `@@unique([ownerId, sourceLessonId])` blocks duplicates
- **AND** the response still returns the list of the user's enrolled lessons

#### Scenario: Catalog lesson has no cards
- **WHEN** a catalog lesson is empty
- **THEN** the system still creates the user-owned lesson shell so the user sees it in their grouped list

### Requirement: Auto-enroll endpoint
The system SHALL expose `POST /api/v1/lessons/auto-enroll` (authenticated) that runs the auto-enrollment routine on demand. The endpoint MUST return `200` with `{ enrolled: number, skipped: number }` indicating how many catalog lessons were newly cloned vs. already present.

#### Scenario: First call from a user with no enrollments
- **WHEN** an authenticated user calls `POST /lessons/auto-enroll`
- **THEN** the system clones every eligible catalog lesson
- **AND** the response body has `enrolled > 0` and `skipped = 0`

#### Scenario: Repeat call
- **WHEN** an authenticated user calls `POST /lessons/auto-enroll` a second time
- **THEN** the system creates no new rows
- **AND** the response body has `enrolled = 0` and `skipped >= 0`

### Requirement: Grouped-by-level response
The system SHALL expose `GET /api/v1/lessons/grouped` (authenticated) returning the user's lessons grouped by CEFR level in the canonical order `A1, A2, B1, B2`. Each group MUST contain `level` and `lessons: LessonView[]` where `LessonView` includes `id`, `title`, `description`, `level`, `categoryId`, `cardCount`, and `mastery`.

#### Scenario: User has lessons in multiple levels
- **WHEN** an authenticated user calls `GET /lessons/grouped`
- **THEN** the response is an array of level groups in order `A1, A2, B1, B2`
- **AND** empty levels are omitted (not returned as empty arrays)

#### Scenario: User has no lessons yet
- **WHEN** a freshly-signed-up user calls `GET /lessons/grouped` before auto-enroll has run
- **THEN** the system triggers auto-enrollment inline
- **AND** the response contains at least the `A1` group with the user's newly-cloned lessons

### Requirement: Backward-compatible `enrollInCatalog`
The system SHALL preserve `POST /api/v1/lessons/catalog/:id/enroll` for users who want to add a higher-level lesson manually. The endpoint MUST remain idempotent (same source lesson + same user returns the existing user-owned lesson, never a duplicate).

#### Scenario: User enrolls in a higher-level lesson
- **WHEN** an authenticated user calls `POST /lessons/catalog/:id/enroll` with a `B2` catalog id
- **THEN** the system clones that lesson with `ownerId = userId`
- **AND** returns the cloned `LessonView`