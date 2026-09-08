## ADDED Requirements

### Requirement: Apply review returns the updated DueCard
The system SHALL make `POST /api/v1/review/cards/:cardId` include in its JSON response the freshly computed `DueCard` (including `easeFactor`, `intervalDays`, `repetitions`, `lapses`, `dueAt`, `lastReviewedAt`, `mastery`, and the trimmed `lastRatings`). The response MUST be authoritative: the client MUST NOT recalculate or rewrite these fields locally after applying a rating.

#### Scenario: Apply a Good rating
- **WHEN** the user rates a card with `{ rating: 'good' }`
- **THEN** the response contains `dueCard` with all SRS fields populated by `SrsService.applyReview`
- **AND** `dueCard.lastRatings` is trimmed to at most `LAST_RATINGS_LIMIT` entries (5) using the same constant the backend uses for trimming the persisted array

#### Scenario: Apply an Again rating
- **WHEN** the user rates a card with `{ rating: 'again' }` and a card has lapses
- **THEN** `dueCard.lapses` is one greater than the value before the call
- **AND** `dueCard.dueAt` is recomputed by the same SM-2 path the SRS service uses elsewhere

### Requirement: Apply review reports session termination
The system SHALL make `POST /api/v1/review/cards/:cardId` include a `sessionDone: boolean` field. The server SHALL consider a session done when, after applying the rating, there are no remaining due cards for the user **at the time of the call** AND the user submitted the call as the last in the in-flight session. The signal MUST be derived from server state (`SrsService.listDueForUser`) and MUST NOT be inferred by the client from the local queue length.

#### Scenario: Cards still due after rating
- **WHEN** the user rates a card and the user still has other due cards
- **THEN** `sessionDone` equals `false`

#### Scenario: Last card in the session
- **WHEN** the user rates their last due card (the queue on the server has length 1 before the call, 0 after)
- **THEN** `sessionDone` equals `true`

### Requirement: End session endpoint
The system SHALL expose `POST /api/v1/review/sessions/end` (authenticated) that returns a `StudySessionSummary`. The summary MUST contain `totalReviewed`, `byRating { again, hard, good, easy }`, `retentionPct`, `longestIntervalDays`, `nextDueAt`, `streakBefore`, `streakAfter`, and `newlyAwarded[]`. The summary is computed over the user's review activity since the session began. The endpoint MUST be idempotent within a window and MUST NOT mutate user state.

#### Scenario: Default summary
- **WHEN** an authenticated user calls `POST /review/sessions/end` after rating 4 cards (1 again, 1 hard, 2 good)
- **THEN** the response is 200
- **AND** `totalReviewed` equals `4`
- **AND** `byRating.again` equals `1`, `byRating.hard` equals `1`, `byRating.good` equals `2`, `byRating.easy` equals `0`
- **AND** `retentionPct` equals `Math.round(((good + easy) / totalReviewed) * 100)` = 50
- **AND** `nextDueAt` is the earliest `dueAt` among the user's remaining due cards, or `null` if none

#### Scenario: Empty session
- **WHEN** the user calls `POST /review/sessions/end` without having rated any card in the current session
- **THEN** `totalReviewed` equals `0`
- **AND** `byRating` is `{ again: 0, hard: 0, good: 0, easy: 0 }`
- **AND** `retentionPct` equals `0` (not NaN)

### Requirement: Retention formula is single source of truth
The system SHALL define retention as `Math.round(((byRating.good + byRating.easy) / totalReviewed) * 100)`. The frontend MUST NOT recompute retention locally and MUST consume `StudySessionSummary.retentionPct` verbatim.

#### Scenario: Formula matches
- **WHEN** the user rates 10 cards (3 good, 1 easy, 4 hard, 2 again)
- **THEN** `retentionPct` equals `40`

#### Scenario: Server changes the formula
- **WHEN** a developer modifies the retention formula to weight `hard` at 0.5 (i.e. `(good + easy + 0.5 * hard) / total`)
- **THEN** the next `/review/sessions/end` reflects the new formula
- **AND** no frontend change is required
