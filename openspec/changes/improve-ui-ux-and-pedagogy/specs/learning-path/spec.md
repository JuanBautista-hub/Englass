## ADDED Requirements

### Requirement: Learning path groups lessons by CEFR level
The system SHALL expose `GET /api/v1/learning-path` returning an array of level entries in canonical CEFR order (A1, A2, B1, B2, C1, C2). Each entry MUST include `level`, `order`, `totalLessons`, `completedLessons`, `percent`, `recommendedLessonId` (or null), and `status`.

#### Scenario: User has progress
- **WHEN** the learner is authenticated
- **THEN** the response MUST include one entry per level that has at least one enrolled lesson, plus any catalog level not yet enrolled (with `completedLessons: 0` and `totalLessons` reflecting catalog totals); entries MUST be sorted by `order` ascending

#### Scenario: No enrollments yet
- **WHEN** the learner has not enrolled in any lesson
- **THEN** the response MUST still include all levels with at least one catalog lesson, each with `percent: 0` and `status: "available"`

### Requirement: Level status is computed
A level's `status` MUST be one of `locked`, `available`, `in_progress`, `completed`. The first level in the user's path (lowest `order` with `totalLessons > 0`) MUST be `available` (never `locked`). A level MUST be `locked` when its predecessor is neither `available` nor `completed`. A level MUST be `in_progress` when it has at least one enrolled lesson but is not `completed`. A level MUST be `completed` when `completedLessons === totalLessons > 0`.

#### Scenario: First level is always available
- **WHEN** the learner has no enrollments
- **THEN** the lowest-order non-empty level MUST have `status: "available"`

#### Scenario: Locked levels are skipped
- **WHEN** the learner has not started level B1 but has progress in A1
- **THEN** B1 MUST be `locked` until A1 is `completed`; `recommendedLessonId` for B1 MUST be `null`

### Requirement: Recommended lesson is the most actionable
`recommendedLessonId` for the current in-progress level MUST be the lesson with the highest `dueCount` in that level. For `available` levels with zero enrollments, it MUST be the first catalog lesson in that level. MUST be `null` for `locked` levels.

#### Scenario: User has due cards in current level
- **WHEN** the learner has enrolled lessons in A2 and A2 has cards due today
- **THEN** A2's `recommendedLessonId` MUST be the lesson with the most due cards in A2

#### Scenario: User has no enrollments
- **WHEN** the learner has not enrolled in any A1 lesson
- **THEN** A1's `recommendedLessonId` MUST be the catalog lesson with the lowest `createdAt` in A1
