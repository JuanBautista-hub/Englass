## ADDED Requirements

### Requirement: Dashboard aggregates learner state in one request
The system SHALL expose `GET /api/v1/dashboard` returning a single JSON payload with the learner's greeting time bucket, displayName, currentStreak, bestStreak, dueNow, dueToday, current CEFR level, levelProgress (completedLessons / totalLessons / percent), nextLesson (lessonId, title, categoryName, dueCount — or null), recentAchievements (slug, name, awardedAt — last 3), and dailyGoal (target, completed).

#### Scenario: Authenticated user loads the dashboard
- **WHEN** the learner is authenticated and the dashboard endpoint is called
- **THEN** the response MUST be 200 with all required fields populated; `dueNow` MUST equal the count of `CardProgress` rows where `userId` matches and `dueAt <= now`; `dueToday` MUST equal the same count restricted to the user's calendar day in UTC

#### Scenario: No due cards
- **WHEN** the learner has zero due cards
- **THEN** `nextLesson` MUST be the lesson with the lowest level that still has unenrolled cards (by catalog order), or `null` if every catalog lesson is already enrolled

### Requirement: Greeting reflects local hour
The greeting field MUST be one of `morning` (05:00-11:59), `afternoon` (12:00-17:59), `evening` (18:00-04:59) computed from the server's local clock at response time.

#### Scenario: Morning request
- **WHEN** the server clock is 09:00 local time
- **THEN** the dashboard response MUST include `greeting: "morning"`

#### Scenario: Evening request
- **WHEN** the server clock is 21:00 local time
- **THEN** the dashboard response MUST include `greeting: "evening"`
