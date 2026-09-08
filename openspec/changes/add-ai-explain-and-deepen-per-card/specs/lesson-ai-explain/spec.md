## ADDED Requirements

### Requirement: Explain endpoint contract
The system SHALL expose `POST /api/v1/lessons/:lessonId/cards/:cardId/explain` (authenticated) returning `{ summary: string, examples: string[], cached: boolean }`. The response MUST be derived from the card's `term`, the CEFR `level`, and the user-provided mode; nothing else from the card MAY influence the request sent to the AI provider.

#### Scenario: Authenticated owner of the lesson
- **WHEN** an authenticated user who owns or is enrolled in the lesson calls `POST /lessons/:lessonId/cards/:cardId/explain` with a card that belongs to the lesson
- **THEN** the response status is 200
- **AND** `summary` is non-empty
- **AND** `examples` contains between 1 and 3 strings, each ≤ 80 chars
- **AND** `cached` reflects whether the response was served from the AI cache or freshly generated

#### Scenario: Unauthenticated
- **WHEN** `POST /lessons/:lessonId/cards/:cardId/explain` is called without a valid Bearer token
- **THEN** the response status is 401 with the standard error envelope and `code: "UNAUTHORIZED"`

#### Scenario: Card does not belong to the lesson
- **WHEN** `cardId` is not attached to `lessonId` in the data store
- **THEN** the response status is 404 with `code: "CARD_NOT_IN_LESSON"`

#### Scenario: Foreign lesson
- **WHEN** the lesson is owned by another user and is not a catalog lesson
- **THEN** the response status is 404 with `code: "LESSON_NOT_FOUND"`

#### Scenario: Card id does not exist
- **WHEN** neither the card nor a matching lesson can be found
- **THEN** the response status is 404 with `code: "CARD_NOT_FOUND"`

### Requirement: Prompt privacy contract for explain
The system SHALL build the prompt for the explain endpoint from ONLY the card's `term`, the CEFR `level`, and the constant string `'explain'`. No other field (`definition`, `example`, `translation`, `explanationEs`, `audioKey`, lesson title) MAY appear in the prompt.

#### Scenario: Prompt contains only allowed fields
- **WHEN** the explain endpoint is invoked with a card that has `term = "deploy"`, `level = "A2"`, `definition = "desplegar"`, `example = "We deploy every Friday"`, `translation = "desplegar"`, `explanationEs = "verbo técnico"`
- **THEN** the rendered prompt contains the strings `"deploy"` and `"A2"` and the token `explain`
- **AND** the prompt does not contain `"desplegar"`, `"deploy every Friday"`, `"verbo técnico"`, or the lesson title

#### Scenario: Logged fields never include prompt content
- **WHEN** the explain endpoint logs a request
- **THEN** the log line contains `cardId`, `mode`, `level`, `promptHash`, `tokensUsed`, `cached`, `latencyMs`
- **AND** the log line does NOT contain the prompt text or the response text

### Requirement: Caching with deterministic key
The system SHALL cache the explain response keyed on `hash(lessonId:cardId:'explain':level)`. A cache hit MUST return the same body (including `cached: true`) without calling the AI provider. The TTL MUST be at least 12 hours and at most 24 hours and is configured via `AI_CACHE_TTL_MS`.

#### Scenario: First call hits the provider
- **WHEN** no cached response exists for the key
- **THEN** the AI provider is invoked once
- **AND** the response is stored under the key with the configured TTL
- **AND** the response body has `cached: false`

#### Scenario: Subsequent call within TTL
- **WHEN** the same key is requested again within the TTL window
- **THEN** the AI provider is not invoked
- **AND** the response body has `cached: true`
- **AND** the call does not consume a rate-limit token (the limiter is bypassed for cache hits)

#### Scenario: Expired entry
- **WHEN** the cache entry has been evicted or expired
- **THEN** the next request invokes the provider again and stores a fresh entry

### Requirement: Provider interface and MiniMax default implementation
The system SHALL define an `AiProvider` interface with at least `complete(prompt, options): Promise<{ text: string; tokensUsed: number }>`. The default implementation SHALL call a chat-completions HTTP endpoint at `AI_BASE_URL` with model `AI_MODEL`, an `Authorization: Bearer <AI_API_KEY>` header, `temperature: 0.4`, and a `max_tokens` cap per mode (256 for explain, 384 for deepen). The provider MUST be replaceable via a NestJS provider token without touching consumers.

#### Scenario: Replaceable provider
- **WHEN** a developer registers a different implementation of `AiProvider` in `AiModule.providers`
- **THEN** both endpoints (`explain` and `deepen`) use the new implementation transparently
- **AND** no controller or service file needs to change for the swap to take effect

#### Scenario: Provider failure
- **WHEN** the AI provider returns 5xx, times out (>10s), or returns malformed JSON
- **THEN** the response status is 502 with `code: "AI_PROVIDER_FAILED"`
- **AND** the cache is NOT populated (the next request retries)
