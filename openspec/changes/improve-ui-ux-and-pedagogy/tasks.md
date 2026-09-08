## 1. Schema and migrations

- [x] 1.1 Add `currentStreak Int @default(0)`, `bestStreak Int @default(0)`, `lastReviewedAt DateTime?` to the `User` model in `apps/api/prisma/schema.prisma`
- [x] 1.2 Add `Achievement` model (id, slug unique, name, description, iconKey) and `UserAchievement` model (id, userId, achievementId, awardedAt, with `@@unique([userId, achievementId])`) to the same schema
- [x] 1.3 Run `prisma db push --accept-data-loss` against the dev database and `prisma generate`
- [x] 1.4 Seed 4 achievements (`a1-complete`, `a2-complete`, `b1-complete`, `b2-complete`) idempotently at the end of `prisma/seed.ts`

## 2. Backend: mastery + ratings + streak

- [x] 2.1 Create `apps/api/src/srs/mastery.ts` exporting `computeMastery(progress) -> 'learning' | 'reviewing' | 'mastered'` per the spec thresholds
- [x] 2.2 Extend `DueCardView` (`apps/api/src/review/review.service.ts`) with `mastery: string` and `lastRatings: Array<{ rating: string; reviewedAt: string }>`; backfill both in `listDueForLesson`, `listAllDueForUser`, and any other reader
- [x] 2.3 In `SrsService.applyReview`, update streak fields on `User` per the `gamification` spec (UTC day boundary; reset to 1 on skipped days)
- [x] 2.4 In the same `applyReview`, after updating progress, check if any CEFR level just became completed; if so, insert a `UserAchievement` row inside the same transaction
- [x] 2.5 Add unit-style assertions (console-based or `if (...) throw`) for streak transitions and mastery thresholds in `scripts/sm2.demo.ts` or a new `scripts/mastery.demo.ts`

## 3. Backend: dashboard, learning-path, achievements endpoints

- [x] 3.1 Create `apps/api/src/dashboard/dashboard.{module,service,controller}.ts` exposing `GET /api/v1/dashboard` returning the payload from the `learner-dashboard` spec
- [x] 3.2 Implement greeting bucket (`morning`/`afternoon`/`evening`) from the server's local clock at response time
- [x] 3.3 Create `apps/api/src/learning-path/learning-path.{module,service,controller}.ts` exposing `GET /api/v1/learning-path` with the level ordering and status rules from the spec
- [x] 3.4 Add `GET /api/v1/achievements` to the existing user-facing controllers (or new `achievements` module) returning `{ slug, name, description, awardedAt }` sorted by `awardedAt desc`
- [x] 3.5 Wire the new modules into `app.module.ts` and confirm `pnpm --filter @engclass/api build` is green

## 4. Frontend: dashboard page

- [x] 4.1 Add `apps/learn/src/app/core/services/dashboard.service.ts` with `getDashboard()` calling the new endpoint
- [x] 4.2 Create `apps/learn/src/app/features/dashboard/dashboard.page.ts` rendering streak, dueNow, dueToday, level progress, nextLesson card, recent achievements, and daily goal
- [x] 4.3 Register the new route `/dashboard` in `app.routes.ts` behind `authGuard`; redirect `/` to `/dashboard`
- [x] 4.4 Update the header in `app.component.ts` to show streak flame + count when authenticated
- [x] 4.5 Add a small `AchievementsPanel` component and mount it inside the dashboard page

## 5. Frontend: learning path

- [x] 5.1 Add `LearningPathService` (`apps/learn/src/app/core/services/learning-path.service.ts`)
- [x] 5.2 Create `LearningPath` component that renders each level with progress bar, lock state, and the recommended lesson link
- [x] 5.3 Mount the learning path section at the top of `/lessons`, above the catalogue tabs
- [x] 5.4 Add per-card `mastery` chip to catalogue rows in both "by level" and "by category" views; chip colour matches state (slate for learning, amber for reviewing, emerald for mastered)

## 6. Frontend: focused study session

- [x] 6.1 In `study.page.ts`, hide the header (`document.body.classList.toggle('study-mode', true)`) when the session starts and restore it on exit/finish
- [x] 6.2 Add a collapsed "Hint" expandable on the back of the card; when opened, show translation + explanationEs. Rating row remains always visible
- [x] 6.3 After rating, fetch the card's `lastRatings` (already returned by the API) and show the last 5 as small chips below the rating row
- [x] 6.4 Update the summary screen to show streak message, retention %, and any newly awarded achievements returned by the review response (extend `applyReview` response shape or call `GET /achievements` on session end)
- [x] 6.5 Wrap any new animation in `@media (prefers-reduced-motion: reduce)` (CSS class `.motion-safe:` in Tailwind) so reduced-motion users see a static transition

## 7. Accessibility sweep

- [x] 7.1 Audit every icon-only button (`🔊`, exit pill, achievement icon) and add or fix `aria-label`
- [x] 7.2 Add `focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2` utility to all interactive elements; verify no `outline: none` is being used without a replacement
- [x] 7.3 Replace any remaining `text-slate-400` body text with `text-slate-600` minimum; same for any custom inline colours below AA contrast

## 8. Verification

- [x] 8.1 `pnpm --filter @engclass/api build` and `pnpm --filter @engclass/learn build` are green
- [x] 8.2 Run `prisma db push --accept-data-loss` then `pnpm --filter @engclass/api exec prisma db seed`; confirm `Achievement` rows exist
- [x] 8.3 Manual smoke test: log in, complete one review, see streak = 1 and dashboard reflects it; complete all lessons in A1, see `a1-complete` badge awarded; navigate to `/study/:id`, confirm header hides and "Hint" works
- [x] 8.4 Run `pnpm -r build` to confirm `apps/web` (PDF editor) is unaffected
