## ADDED Requirements

### Requirement: Mastery state is derived from SM-2 metrics
The system MUST compute a card's mastery as one of `learning`, `reviewing`, `mastered` from `CardProgress.{repetitions, easeFactor, intervalDays}`:
- `learning`: `repetitions < 2`
- `reviewing`: `repetitions >= 2` AND (`repetitions < 5` OR `easeFactor < 2.2`)
- `mastered`: `repetitions >= 5` AND `easeFactor >= 2.2` AND `intervalDays >= 21`

#### Scenario: Brand-new card
- **WHEN** a card has `repetitions: 0`
- **THEN** the mastery MUST be `learning`

#### Scenario: Mature card with high ease
- **WHEN** a card has `repetitions: 7`, `easeFactor: 2.6`, `intervalDays: 30`
- **THEN** the mastery MUST be `mastered`

#### Scenario: In-between card
- **WHEN** a card has `repetitions: 3`, `easeFactor: 1.9`, `intervalDays: 6`
- **THEN** the mastery MUST be `reviewing` (ease below threshold)

### Requirement: Mastery surfaces in review responses
The `DueCardView` returned by `GET /api/v1/review/due`, `GET /api/v1/review/lessons/:lessonId/due`, and `GET /api/v1/review/lessons/catalog` MUST include the computed `mastery` string.

#### Scenario: Review due endpoint
- **WHEN** the learner calls any review endpoint
- **THEN** each card in the response MUST have a `mastery` field equal to one of `learning`, `reviewing`, `mastered`

### Requirement: Recent ratings are returned per card
`DueCardView` MUST include a `lastRatings` array with up to 5 most recent `{ rating, reviewedAt }` entries for the current user.

#### Scenario: Card has 7 ratings in history
- **WHEN** a card has 7 prior ratings in `ReviewLog`
- **THEN** the response MUST include exactly the 5 newest entries in `lastRatings`, newest first

#### Scenario: Card has no ratings yet
- **WHEN** a card has no `ReviewLog` rows
- **THEN** the response MUST include `lastRatings: []`
