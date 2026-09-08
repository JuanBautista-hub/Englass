# Changelog — apps/api

## [Unreleased] — move-business-logic-from-learn-to-backend

### Added
- `GET /api/v1/auth/me` — returns the current user's public view (`id`, `email`, `displayName`, `level`, `currentStreak`). Cache-Control: `private, max-age=60`. Requires a valid bearer token.
- `POST /api/v1/auth/logout` — clears per-user rate-limit buckets. Idempotent. Cache-Control: `no-store`.
- `POST /api/v1/review/sessions/end` — returns the `StudySessionSummary` for the current session. Cache-Control: `private, no-store`.
- Feature flag `LESSONS_VIEW_FLAGS_ENABLED` (default `true` in dev, opt-out in prod). When `false`, `GET /lessons/:id` reverts to the legacy "owner only" behavior with a 403 for non-owners.
- `LessonView`, `LessonPermissionFlags`, `EnrollResult`, `StudySessionSummary`, `RatingCounts`, `Rating`, `DueCardView`, `ApplyReviewApiResult`, `MeView` types live in `@engclass/shared` and are the source of truth for cross-app contracts.

### Changed
- `GET /api/v1/lessons/:id` now returns the lesson with five computed permission flags: `isCatalog`, `isOwned`, `canEdit`, `canEnroll`, `alreadyEnrolled`. Previously it 403'd for non-owners; now it returns 404 (still hidden) for foreign-user lessons and 200 with `isCatalog: true` for catalog lessons.

  **BREAKING**: any client that relied on 403 for "not yours" must migrate to reading `isOwned` and `isCatalog` instead. Foreign (non-catalog) lessons still 404; do not migrate that path.
- `POST /api/v1/lessons/catalog/:id/enroll` now returns `EnrollResult` (`{ lesson, created, clonedFromId }`) and uses 201 (Created) when a new clone is created, 200 (OK) when the user was already enrolled.
- `POST /api/v1/review/cards/:cardId` now returns `updatedCard` (the freshly computed DueCard row with trimmed `lastRatings`) and `sessionDone` (true when the user has no remaining due cards). The client no longer needs to rewrite `easeFactor`/`dueAt`/`mastery` locally.

### Deprecated
- `GET /api/v1/lessons/catalog/:id` — deprecated; will be removed once telemetry (see `CatalogDeprecationService.hitsSinceStart`) shows zero calls per day for 7 consecutive days. Adds `Sunset` and `Link` headers pointing to `GET /lessons/:id` during the deprecation window. The endpoint continues to return the same `LessonView` shape (including flags) so the client can migrate transparently.

### Internal
- `apps/api/src/common/config.ts` exposes `AppConfig` (token-bucket symbol `APP_CONFIG`) consumed by `LessonsService`, `CatalogDeprecationService`. Sunset is `LESSONS_CATALOG_DEPRECATION_DAYS` (default 30).
- `apps/api/src/auth/rate-limit.store.ts` — in-memory per-user rate-limit store; pre-wired for `logout()` to clear per-user buckets.
- `apps/api/src/review/session-summary.ts` — pure helper that builds a `StudySessionSummary` from session-window reviews; exposed for unit testing.
- Jest + ts-jest + `@types/jest` installed; `pnpm -F api test` runs the new specs. Coverage hooks in `jest.config.js`; `tsconfig.test.json` for tests.
