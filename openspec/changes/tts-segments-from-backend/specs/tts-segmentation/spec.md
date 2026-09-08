## ADDED Requirements

### Requirement: TTS segments endpoint
The system SHALL expose `GET /api/v1/cards/:cardId/tts-segments` (authenticated) returning a JSON array of `BilingualSegment`. Each `BilingualSegment` MUST have `text` (sanitized, ready for speech synthesis) and `lang` (`'en' | 'es'`). The endpoint MUST validate that the card belongs to a lesson owned by the authenticated user, returning `404` otherwise.

#### Scenario: Card with bilingual explanation
- **WHEN** an authenticated user calls `GET /cards/{cardId}/tts-segments` for a card whose `explanationEs` contains `"apple"` and `«manzana»`
- **THEN** the response is an array of segments alternating between ES and EN
- **AND** the EN segment contains the word `apple` with `lang: 'en'`
- **AND** the ES segments contain the rest with `lang: 'es'`
- **AND** no segment contains the marker characters (`"`, `'`, `«`, `»`, `→`, emojis)

#### Scenario: Card with no explanation
- **WHEN** the user calls the endpoint for a card with `explanationEs: null`
- **THEN** the response is `[]` (empty array), status `200`

#### Scenario: Card from another user's lesson
- **WHEN** the user calls the endpoint for a `cardId` whose lesson is owned by a different user
- **THEN** the response is `404` with the standard error envelope

### Requirement: Parser contract
The system SHALL implement `parseBilingual(text)` that splits `text` into segments using the markers `"…"`, `'…'`, and `«…»`. Text inside any marker MUST be tagged `lang: 'en'`; text outside MUST be tagged `lang: 'es'`. Empty segments MUST be dropped. The same function MUST be exported from one source file in the backend.

#### Scenario: Single English quote
- **WHEN** `parseBilingual('Hola "world" amigo')` is called
- **THEN** it returns 3 segments: `[{ text: 'Hola ', lang: 'es' }, { text: 'world', lang: 'en' }, { text: ' amigo', lang: 'es' }]`

#### Scenario: Spanish with «…»
- **WHEN** `parseBilingual('Se usa «a» antes de consonante.')` is called
- **THEN** it returns 2 segments: `[{ text: 'Se usa ', lang: 'es' }, { text: 'a', lang: 'en' }, { text: ' antes de consonante.', lang: 'es' }]`

#### Scenario: No markers
- **WHEN** `parseBilingual('Sólo español sin marcadores.')` is called
- **THEN** it returns 1 segment: `[{ text: 'Sólo español sin marcadores.', lang: 'es' }]`

### Requirement: Sanitizer contract
The system SHALL implement `sanitizeForTts(text)` that strips characters that the Web Speech API would otherwise speak literally: emoji (U+1F300–U+1FAFF, U+2600–U+27BF), `«`, `»`, replaces `→` with `' se convierte en '`, normalizes unicode dashes (`‐–―`) to `-`, and collapses whitespace. The same function MUST be exported from one source file in the backend.

#### Scenario: Emoji and brackets
- **WHEN** `sanitizeForTts('💡 usa «a» antes')` is called
- **THEN** the result has no emoji and no `«»`
- **AND** the word order and language are otherwise preserved

#### Scenario: Arrow replaced with words
- **WHEN** `sanitizeForTts('a → an')` is called
- **THEN** the result contains `se convierte en` instead of `→`

#### Scenario: Whitespace collapsed
- **WHEN** `sanitizeForTts('hola   mundo')` is called
- **THEN** the result contains a single space between words

### Requirement: Frontend consumes the endpoint
The frontend SHALL obtain bilingual segments exclusively from `GET /cards/:cardId/tts-segments`. The functions `parseBilingual` and `sanitizeForTts` SHALL NOT exist in the frontend codebase.

#### Scenario: No client-side parser
- **WHEN** the frontend is built
- **THEN** `grep -r "parseBilingual\|sanitizeForTts" apps/learn/src` returns no matches
- **AND** the only consumers of TTS segment data are pages that read from `TtsSegmentsService`

#### Scenario: Lesson detail playback
- **WHEN** the user clicks "🔊 EN+ES" on a card's explanation in `/lessons/:id`
- **THEN** the page fetches segments via `TtsSegmentsService.get(cardId)`
- **AND** iterates the segments, calling `TtsService.speakSegment(text, lang)` for each
- **AND** the playback order matches the order returned by the backend

### Requirement: Cache on the frontend
The `TtsSegmentsService` SHALL cache segments per `cardId` for the lifetime of the SPA session. Repeated requests for the same `cardId` MUST NOT trigger additional HTTP calls.

#### Scenario: Second request within the session
- **WHEN** the user re-opens the same card and triggers playback again
- **THEN** `TtsSegmentsService.get(cardId)` returns cached segments without firing an HTTP request
- **AND** the response is identical to the first call

#### Scenario: Different cards
- **WHEN** the user opens a second card and triggers playback
- **THEN** `TtsSegmentsService.get(otherCardId)` makes exactly one HTTP request for that card
- **AND** the second card's segments are cached independently