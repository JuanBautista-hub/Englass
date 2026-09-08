## ADDED Requirements

### Requirement: Frontend MUST NOT redeclare the CEFR catalog locally
The frontend SHALL consume `GET /api/v1/cefr/levels` exclusively as the source of truth for the CEFR catalog (code, order, label, description). The frontend MUST NOT maintain a parallel `FALLBACK_LEVELS` array, a hardcoded `LEVEL_META` constant, or any other literal that duplicates the data served by the backend.

#### Scenario: Frontend drops the fallback array
- **WHEN** the developer deletes `FALLBACK_LEVELS` from `apps/learn/src/app/core/services/cefr.service.ts`
- **THEN** the only CEFR catalog source in the build is the response of `GET /cefr/levels`
- **AND** no test references the deleted array

#### Scenario: Network failure path
- **WHEN** `GET /cefr/levels` fails (network or 5xx) and no cached response exists
- **THEN** the level picker renders an empty state with a retry button
- **AND** the user-facing message does not mention "A1" or any other level
- **AND** the components do not fall back to a hardcoded literal

### Requirement: Last-known-good cache for offline rendering (optional)
The frontend MAY keep an LRU cache (in-memory or `localStorage`) of the most recent successful `/cefr/levels` response to survive transient network errors. The cache MUST be populated only from real API responses and MUST be invalidated on `Cache-Control: no-cache` responses or when the response shape changes.

#### Scenario: Cache populated from API
- **WHEN** `GET /cefr/levels` returns 200 with the 6-entry list
- **THEN** the response is stored in the cache
- **AND** a subsequent navigation reads from the cache instead of the network if offline

#### Scenario: Cache not used during a session with network
- **WHEN** the app has network and the cache holds stale data
- **THEN** the network response wins
- **AND** the cache is updated

## REMOVED Requirements

### Requirement: Frontend fallback for offline / cold start
**Reason**: A hardcoded fallback array duplicates the source of truth (`LEVEL_META` in `apps/api/src/labels/labels.constants.ts`) and contradicts the single-source-of-truth requirement. The fallback is replaced by an LRU cache of real responses.

**Migration**:
1. Delete the `FALLBACK_LEVELS` constant in `apps/learn/src/app/core/services/cefr.service.ts`.
2. Update components to show an empty state with a retry CTA if `/cefr/levels` fails and no cache exists.
3. (Optional) Add a small `CacheService` that stores the last successful response in `localStorage` and serves it on subsequent boot if `/cefr/levels` fails.
