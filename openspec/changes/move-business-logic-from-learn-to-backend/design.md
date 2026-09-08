## Context

The Englass frontend (`apps/learn`, Angular 17, standalone components, signals) currently decides ownership, session termination, and retention from raw backend fields and URL query params. The backend (`apps/api`, NestJS, Prisma+Postgres) already has the authoritative state (SRS progress, enrollment rows, lesson ownership, daily goal constants) but exposes only the minimum surface needed to render responses. The exploration documented in the change `proposal.md` enumerates 12 concrete cases of duplicated or client-inferred logic. The most critical are: (a) catalog detection via `?source=catalog` in `lesson-detail.page.ts`, (b) client-side rewriting of the SRS DueCard after a rate, (c) client-side calculation of session summary metrics (`retentionPct`, `longestIntervalDays`, `byRating`), (d) the `allDue(1)` redirect to pick a lesson to study, and (e) duplicated CEFR and mastery constants.

This change is the first step toward a single source of truth for those values. It does not change transport (still JWT in `localStorage`), nor does it migrate TTS voice picking (browser-only). It does add a `/auth/me` endpoint so the app can validate cached sessions before trusting them.

## Goals / Non-Goals

**Goals:**
- Move ownership and catalog detection to `GET /lessons/:id` as computed flags (`isCatalog`, `isOwned`, `canEdit`, `canEnroll`, `alreadyEnrolled`).
- Stop the client from rewriting the SRS `DueCard` after a rating: `POST /review/cards/:cardId` returns the authoritative updated `DueCard` and a `sessionDone` signal.
- Expose `POST /review/sessions/end` returning a `StudySessionSummary` so the client no longer recomputes `retentionPct`, `byRating`, or `longestIntervalDays`.
- Expose `GET /auth/me` so the client boot path validates the cached JWT against the server before resolving `AuthGuard`.
- Drive the "Start review" CTA from `dashboard.nextLesson.lessonId` instead of `allDue(1)`.
- Delete duplicated CEFR and mastery constants from the frontend; consume `/cefr/levels` and `/mastery/labels` only.
- Document the constraint in the backend and frontend system prompts so future work keeps the same boundary.

**Non-Goals:**
- Migrate from JWT in `localStorage` to httpOnly cookies (later change; `backend-system-prompt` already mandates cookies but rollout is separate).
- Move TTS voice selection or `SpeechSynthesis` rate/lang to the server (still client-only).
- Add rate-limit auth on the new `/auth/me` endpoint (uses the same `JwtAuthGuard`).
- Modify SRS internals (`SrsService.applyReview`) — only its return shape.
- Change any Prisma schema; the flags are computed in service code, not stored.

## Decisions

### Decision 1: Compute permission flags in `LessonsService` and shape them into a `LessonView`
The five flags `isCatalog`, `isOwned`, `canEdit`, `canEnroll`, `alreadyEnrolled` are computed in `findOne` and `findOneAsCatalog` based on the existing model fields (`ownerId`, `sourceLessonId`) and the authenticated user. The current `findOne` returns 404 when the lesson is not owned; we will extend it to return 200 with `isOwned: false` for catalog lessons, and keep 404 for other users' lessons.

Rationale: a single endpoint per lesson reduces client coupling and removes the `?source=catalog` path. The 404 stays for non-catalog foreign lessons because that is a privacy boundary.

Alternatives considered:
- Add `GET /lessons/:id/permissions` as a separate endpoint. Rejected: would double network round-trips for the same info.
- Use an enum (`access: 'owned' | 'catalog-enrolled' | 'catalog-preview' | 'forbidden'`). Rejected: flags are easier for clients to wire to template conditions and easier to add to without breaking the response shape.

### Decision 2: Drop `GET /lessons/catalog/:id` but keep it during a deprecation window
The frontend will call `GET /lessons/:id` and read the flags. The catalog variant is removed at the end of the window with a `Sunset` header pointing clients to the unified endpoint.

Rationale: avoids big-bang rewrites; lets the frontend migrate incrementally; supports the "single GET per lesson" goal.

### Decision 3: Include `updatedCard` and `sessionDone` in `applyReview` response, not as a separate endpoint
Adding fields to the existing response is cheaper than a new endpoint and avoids a race where the client could call `/sessions/end` mid-rating. `sessionDone` is computed from `SrsService.listDueForUser(userId)` length checked before and after the rate.

Rationale: lets the client stay reactive; preserves the SRS transaction boundary.

### Decision 4: New endpoint `POST /review/sessions/end` instead of inlining the summary in `applyReview`
`/sessions/end` is called when the session UI ends (user taps "Finish" or navigates away), not on every rating. This avoids bloating the response of every rating with session aggregates that the UI doesn't need mid-session.

Rationale: clear separation between "advance card" and "summarize session"; allows future analytics use.

Alternatives considered:
- Inline the summary on every rating. Rejected: response size grows and the summary's `streakBefore` would have to be stashed somewhere.
- Compute the summary client-side. Rejected: this is the change being made; the formula must live in `SrsService`.

### Decision 5: `GET /auth/me` is cacheable with `Cache-Control: private, max-age=60`
The endpoint returns a per-user payload and must not be cached by intermediaries (`private`). The 60-second TTL matches typical boot/readiness checks and survives aggressive refreshes without thrashing the DB.

Rationale: minimal server cost; the client needs this on every app boot but does not need it to reflect a write within the same second.

Alternatives considered:
- Add `If-None-Match: <user-etag>` for true zero-data refresh. Rejected: increases scope to include a user-version field; not in the goals.

### Decision 6: Frontend boot path: token present → `/auth/me` → render; token absent → `/login`
The `AuthGuard` keeps its current synchronous read from `localStorage` so the route resolves without a flicker. A new `SessionBootstrapService` runs alongside the guard: when a token exists, it fires `GET /auth/me` and either sets `currentUser` or clears storage. The route renders behind the guard; the `currentUser` signal hydrates inside the protected shell.

Rationale: respects the existing UX (no flash of login screen for valid cached sessions) without trusting the cached token.

### Decision 7: Delete `FALLBACK_LEVELS` and `FALLBACK_LABELS`; replace with last-known-good cache
Both services used a hardcoded constant for offline rendering. The new behavior:
- On successful API call, store the response in a small `CacheService` (memory + `localStorage` keyed `engclass.learn.cache.cefLevels` and `…masteryLabels`).
- On failure, render an empty state with a retry CTA. The badge class for mastery fallback is a generic slate, not a level-coded one.

Rationale: the fallback duplicates the source of truth. A cache of real responses preserves the "works offline" UX without lying to the client.

### Decision 8: Drive "Start review" from `dashboard.nextLesson`, not `allDue(1)`
`dashboard.nextLesson` is computed by `DashboardService.pickNextLesson(userId)` with full context (current level, due counts, achievements). Using it removes the round-trip to `GET /review/due` and the heuristic the client ran on the result.

Rationale: server has more context than the client; client no longer needs the heuristic.

### Decision 9: Move `LAST_RATINGS_LIMIT = 5` to a single export and let the client consume the trimmed array
Today the constant exists in `apps/api/src/review/review.service.ts:48` and is hardcoded a second time in `apps/learn/src/app/features/study/study.page.ts:456`. After this change, the server trims the array before returning it (`lastRatings: rating[]` will have at most 5 entries), and the client's `slice(0,4) + unshift` is removed entirely.

Rationale: removes duplicated policy.

### Decision 10: Backend exports `package/shared` types for the new fields
The `LessonView`, `StudySessionSummary`, and `MeView` types live in `packages/shared/src/`. The backend imports them in DTOs/services; the frontend imports them in its `LessonsService`, `ReviewService`, and `AuthService`.

Rationale: keeps the contract single-source-of-truth across the workspace, matching the existing pattern (`Annotation`, `SubmitDto`).

## Risks / Trade-offs

- **Risk: 200 instead of 404 for catalog foreign lessons**. The frontend currently treats 404 as "lesson doesn't exist for you". If a page assumes 404 means the lesson is gone, it will now render an "Add to my lessons" CTA instead. → Mitigation: add an e2e test covering all four states (`owned`, `catalog-enrolled`, `catalog-preview`, `foreign-not-catalog`). Frontend migration: any 404 handler maps to the foreign case explicitly.

- **Risk: `sessionDone` signal diverges if the user studies in two tabs**. Two tabs rating cards independently will each see `sessionDone: false` until each tab rates its last card, at which point one tab will receive `sessionDone: true` correctly. → Mitigation: documented as expected behavior; the summary endpoint is idempotent.

- **Risk: dropping `FALLBACK_LEVELS` introduces a render gap on first paint**. The first request to `/cefr/levels` after a cold start takes a round-trip before the level picker renders. → Mitigation: implement the last-known-good cache so subsequent boots (with the same user) skip the network call. The first ever boot shows a skeleton.

- **Risk: `GET /auth/me` adds a network call to every app boot**. → Mitigation: cacheable `private, max-age=60`; an in-flight boot + a navigation race has at most 60s of stale identity, which is acceptable.

- **Risk: logout is not enforced server-side**. The current JWT cannot be revoked. → Mitigation: add `POST /auth/logout` to clear any per-user state (rate-limit buckets). True revocation needs a token-blocklist, out of scope here.

- **Risk: removing the client-side `slice(0,4) + unshift` could regress visible UX** if the server, for some bug, returns more than 5 entries. → Mitigation: a defensive client-side cap of 5 is acceptable here because it's a UX render limit, not a domain rule. (Documented as the one exception to "no client caps".)

- **Trade-off: the auth-self-check change still relies on `localStorage`**. A future change will move to cookies; this is not in scope.

- **Trade-off: the `/me` 401 handler clears storage but does not batch-redirect**. Each protected route must handle the redirect independently.

## Migration Plan

1. **Backend first** (deployable, non-breaking for clients not consuming flags yet):
   - Ship the new fields in `LessonView`, `applyReview` response, `/me`, `/logout`, and `/review/sessions/end`.
   - Keep `GET /lessons/catalog/:id` with a `Sunset` header. Keep old response shape for that path.
2. **Frontend migration** (gated on backend):
   - Wire the new fields. Delete the `?source=catalog` path. Replace `allDue(1)` with `dashboard.nextLesson`.
   - Replace `FALLBACK_LEVELS` / `FALLBACK_LABELS` with the cache-or-empty strategy.
   - Replace local SRS rewriting with the server-returned `updatedCard`.
3. **Cleanup**:
   - Remove `GET /lessons/catalog/:id` once telemetry shows no client traffic.
   - Run `npm run lint` and `npm test` in `apps/api` and `apps/learn`.
   - Update `backend-prompt.md` and `front-prompt.md` to reference the new boundary.

Rollback strategy:
- The new endpoints are additive. Removing them returns the system to its prior behavior; the frontend reverts cleanly via git.
- The flag changes in `GET /lessons/:id` are **breaking**. If the frontend is rolled back, the server must revert the same commit to avoid 200s where 404s are expected. Tag the change with a feature flag (`LESSONS_VIEW_FLAGS_ENABLED`, default off per environment) so production can roll forward.

## Open Questions

- **Q1**: Should the new fields live as nested (`flags: { isCatalog, isOwned, ... }`) or flat?  Flat is friendlier to templates and current response keys. We chose flat; confirm with backend review.
- **Q2**: When `sessionDone` is `true`, should we still call `/sessions/end` for the summary, or do we get it inlined on the last rate? We chose to keep them separate. Confirm with review.
- **Q3**: Do we want a `User-Agent`-aware `Cache-Control: no-store` for `/auth/me`, or is `private, max-age=60` sufficient? Default to the latter; revisit if bot traffic is a concern.
- **Q4**: Does `POST /auth/logout` need to also revoke the token (blocklist), or is "clear per-user state" enough for this scope? Default to "clear per-user state only"; raise the blocklist change in a separate proposal.
