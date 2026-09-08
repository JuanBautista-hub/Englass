## 1. Shared types (packages/shared)

- [x] 1.1 Add `AiExplainResponse`, `AiDeepenResponse`, `AiMode`, `AiErrorCode` in `packages/shared/src/ai.ts`; re-export from `packages/shared/src/index.ts`.
- [x] 1.2 Run `pnpm -F @engclass/shared build` so backend and frontend pick up the new types.

## 2. Backend — Config and provider

- [x] 2.1 Extend `apps/api/src/common/config.ts` with `aiBaseUrl`, `aiApiKey`, `aiModel`, `aiCacheTtlMs`, `aiRatePerMinute`, `aiRatePerDay`, `aiEnabled`. Read each from `ConfigService` (env-driven) with safe defaults.
- [x] 2.2 Create `apps/api/src/ai/ai-provider.interface.ts` exporting the `AiProvider` interface (NestJS injection token).
- [x] 2.3 Create `apps/api/src/ai/minimax.provider.ts` with `MiniMaxProvider implements AiProvider` using Node 20+ global `fetch`. Send `Authorization: Bearer AI_API_KEY`, body `messages: [{role:'system',...}, {role:'user',...}]`, `temperature: 0.4`, `max_tokens: 256 | 384`, `model: AI_MODEL`. Return `{ text, tokensUsed }`. Map 5xx / timeout (10 s) / malformed JSON to a thrown `AiProviderFailedError`.
- [x] 2.4 Create `apps/api/src/ai/ai-cache.store.ts` with `get<T>(key): T | null | Promise<T | null>`, `set<T>(key, value, ttlMs)`, `clear()`. Backed by `Map` + `Date.now()` checks. Key helper `aiCacheKey(lessonId, cardId, mode, level)` returns `sha256(...)`.
- [x] 2.5 Create `apps/api/src/ai/ai-rate-limit.store.ts` with `consume(userId, mode): { allowed, retryAfterSec, triggered: 'perMinute' | 'perDay' | null }`. Two windows (minute bucket + day bucket) per `(userId, mode)`.
- [x] 2.6 Create `apps/api/src/ai/prompts.ts` with pure functions `buildExplainPrompt({ term, level })` and `buildDeepenPrompt({ term, level })` returning `{ system, user }`. Tested in 3.x to assert the user string contains only `term`, `level`, and the token `explain` or `deepen`.
- [x] 2.7 Create `apps/api/src/ai/ai.service.ts` orchestrating the flow: resolve card → build prompt → check cache → on miss hit rate-limit → call provider → validate JSON shape → cache → return. Map response into `AiExplainResponse` / `AiDeepenResponse`.
- [x] 2.8 Create `apps/api/src/ai/ai.module.ts` exporting `AiService`, `MiniMaxProvider`, `AiCacheStore`, `AiRateLimitStore`. Import `ConfigDefaultsModule`. Provide `AI_PROVIDER` token bound to `MiniMaxProvider` by default.
- [x] 2.9 Wire `AiModule` into `apps/api/src/lessons/lessons.module.ts` (or import at `AppModule` if it should be global).

## 3. Backend — Controller endpoints

- [x] 3.1 Create `apps/api/src/ai/dto/explain.dto.ts` and `deepen.dto.ts` (empty bodies; nothing extra needed from the client — `cardId` and `mode` come from path).
- [x] 3.2 Create `apps/api/src/ai/ai.controller.ts` with two `@Post('lessons/:lessonId/cards/:cardId/explain'|'deepen')` endpoints, `@UseGuards(JwtAuthGuard)`. Inject `AiService`. Set `Cache-Control: private, no-store`. Return `AiExplainResponse` / `AiDeepenResponse`. Translate exceptions:
  - `CardNotFoundError` → 404 with `code: "CARD_NOT_FOUND"`.
  - `CardNotInLessonError` → 404 with `code: "CARD_NOT_IN_LESSON"`.
  - `LessonNotFoundError` → 404 with `code: "LESSON_NOT_FOUND"`.
  - `AiRateLimitedError` → 429 with `code: "RATE_LIMITED"`, `Retry-After` header, `details: { bucket: 'perMinute' | 'perDay' }`.
  - `AiProviderFailedError` → 502 with `code: "AI_PROVIDER_FAILED"`.
- [x] 3.3 Add a structured-logger call inside `AiService` that emits `{ userId, mode, cardId, level, cached, tokensUsed, latencyMs }` per call (no prompt text, no response text). For 429, also include `bucket` and `retryAfterSec`.
- [x] 3.4 Make sure `AiModule` is wired into `AppModule` so the controller boots with the app.

## 4. Backend — Tests

- [x] 4.1 `apps/api/src/ai/prompts.spec.ts` — assert `buildExplainPrompt({term:'deploy', level:'A2'})` does NOT contain the literal strings used in the privacy-contract scenario; assert it DOES contain `term` and `level`. Same for deepen.
- [x] 4.2 `apps/api/src/ai/ai-cache.store.spec.ts` — write/read/expire/clear; confirm TTL boundary behaviour with fake timers.
- [x] 4.3 `apps/api/src/ai/ai-rate-limit.store.spec.ts` — minutes/days windows; per-mode independence; allow-after-block.
- [x] 4.4 `apps/api/src/ai/ai.controller.spec.ts` — mock `AiService`, verify:
  - `POST /explain` returns 200 with body (`summary`, `examples`, `cached: false`) when service resolves.
  - `POST /deepen` returns 200 with body (`context`, `collocations`, `falseFriends`, `level`, `cached`).
  - `AiRateLimitedError` → 429 with `Retry-After` and `details.bucket`.
  - `AiProviderFailedError` → 502 with `AI_PROVIDER_FAILED`.
  - `CardNotFoundError` → 404 with `CARD_NOT_FOUND`.
- [x] 4.5 `apps/api/src/ai/ai.service.spec.ts` — happy path (cache miss → provider → cache store), cache hit (provider not called, `cached:true` returned), provider failure (502 path), rate-limit block (provider not called).
- [x] 4.6 `apps/api/src/ai/minimax.provider.spec.ts` — mock global `fetch`. Assert URL, headers, body shape (`messages`, `temperature`, `max_tokens` 256 vs 384). Assert 5xx and timeout throw `AiProviderFailedError`.
- [x] 4.7 Run `pnpm -F api lint` and `pnpm -F api test`. All green.

## 5. Frontend — Service and types

- [x] 5.1 Add `apps/learn/src/app/core/services/ai.service.ts` with `explain(lessonId, cardId)` and `deepen(lessonId, cardId)`, both returning `Promise<AiExplainResponse | AiDeepenResponse>`. Use `firstValueFrom` + `HttpClient` against `${environment.apiBaseUrl}/lessons/${lessonId}/cards/${cardId}/explain|deepen`.
- [x] 5.2 Surface the per-card badge state via signals: add `aiCallCount$` (or a `Map<string, number>` signal) updated after each successful call, so the UI can show "called 1×".
- [x] 5.3 Update `apps/learn/src/environments/environment*.ts` with `aiEnabled` feature flag (default `false` in dev to gate rollout). No behavior change when `false`.

## 6. Frontend — UI integration

- [x] 6.1 In `apps/learn/src/app/features/lessons/lesson-detail.page.ts`, add a single `<button>` pair per card inside its `<article>`:
  - "💡 Explicar" → calls `ai.explain(l.id, c.id)` and opens the modal in `explain` mode.
  - "🧠 Profundizar" → calls `ai.deepen(l.id, c.id)` and opens the modal in `deepen` mode.
- [x] 6.2 Add a modal/sheet component (`AiResponseModal`) with three states: loading skeleton (3 dots), success (renders summary + examples OR context + collocations + falseFriends), error (`Retry` button + the rate-limit message "Has alcanzado el límite de hoy. Vuelve más tarde.").
- [x] 6.3 Bind the modal open/close to local signals. The current card id + mode drive the rendering.
- [x] 6.4 Add a tiny badge "AI · 1×" next to the buttons if `aiCallCount$` is > 0 for that card; reset the badge on page reload.
- [x] 6.5 When `aiEnabled` is `false` in environment, hide both buttons globally (no router, no API call).

## 7. Frontend — Tests

- [x] 7.1 `ai.service.spec.ts` — verifies the URL pattern and that 429 throws a typed `RateLimitedError` while 5xx throws a typed `ProviderError`. Mock `HttpClient`.
- [x] 7.2 `lesson-detail.page.spec.ts` (extend existing) — assert the AI buttons are hidden when `aiEnabled = false`; render skeleton after click; render the response body on success; render the error UI on 429.
- [x] 7.3 Run `pnpm -F learn lint` and `pnpm -F learn test`. All green.

## 8. Documentation, observability, and rollout

- [ ] 8.1 Update `backend-prompt.md` "Reglas no negociables" section with the AI privacy contract, provider abstraction, rate-limit rules, and the "never log prompt content" rule.
- [ ] 8.2 Update `front-prompt.md` with the UI pattern (skeleton → result → retry on error) and the per-card "AI · N×" badge convention.
- [ ] 8.3 Add `apps/api/CHANGELOG.md` entry under a new heading `## [Unreleased] — add-ai-explain-and-deepen-per-card`. Document the two endpoints, the privacy contract, the rate limits, the error codes, and the rollout flag.
- [ ] 8.4 Verify metrics: confirm `apps/api` log fields (`userId`, `mode`, `cardId`, `level`, `cached`, `tokensUsed`, `latencyMs`) appear in stdout. Add a one-paragraph note on how to wire them to the chosen metrics backend (out of scope: actual exporter).
- [ ] 8.5 Document the `Retry-After` semantics for clients: integer seconds until the next token is available. The frontend already maps `RATE_LIMITED` to a Spanish message; ensure it respects the header.

## 9. Rollout safety

- [ ] 9.1 Default `AI_ENABLED=false` in production env for the first deploy; enable in dev/staging for one week; ship a second deploy with `AI_ENABLED=true` only if metrics stay green.
- [ ] 9.2 Add a "kill switch" in `apps/api/src/ai/ai.module.ts`: if `AI_ENABLED` is `false`, the controller responds 503 (no provider call). The frontend hides buttons when env flag is off.
- [ ] 9.3 Run the full lint + test suites across both apps before tagging this change as ready to archive.
