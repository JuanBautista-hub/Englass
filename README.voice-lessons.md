# Engclass voice-lessons slice (feat/voice-lessons)

End-to-end slice on top of the Fase 1 (PDF annotation) repo.

## Roadmap phases

| Phase | Scope | Status |
|---|---|---|
| 1. Diseño de contenido y datos | Domain model, categories, flashcards, SM-2 SRS | **done (this commit)** |
| 2. Core backend & API | Auth, lessons, TTS, review endpoints, STT, scoring | partial (auth + lessons + TTS done; review endpoints pending) |
| 3. Frontend / UX | Flashcards UI, audio with one click, code/phrase completion | minimal (lesson list + TTS per card; full UI in step 3) |

## Domain model

```
User ───< Lesson >── Category (DevOps | Frontend | Backend | Cloud)
            │
            └──< VocabularyCard >── CardProgress (per user, SM-2 state)
                          │
                          └──< ReviewLog (immutable history)
```

### `apps/api/prisma/schema.prisma`

| Model | Purpose |
|---|---|
| `User` | Identity, auth credentials |
| `Category` | Technical vocabulary domain (`slug`, `name`, `description`, `iconKey`) |
| `Lesson` | Thematic lesson owned by a user, scoped to one category |
| `VocabularyCard` | Atomic flashcard (term, definition, example, translation, ordinal) |
| `CardProgress` | Per-user, per-card SRS state (ease, interval, reps, lapses, dueAt) |
| `ReviewLog` | Immutable review history for analytics & future algorithms |

### SRS — SuperMemo 2

`apps/api/src/srs/sm2.ts` is a pure, side-effect-free SM-2 implementation:

- `RATINGS = ['again', 'hard', 'good', 'easy']` (mapped to q = 0, 3, 4, 5)
- `initialSrsState()` → `{ easeFactor: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: now }`
- `sm2Next({ rating, state, now })` → next state (clamped `easeFactor ∈ [1.3, 4.0]`, fixed 1d/6d ramp, then `interval * ef`)
- On `q < 3`: `repetitions = 0`, `intervalDays = 1`, `lapses += 1`

Run the demo to verify the math:

```sh
pnpm --filter @engclass/api exec ts-node --transpile-only scripts/sm2.demo.ts
```

Expected output:

```
rating=good  ef=2.500 interval=1d  reps=1 lapses=0 due=2025-01-02
rating=good  ef=2.500 interval=6d  reps=2 lapses=0 due=2025-01-08
rating=good  ef=2.500 interval=15d reps=3 lapses=0 due=2025-01-23
rating=easy  ef=2.600 interval=38d reps=4 lapses=0 due=2025-03-02
rating=good  ef=2.600 interval=99d reps=5 lapses=0 due=2025-06-09
rating=again ef=1.800 interval=1d  reps=0 lapses=1 due=2025-06-10
rating=good  ef=1.800 interval=1d  reps=1 lapses=1 due=2025-06-11
```

`SrsService` (`src/srs/srs.service.ts`) wraps the pure algorithm with Prisma:

- `enrollUserInLesson(userId, lessonId)` — creates initial `CardProgress` rows (due now)
- `listDueForUser(userId, limit=20)` — due queue
- `applyReview(userId, cardId, rating)` — runs SM-2, persists new state, writes a `ReviewLog`

## API surface (auth required unless noted)

```
POST   /api/v1/auth/signup                       # public
POST   /api/v1/auth/login                        # public
GET    /api/v1/health                            # public
GET    /api/v1/categories
POST   /api/v1/lessons
GET    /api/v1/lessons
GET    /api/v1/lessons/:id
PATCH  /api/v1/lessons/:id
DELETE /api/v1/lessons/:id
GET    /api/v1/lessons/:id/cards
POST   /api/v1/lessons/:id/cards
POST   /api/v1/tts                               # body: { text } → audio/wav
```

## Stack

| Concern | Choice |
|---|---|
| Backend framework | NestJS 10 (Express adapter) |
| ORM | Prisma 5 |
| DB | PostgreSQL 16 |
| Auth | JWT (HS256) via `@nestjs/jwt` + `passport-jwt` |
| Password hashing | bcryptjs (cost 12) |
| Frontend | Angular 17 (standalone, signals) |
| PWA | `@angular/service-worker` + `ngsw-config.json` |
| TTS | Mock sine-wave WAV (replaceable with AWS Polly / ElevenLabs) |

## Run it

```sh
docker compose up -d postgres
pnpm install
pnpm --filter @engclass/api exec prisma migrate dev --name init
pnpm --filter @engclass/api exec prisma db seed
pnpm --filter @engclass/api start:dev           # :3001
pnpm --filter @engclass/learn start              # :4201
```

The seed inserts 4 categories (DevOps, Frontend, Backend, Cloud), one lesson per
category, and three vocabulary cards per lesson.

## Next steps (Phase 2 → Phase 3)

1. `GET /api/v1/review/due` + `POST /api/v1/review/:cardId` (rating) — wire SrsService to HTTP.
2. Replace `TtsService.synthesizeMock` with AWS Polly / ElevenLabs keeping `{ buffer, voice, durationMs }`.
3. STT (Whisper) and OpenAI/Gemini-based scoring for attempts.
4. Flashcard UI: card flip, four-button rating (`again/hard/good/easy`), session stats.
5. Move shared types (`AuthUser`, `Category`, `Lesson`, `VocabularyCard`, `CardProgress`, `Rating`) into `@engclass/shared`.

