## ADDED Requirements

### Requirement: Deepen endpoint contract
The system SHALL expose `POST /api/v1/lessons/:lessonId/cards/:cardId/deepen` (authenticated) returning `{ context: string, collocations: string[], falseFriends: string[], level: 'A1'|'A2'|'B1'|'B2'|'C1'|'C2', cached: boolean }`. The response MUST be derived from the card's `term`, the CEFR `level`, and the constant string `'deepen'`; nothing else from the card MAY influence the AI request.

#### Scenario: Authenticated user, owned lesson, card present
- **WHEN** the user is enrolled or owns the lesson and the card belongs to the lesson
- **THEN** the response status is 200
- **AND** `context` is non-empty (≤ 200 words)
- **AND** `collocations` contains 0 to 5 short phrases
- **AND** `falseFriends` contains 0 to 3 entries (may be empty when none exist)
- **AND** `level` is one of the six CEFR codes
- **AND** `cached` reflects the source

#### Scenario: Same 401 / 404 / 502 paths as explain
- **WHEN** the request is unauthenticated, the card does not exist or does not belong, or the provider fails
- **THEN** the system returns the same status codes and codes as the explain endpoint (`UNAUTHORIZED`, `CARD_NOT_IN_LESSON`, `LESSON_NOT_FOUND`, `CARD_NOT_FOUND`, `AI_PROVIDER_FAILED`)

### Requirement: Prompt privacy contract for deepen
The system SHALL build the prompt for the deepen endpoint from ONLY the card's `term`, the CEFR `level`, and the constant string `'deepen'`. The prompt MAY ask the model to respond in the target language implied by the CEFR level (Spanish for A1/A2 learners, English for B1+), but it MUST NOT include `definition`, `example`, `translation`, `explanationEs`, or any free-form user-authored content.

#### Scenario: Prompt contains only allowed fields
- **WHEN** the deepen endpoint is invoked with a card whose `term = "sensible"` and `level = "B1"`
- **THEN** the rendered prompt contains `"sensible"`, `"B1"`, and the token `deepen`
- **AND** it does NOT contain the card's `definition`, `example`, or `explanationEs`

### Requirement: Caching with deterministic key
The system SHALL cache the deepen response keyed on `hash(lessonId:cardId:'deepen':level)`. TTL is shared with explain (`AI_CACHE_TTL_MS`).

#### Scenario: Cache hit
- **WHEN** a previously stored response exists for the key within TTL
- **THEN** the provider is not called
- **AND** the response includes `cached: true`
- **AND** the call does not consume a rate-limit token

#### Scenario: Provider call on miss
- **WHEN** no cached response exists for the key
- **THEN** the provider is invoked once
- **AND** the response is stored
- **AND** `cached` is `false`

### Requirement: Deepen uses a different `max_tokens` budget
The deepen endpoint SHALL use a larger `max_tokens` budget than explain (384 vs 256). The provider request MUST set `max_tokens: 384` regardless of how the user manipulates the request.

#### Scenario: Provider request budget
- **WHEN** the deepen endpoint invokes the provider
- **THEN** the outgoing HTTP body contains `max_tokens: 384`
- **AND** the explain endpoint's body contains `max_tokens: 256`

### Requirement: Response shape stability
The deepen response MUST return the same key set every time (`context`, `collocations`, `falseFriends`, `level`, `cached`) so the frontend can iterate without conditional rendering.

#### Scenario: All keys present
- **WHEN** the deepen endpoint returns 200
- **THEN** the body is a JSON object with exactly the five keys above
- **AND** `collocations` and `falseFriends` are arrays (never null)
