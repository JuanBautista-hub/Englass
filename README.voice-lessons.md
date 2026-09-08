# Engclass voice-lessons slice (feat/voice-lessons)

Minimum end-to-end slice on top of the Fase 1 (PDF annotation) repo:

- **`apps/api`** — NestJS + Prisma + PostgreSQL + JWT.
  - `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`
  - `GET / POST / PATCH / DELETE /api/v1/lessons` (auth required)
  - `POST /api/v1/tts` → `audio/wav` (mock sine-wave tone; placeholder for Polly/ElevenLabs)
  - `GET /api/v1/health`
- **`apps/learn`** — Angular 17 PWA with `@angular/service-worker`.
  - `/login` (sign in or create account)
  - `/lessons` (list + create)
  - `/lessons/:id` (play TTS via `<audio>`)

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
| TTS | Mock WAV generator (replaceable with AWS Polly / ElevenLabs) |

## Run it

```sh
# 1. Postgres
docker compose up -d postgres

# 2. Install (workspace)
pnpm install

# 3. Generate Prisma client + migrate
pnpm --filter @engclass/api prisma:generate
pnpm --filter @engclass/api exec prisma migrate dev --name init

# 4. Start API (http://localhost:3001/api/v1)
pnpm --filter @engclass/api start:dev

# 5. Start PWA (http://localhost:4201)
pnpm --filter @engclass/learn start
```

## Notes & next steps

- The TTS service ships a **mock sine-wave WAV** so the whole flow works end-to-end. Swap `TtsService.synthesizeMock` for an AWS Polly / ElevenLabs call returning the same `{ buffer, voice, durationMs }` shape.
- `@engclass/shared` is unused in this slice but is the right home for `AuthUser`, `Lesson`, `ErrorEnvelope` once we tighten the API contract.
- Out of scope for this PR: STT (Whisper), pronunciation scoring, OpenAI/Gemini evaluation, refresh tokens, role-based access, mobile (Compose/React Native).
