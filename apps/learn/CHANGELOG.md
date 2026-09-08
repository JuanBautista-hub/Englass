# Changelog — apps/learn

## [Unreleased] — companion to backend move-business-logic-from-learn-to-backend

The frontend migrations implied by this change are tracked in the parent change
`openspec/changes/move-business-logic-from-learn-to-backend`. Backend contracts have
landed in `apps/api`; the frontend migration is the next batch (Group 5-10) of the
same change.

### Backend contracts available now (consumed in a follow-up change)
- `GET /api/v1/lessons/:id` now returns `LessonPermissionFlags` (`isCatalog`, `isOwned`, `canEdit`, `canEnroll`, `alreadyEnrolled`).
- `POST /api/v1/lessons/catalog/:id/enroll` returns `EnrollResult` with `created` and `clonedFromId`.
- `POST /api/v1/review/cards/:cardId` returns `updatedCard` (server-authoritative DueCard) and `sessionDone`.
- `POST /api/v1/review/sessions/end` returns `StudySessionSummary` (retention, byRating, longestIntervalDays, nextDueAt, streak before/after, newlyAwarded).
- `GET /api/v1/auth/me` returns `MeView` for boot-time session validation.
- `POST /api/v1/auth/logout` is the canonical server-side logout.
- `GET /api/v1/lessons/catalog/:id` is deprecated; the frontend should call `GET /lessons/:id`.
