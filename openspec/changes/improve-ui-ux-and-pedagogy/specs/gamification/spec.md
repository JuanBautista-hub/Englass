## ADDED Requirements

### Requirement: Streaks update on first review of the day
The `User.currentStreak` field MUST increment by 1 when the learner completes a review and `lastReviewedAt` is null or earlier than the start of the current UTC day. MUST reset to 1 when `lastReviewedAt` is older than the start of the previous UTC day. MUST NOT change when a review happens within the same UTC day as `lastReviewedAt`. `bestStreak` MUST equal `max(bestStreak, currentStreak)` after each update.

#### Scenario: First review today after a streak
- **WHEN** `lastReviewedAt` equals yesterday at 23:59 UTC and the user reviews a card at 00:30 UTC today
- **THEN** `currentStreak` MUST equal the previous `currentStreak` + 1 and `lastReviewedAt` MUST be set to now

#### Scenario: Skipped day
- **WHEN** `lastReviewedAt` is three days ago and the user reviews a card now
- **THEN** `currentStreak` MUST be 1 and `bestStreak` MUST remain the previous maximum

#### Scenario: Second review same day
- **WHEN** the user has already reviewed at least one card today and reviews another
- **THEN** `currentStreak` MUST be unchanged

### Requirement: Level completion badges are awarded automatically
When a learner finishes every lesson in a CEFR level (the level's `completedLessons` becomes equal to `totalLessons`), the system MUST insert a `UserAchievement` row for the matching level badge within the same transaction as the review that triggered the completion.

#### Scenario: Last lesson of A1 completed
- **WHEN** the user rates the last remaining card of the last remaining A1 lesson
- **THEN** the system MUST insert a `UserAchievement` row for the `a1-complete` slug (if not already present)

#### Scenario: Level already completed
- **WHEN** the user has already earned the A1 badge and reviews more A1 cards
- **THEN** the system MUST NOT create a duplicate `UserAchievement` row

### Requirement: Achievements endpoint lists earned badges
`GET /api/v1/achievements` MUST return an array of `{ slug, name, description, awardedAt }` for the authenticated user, sorted by `awardedAt` descending.

#### Scenario: User has earned badges
- **WHEN** the learner is authenticated and has at least one `UserAchievement`
- **THEN** the response MUST be 200 with all earned badges, newest first

#### Scenario: User has no badges
- **WHEN** the learner has not earned any badges
- **THEN** the response MUST be 200 with an empty array
