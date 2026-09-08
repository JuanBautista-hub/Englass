## 1. Shared types (packages/shared)

- [x] 1.1 Add `LessonView`, `LessonPermissionFlags` (`isCatalog`, `isOwned`, `canEdit`, `canEnroll`, `alreadyEnrolled`) types in `packages/shared/src/lesson.ts` and re-export from `packages/shared/src/index.ts`.
- [x] 1.2 Add `StudySessionSummary`, `RatingCounts` (and a `Rating` enum shared with backend) types in `packages/shared/src/study.ts`.
- [x] 1.3 Add `MeView` (`{ id, email, displayName, level, currentStreak }`) type in `packages/shared/src/me.ts`.
- [x] 1.4 Add `EnrollResult` (`{ lesson, created, clonedFromId }`) type in `packages/shared/src/lesson.ts`.
- [x] 1.5 Run `pnpm -F @engclass/shared build` (or its build equivalent) so both apps pick up the new types.

## 2. Backend — Lessons permission flags (`lesson-permission-flags` spec)

- [x] 2.1 In `apps/api/src/lessons/lessons.service.ts`, refactor `findOne(id, userId)` to return a `LessonView` with the 5 computed flags. For non-owned foreign lessons, keep the existing 404 (`NotFoundException`).
- [x] 2.2 Refactor `findOneAsCatalog(id, userId)` to call the same internal helper as `findOne`, passing a flag that bypasses the ownership check (`isCatalogHypothetical: true`). The response shape is identical.
- [x] 2.3 Refactor `enrollInCatalog(userId, id)` to return `EnrollResult` with `lesson`, `created`, `clonedFromId`. Use 201 (Created) for new enrollments and 200 (OK) for idempotent re-enrollments.
- [x] 2.4 Add a feature flag `LESSONS_VIEW_FLAGS_ENABLED` (default `true` in dev, `false` in prod for the first deploy) controlling whether `findOne` returns the new shape or the legacy owner-only shape. Expose via `apps/api/src/common/config.ts`.
- [x] 2.5 Update `GET /lessons/catalog/:id` to add `Sunset` and `Link` headers (per spec) and to return the same `LessonView` shape as `/lessons/:id`.
- [x] 2.6 Write e2e tests covering the 5 scenarios in `lesson-permission-flags/spec.md` (catalog-not-enrolled, catalog-already, owned, foreign, unauthenticated).
- [x] 2.7 Run `pnpm -F api lint` and `pnpm -F api test` and ensure green.

## 3. Backend — Auth self-check (`auth-self-check` spec)

- [x] 3.1 Add `GET /auth/me` to `apps/api/src/auth/auth.controller.ts`. Use the existing `JwtAuthGuard` and a new `MeService.me(userId)` method that returns `MeView`.
- [x] 3.2 Set `Cache-Control: private, max-age=60` on the response.
- [x] 3.3 Add `POST /auth/logout` to clear rate-limit buckets keyed on the user. Idempotent: returns 200 even if no session exists.
- [x] 3.4 Write e2e tests for `/auth/me` (200, 401 missing, 401 expired) and `/auth/logout` (200 valid, 200 expired).
- [x] 3.5 Run `pnpm -F api lint` and `pnpm -F api test` and ensure green.

## 4. Backend — Study session summary (`study-session-summary` spec)

- [x] 4.1 In `apps/api/src/review/review.service.ts`, add `endSession(userId): Promise<StudySessionSummary>`. Build counts from the user's review events in the current "session window" (track by `updatedAt` since the last `/sessions/end` for this user or since session start — see 4.2).
- [x] 4.2 Add a `SessionState` key-value table (or a `userId -> lastSessionEndedAt` column on `User` if simpler) to track the window. Pick the lightest option; document in the change archive.
- [x] 4.3 Modify `applyReview` to return `{ progress, userBefore, userAfter, newlyAwarded, updatedCard, sessionDone }`. `updatedCard` is the freshly persisted `DueCard` row. `sessionDone` is `listDueForUser(userId).length === 0` after the apply.
- [x] 4.4 Ensure the returned `updatedCard.lastRatings` is trimmed to `LAST_RATINGS_LIMIT` (5) before returning, using the existing constant.
- [x] 4.5 Add `POST /review/sessions/end` to `apps/api/src/review/review.controller.ts`. Map its body to the summary response. Set `Cache-Control: private, no-store` (mutating endpoint, returns user-private data).
- [x] 4.6 Write e2e tests for the retention formula (`good+easy)/total`), the empty-session zero case, and the `sessionDone` boolean transition.
- [x] 4.7 Run `pnpm -F api lint` and `pnpm -F api test` and ensure green.

## 5. Frontend — Cache service (delete CEFR/mastery fallbacks)

- [ ] 5.1 Create `apps/learn/src/app/core/services/cache.service.ts` with two methods: `get<T>(key): T | null` and `set<T>(key, value)`. Backed by an in-memory `Map`; optional `localStorage` write-through.
- [ ] 5.2 Add two cache keys: `engclass.learn.cache.cefrLevels` and `engclass.learn.cache.masteryLabels`.
- [ ] 5.3 Delete `FALLBACK_LEVELS` from `apps/learn/src/app/core/services/cefr.service.ts`. Update the service to: try `GET /cefr/levels`; on success, write to cache and return; on failure, attempt cache read; on both miss, throw a typed error that components handle as empty state.
- [ ] 5.4 Delete `FALLBACK_LABELS` from `apps/learn/src/app/core/services/mastery-labels.service.ts`. Same cache-or-empty pattern. Keep the `badgeClass` lookup table in the client (Tailwind classes are presentation).
- [ ] 5.5 Update `LessonDetailPage` and `StudyPage` to render a generic slate badge when the mastery service throws.
- [ ] 5.6 Write a unit test for `CacheService` (write/read/invalidate) and a service test for the new `CefrService` paths.

## 6. Frontend — Lessons page (drop `allDue(1)`)

- [ ] 6.1 In `apps/learn/src/app/features/lessons/lessons.page.ts`, remove the `reviewFirstDue()` method and its import of `ReviewService`.
- [ ] 6.2 Bind the "Start review" CTA to `dashboard.nextLesson.lessonId` (signal stored alongside the existing dashboard load).
- [ ] 6.3 Update unit tests for `lessons.page.spec.ts`: the "Start review" CTA is hidden when `nextLesson` is `null`; routes to `nextLesson.lessonId` when present.

## 7. Frontend — Lesson detail (use permission flags, drop `?source=`)

- [ ] 7.1 In `apps/learn/src/app/core/services/lessons.service.ts`, remove `getCatalogLesson(id)` and `enrollInCatalog(sourceLessonId)`. Replace with a single `get(id): Promise<LessonView>` and `enroll(sourceLessonId): Promise<EnrollResult>`.
- [ ] 7.2 In `apps/learn/src/app/features/lessons/lesson-detail.page.ts`:
  - Remove the `isCatalog = queryParam === 'catalog'` derived signal.
  - Bind all conditional UI (`@if (isCatalog())`, `@if (!isCatalog())`, "Preview from the catalogue" banner, "Add to my lessons" button) to the new flags from `LessonView`.
  - On `enroll()`, use the returned `created` boolean to decide whether to navigate to the clone.
- [ ] 7.3 Update unit tests for the 4 states (catalog-not-enrolled, catalog-enrolled, owned, foreign). Ensure no test references `queryParamMap.get('source')`.

## 8. Frontend — Study page (drop SRS rewriting, use server summary)

- [ ] 8.1 In `apps/learn/src/app/features/study/study.page.ts`:
  - Delete the manual `slice(0, 4) + unshift` of `lastRatings` (line 456).
  - Delete the manual rewrite of `easeFactor`, `intervalDays`, `repetitions`, `lapses`, `dueAt`, `lastReviewedAt`, `mastery` on the local `DueCard` (lines 451-461).
  - Replace them with `dueCard` returned from the `rate()` response (use `applyReview`'s `updatedCard`).
- [ ] 8.2 Replace the inline session-summary computation (lines 246-250, 463-484) with a `POST /review/sessions/end` call when the session ends. Use the server's `retentionPct`, `byRating`, `longestIntervalDays`, `nextDueAt`, and `newlyAwarded`.
- [ ] 8.3 Use the new `sessionDone` flag from `applyReview` to drive the "session ended" UI (instead of `next >= current.length`).
- [ ] 8.4 Update `study.page.spec.ts` to assert no local SRS mutation occurs (no `easeFactor`/`dueAt`/`mastery` rewrites on the local object).

## 9. Frontend — Auth boot and logout

- [ ] 9.1 Create `apps/learn/src/app/core/services/session-bootstrap.service.ts`. On app boot, if `localStorage.getItem('engclass.learn.token')` is non-empty, call `GET /auth/me`. On 200, set `currentUser`; on 401, clear storage and emit a navigation event to `/login`.
- [ ] 9.2 Wire `SessionBootstrapService` into `app.config.ts` (`provideAppInitializer`) so it runs once at startup.
- [ ] 9.3 Update `apps/learn/src/app/core/services/auth.service.ts`:
  - Keep `login()`/`signup()` as-is.
  - Add `logout()` that calls `POST /auth/logout` (idempotent), clears `localStorage`, and clears `currentUser`.
- [ ] 9.4 Update `login.page.ts` to remove `minlength="8"` from the password field (signup-only rule).
- [ ] 9.5 Update unit tests for `auth.service.ts` and `session-bootstrap.service.ts`.

## 10. Documentation and cleanup

- [ ] 10.1 Update `backend-prompt.md` "Reglas no negociables" section to list `LEVEL_META`, `MASTERY_META`, `DAILY_GOAL_TARGET`, `LAST_RATINGS_LIMIT` and to point to their respective endpoints. Also document `/auth/me` and `/review/sessions/end` in the endpoints table.
- [ ] 10.2 Update `front-prompt.md` to forbid redeclaring domain constants and to specify the `/auth/me` boot path.
- [ ] 10.3 In `apps/learn/src/app/features/dashboard/dashboard.page.ts`, delete the `dailyGoal: { target: 20, completed: 0 }` placeholder (line 127) and rely on the `dailyGoal` returned by `GET /dashboard`.
- [ ] 10.4 Search the codebase for any other literal duplicates (`grep -n "LAST_RATINGS_LIMIT\\|DAILY_GOAL_TARGET\\|LEVEL_META\\|MASTERY_META"` in `apps/learn`) and remove them.
- [ ] 10.5 Run full lint + test suites in both apps; ensure green.
- [ ] 10.6 Add a CHANGELOG entry under `apps/api/CHANGELOG.md` and `apps/learn/CHANGELOG.md` summarizing the new endpoints and the breaking 200-on-catalog-foreign change.

## 11. Deprecation window for `GET /lessons/catalog/:id`

- [x] 11.1 In `apps/api/src/lessons/lessons.controller.ts`, keep the endpoint working for 30 days after this change ships. Add telemetry to count calls per day.
- [x] 11.2 When telemetry shows zero calls for 7 consecutive days, remove the endpoint and the controller method. Add a one-line CHANGELOG entry.
