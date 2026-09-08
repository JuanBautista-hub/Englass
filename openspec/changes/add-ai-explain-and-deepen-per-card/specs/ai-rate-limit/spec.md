## ADDED Requirements

### Requirement: Per-user rate limiting on AI endpoints
The system SHALL apply a per-user, per-IP rate limit to both `POST /lessons/:lessonId/cards/:cardId/explain` and `POST /.../deepen`. The default limits are 5 requests per minute and 60 requests per day. Limits are configured via `AI_RATE_PER_MINUTE` and `AI_RATE_PER_DAY`. The key MUST be `ai:u:<userId>:<mode>` where `mode` is `explain` or `deepen` so each mode has its own bucket (a user can spend 5/min on explain AND 5/min on deepen simultaneously).

#### Scenario: Below the per-minute limit
- **WHEN** the user has made 4 successful explain calls in the current minute
- **THEN** the 5th call succeeds with 200
- **AND** the rate-limit bucket increments

#### Scenario: Exceeding the per-minute limit
- **WHEN** the user has made 5 successful explain calls in the current minute
- **THEN** the 6th call returns 429 with `code: "RATE_LIMITED"`
- **AND** the response includes `Retry-After` header (in seconds) and the shared error envelope

#### Scenario: Per-day limit
- **WHEN** the user has made 60 successful calls across all AI endpoints in the last 24h
- **THEN** the next call returns 429 with `code: "RATE_LIMITED"`
- **AND** `Retry-After` is set to the seconds until the oldest counted call exits the rolling window

#### Scenario: Independent buckets per mode
- **WHEN** the user has hit the explain limit but not the deepen limit
- **THEN** a deepen call returns 200
- **AND** vice versa

### Requirement: Cache hits bypass the rate limiter
A request that is served entirely from the AI cache (no provider call) MUST NOT consume a rate-limit token. The limit applies only to provider-side work.

#### Scenario: Cached response
- **WHEN** the response was served from cache (`cached: true`)
- **THEN** the rate-limit bucket does not increment
- **AND** the response status is 200

### Requirement: Rate-limit state is per-instance
The rate-limit state is held in memory per process. It is acceptable to lose state on process restart; the limiter is a guardrail, not the billing source. The design MUST NOT depend on external state stores (Redis, etc.).

#### Scenario: Process restart clears buckets
- **WHEN** the API process restarts
- **THEN** the rate-limit buckets are reset
- **AND** users can immediately make calls up to the limit again

### Requirement: Logged fields cover rate-limit decisions
The system MUST log every AI request with at least `userId`, `mode`, `cardId`, `level`, `cached`, `tokensUsed`, `latencyMs`, and (when 429 is returned) the bucket that triggered it (`perMinute` or `perDay`).

#### Scenario: Allowed call logged
- **WHEN** an AI call returns 200 or 502
- **THEN** a single log line contains the fields above (except the bucket trigger)
- **AND** neither the prompt body nor the response body appear in the log

#### Scenario: Throttled call logged
- **WHEN** an AI call returns 429
- **THEN** a single log line contains the fields above plus the bucket trigger and the `Retry-After` value
