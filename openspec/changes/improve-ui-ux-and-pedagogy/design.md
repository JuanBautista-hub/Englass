## Context

`apps/learn` is an Angular 17 PWA that consumes the NestJS `apps/api` for auth, lessons, and SM-2 spaced repetition review. The current experience is functional but pedagogically flat: lessons are listed but not paced, study sessions are a queue of bare flashcards, and there is no sense of progress beyond "X due now". This change layers pedagogical scaffolding on top of the existing data model and APIs without rewriting them.

The work touches three layers:
- Backend: extend `User` with streak metadata, add an `Achievement` table, add three small read endpoints (dashboard, learning-path, achievements), and enrich `DueCardView` with `mastery` and `lastRatings`.
- Frontend: introduce a `/dashboard` home view, a learning-path component, an achievements panel, a focused Study mode, and per-card mastery chips. Tailwind only — no inline styles.
- Schema: two small additive migrations; everything else reuses existing tables.

## Goals / Non-Goals

**Goals**
- Make the next step obvious at all times (dashboard, path, recommendations).
- Show progress in context (per-level bars, per-card mastery, streak counter).
- Make study sessions feel guided, not mechanical (focus mode, hints, end-of-session celebration).
- Keep all interactions reversible (no destructive schema changes; rollback is `prisma db push` reverse).
- Stay within existing stack — NestJS + Prisma + Angular + Tailwind.

**Non-Goals**
- Notifications / email digests.
- Social features (friends, leaderboards).
- Payments / premium tiers.
- Voice evaluation / STT (already out of scope; Web Speech API TTS only).
- Mobile native — keep the PWA responsive, but no React Native.
- Any change to the seed curriculum content (still 7 categories, 20 lessons, 133 cards).

## Decisions

### D1. Mastery is derived, not stored
A card's mastery is computed from `CardProgress.{repetitions, easeFactor, intervalDays, lapses}`:
- `Learning`: `repetitions < 2`
- `Reviewing`: `2 ≤ repetitions < 5` OR `easeFactor < 2.2`
- `Mastered`: `repetitions ≥ 5` AND `easeFactor ≥ 2.2` AND `intervalDays ≥ 21`

**Why**: avoids a new column to keep in sync with SM-2. Pure function in `apps/api/src/srs/mastery.ts`. Computed on the server and returned in `DueCardView` and `LearningPathLesson`.

### D2. Streaks live on the User row
`currentStreak` and `bestStreak` (Int) + `lastReviewedAt` (DateTime?) on `User`. Updated by `SrsService.applyReview` when the user reviews at least one card on a new calendar day (UTC). If `lastReviewedAt` is yesterday → `currentStreak += 1`. If older than yesterday → `currentStreak = 1`. `bestStreak = max(bestStreak, currentStreak)`.

**Why**: cheaper than a separate `ReviewStreak` table; one row update per review; queries are O(1).

### D3. Achievements as a separate table
`Achievement { id, slug, name, description, iconKey }` (catalog, seeded). `UserAchievement { userId, achievementId, awardedAt }` (per-user). Awarded when the user finishes every lesson in a CEFR level (computed on review apply).

**Why**: normalized catalog means new badges don't require code changes; admin can seed more.

### D4. Dashboard endpoint aggregates everything in one request
`GET /api/v1/dashboard` returns:
```
{
  greeting: 'morning' | 'afternoon' | 'evening',
  displayName,
  currentStreak, bestStreak,
  dueNow, dueToday,
  level: 'A1' | ...,
  levelProgress: { completedLessons, totalLessons, percent },
  nextLesson: { lessonId, title, categoryName, dueCount } | null,
  recentAchievements: [{ slug, name, awardedAt }],
  dailyGoal: { target: 20, completed: 7 }
}
```
**Why**: avoids N round-trips and races between separate endpoints. One request, signals loaded.

### D5. Learning path is computed, not stored
`GET /api/v1/learning-path` walks CEFR levels (A1 → C2), counts the user's completed lessons per level (`sourceLessonId` set + all cards have `repetitions ≥ 5` heuristic), and emits:
```
[{ level, order, totalLessons, completedLessons, percent, recommendedLessonId | null, status: 'locked' | 'available' | 'in_progress' | 'completed' }]
```
A level is `locked` until the previous level is `completed`. Recommended lesson = first lesson with `dueCount > 0` in the current level, else the next un-completed lesson.

**Why**: matches how Duolingo and similar apps frame progression; no new table needed; recomputed cheaply on demand.

### D6. Study mode: focus mode by default
When the user enters `/study/:id`, the chrome (header, navigation, footer) hides — full-screen card in the centre. After the last card or when the user taps "Finish early", they return to a summary page that shows streak increment, session retention % (`good+easy / total`), and badges if any were earned.

**Why**: deep practice sessions need to remove distractions. Returning to a summary screen gives the "I did a thing" payoff.

### D7. Card hint during study
On flip, after the definition/example, show a small "Hint" expandable with the Spanish translation + explanation. The rating row stays always-visible. Defaults to collapsed.

**Why**: learners who blank on the answer still need a recovery path. We don't auto-show the hint so they have to actively ask for help (better retention).

### D8. Per-card "your recent ratings" on the back
After rating, show the last 5 ratings for that card (`again/hard/good/easy` chips with dates). Helps the learner see progress over time.

**Why**: makes the algorithm visible to the learner so they trust it.

### D9. Daily goal
Hard-coded at 20 reviews per day (server-side constant `DAILY_GOAL_TARGET = 20` in a `config.ts`). Display "X / 20 today" on the dashboard. No streak boost for hitting it yet — that's a future improvement.

**Why**: simple, configurable later, doesn't lock us into a feature we haven't validated.

### D10. Accessibility baseline
- Every icon-only button has `aria-label`.
- Focus rings: keep Tailwind's default `focus-visible:ring-2 ring-offset-2`.
- `prefers-reduced-motion`: wrap any celebration animation in `@media (prefers-reduced-motion: reduce)` to disable.
- Color contrast: avoid using the same Tailwind shade for text and background.

**Why**: low-cost, broad reach.

## Risks / Trade-offs

- **[Risk] Adding 2 endpoints + 1 schema change in one change** → Mitigation: deploy in order — schema → endpoints → frontend. Each step is small enough to verify in isolation.
- **[Risk] Dashboard endpoint can become slow if a user has thousands of lessons** → Mitigation: compute streak + due counters via SQL aggregations (`COUNT`, `SUM`); compute level progress only across the user's own lessons (not all 133 seed cards). Add a 60s in-memory cache if needed.
- **[Risk] Mastery derivation might disagree with the user's intuition** → Mitigation: expose the function and its inputs in a tiny "Why is this mastered?" hover tooltip; tweak thresholds if user feedback says so.
- **[Risk] Streak logic is timezone-sensitive** → Mitigation: store `lastReviewedAt` in UTC; comparison is `> now - 24h` and `>= startOfYesterdayUTC`. Document the assumption in the spec.
- **[Risk] Focus mode hides the header; users may feel lost** → Mitigation: a small "← Exit" pill in the top-left corner, plus the browser back button still works.
- **[Risk] Adding `Achievement` table requires a one-off seeding pass** → Mitigation: seed file adds 4 level-completion achievements (A1 done, A2 done, B1 done, B2 done). Idempotent.

## Migration Plan

1. `prisma db push --accept-data-loss` to add `User.currentStreak`, `User.bestStreak`, `User.lastReviewedAt`, and the two new tables.
2. `prisma generate` and rebuild the API so the new fields are visible.
3. Deploy backend with the new endpoints. Old clients keep working — the new fields are additive.
4. Deploy frontend. Use feature-detect for `dashboard` endpoint so older PWA builds still load `/lessons`.
5. Rollback: revert frontend commit (no data loss). Reverting backend keeps `Achievement` table but the app ignores it.

## Open Questions

- Should the daily goal be configurable per user, or one global number for MVP? (Decision: global for now, future-proof via `User.dailyGoalTarget` if needed.)
- Do we want streak protection (one missed day keeps the streak)? (Decision: not in MVP — Duolingo-style protection adds complexity we don't need yet.)
- Should we award badges for streaks (7-day, 30-day) too? (Decision: yes, but in a follow-up — current change ships level-completion badges only.)
