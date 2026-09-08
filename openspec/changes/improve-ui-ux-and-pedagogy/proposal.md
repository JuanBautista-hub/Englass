## Why

The current `apps/learn` PWA works but the learning experience is mostly utilitarian: a card list with per-card TTS buttons, a basic flashcard study mode, and a flat catalogue. Learners see content but get little pedagogical scaffolding — no progress signals in context, no sense of mastery, no guided path from one level to the next, and no celebration of effort. The catalogue already has 7 categories / 20 lessons / 133 cards but no visual hierarchy or "what should I do next?" affordance.

This change turns the app into a proper learning tool: progress is visible, mistakes are gentle, the next step is obvious, and every interaction reinforces a habit.

## What Changes

- **Adaptive home/dashboard**: replace the simple "X due now" banner with a richer dashboard (streak, level progress, next-up card, daily goal).
- **Pedagogical study flow**: the Study screen becomes a guided session — focus mode (no chrome), rating reveals a "why" hint, session stats include retention rate, and a daily streak increments on first review of the day.
- **Curriculum path**: a vertical "learning path" component on `/lessons` shows the CEFR ladder (A1 → C2) with progress bars per level, locked/unlocked state, and recommended next lesson.
- **Achievements / gamification**: lightweight streaks (current / best), level completion badges, and a small celebration animation when a session ends without any "again" ratings.
- **Mastery signal**: per-card mastery indicator (Learning / Reviewing / Mastered) derived from SM-2 `repetitions` and `easeFactor`. Surfaces in catalogue and study.
- **Spaced repetition warmup**: at session start, show a 3-card preview of what's hardest due today so the user knows what's coming.
- **Card-level "got it" history**: surface the last 5 ratings a card received so the learner can see their own trajectory.
- **Empty / error / success states polish**: friendly copy, illustrations, consistent placement.
- **Accessibility**: focus rings, ARIA labels on icon-only buttons, prefers-reduced-motion support for any animation.

## Capabilities

### New Capabilities

- `learner-dashboard`: home screen with streak, level progress, next-up card, daily goal, recent achievements.
- `study-session`: guided study flow with focus mode, rating hints, session retention stats, and end-of-session celebration.
- `learning-path`: CEFR-level progression view with per-level progress bars and recommended-next lesson logic.
- `gamification`: streaks, badges, level completion tracking.
- `mastery-tracking`: per-card mastery state derived from SM-2 metrics; surfaces in catalogue, lesson detail, and study.
- `accessibility`: focus rings, ARIA, reduced-motion.

### Modified Capabilities

- `frontend-system-prompt`: must add Tailwind-only styling rule (replace legacy inline styles entirely).
- `backend-system-prompt`: review endpoints must return `repetitions` / `easeFactor` / `intervalDays` / `lapses` already do — but add `mastery` field and `lastRatings` history.

## Impact

- **Frontend** (`apps/learn`): new dashboard, learning-path, achievement components; Study page refactor; per-card mastery chip; new icons.
- **Backend** (`apps/api`): extend `DueCardView` with `mastery` and `lastRatings`; new `GET /api/v1/dashboard` endpoint; new `GET /api/v1/achievements`; new `GET /api/v1/learning-path`; streak field on `User`.
- **Schema**: add `currentStreak`, `bestStreak`, `lastReviewedAt` to `User`; add `Achievement` table for completed level badges; add `UserAchievement` join table.
- **Seed**: optional — add some initial achievements; not strictly required.
- **No new external dependencies**; everything uses existing Prisma, NestJS, Angular, Tailwind.
