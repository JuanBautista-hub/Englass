## ADDED Requirements

### Requirement: Mastery labels come from the API; classes stay in the client
The frontend SHALL consume `GET /api/v1/mastery/labels` for the `label` strings. The frontend SHALL keep the mapping `mastery → badgeClass` (Tailwind class string) as a separate constant in the client because Tailwind classes are a presentation policy, not a domain fact.

#### Scenario: Server changes a label
- **WHEN** the backend updates `MASTERY_META` to set `mastered.label = "Conquered"`
- **THEN** the next `GET /mastery/labels` returns the new label
- **AND** the UI renders "Conquered" without a frontend code change

#### Scenario: Server adds a new mastery enum value
- **WHEN** a new mastery value `expert` is added and `MASTERY_META` includes `{ label, badgeClass }` for it
- **THEN** `GET /mastery/labels` returns the new key
- **AND** the frontend renders it without code changes
- **AND** the master's badge class is whatever the backend supplies under `badgeClass` (no client-side defaulting)

### Requirement: Frontend MUST NOT redeclare mastery labels locally
The frontend MUST NOT maintain a `FALLBACK_LABELS` array, a hardcoded `MASTERY_META`, or any other literal that duplicates label text coming from `GET /mastery/labels`.

#### Scenario: Fallback array deleted
- **WHEN** the developer deletes `FALLBACK_LABELS` from `apps/learn/src/app/core/services/mastery-labels.service.ts`
- **THEN** the only label source is the API
- **AND** no test references the deleted array

#### Scenario: Empty state on failure
- **WHEN** `GET /mastery/labels` fails and no cached response exists
- **THEN** the badge renders with a generic class (`bg-slate-100 text-slate-700`)
- **AND** no level-coded (i.e. amber/emerald) styling appears

## REMOVED Requirements

### Requirement: Frontend fallback for offline / cold start
**Reason**: A hardcoded fallback map for mastery labels duplicates the source of truth (`MASTERY_META` in `apps/api/src/labels/labels.constants.ts`) and contradicts the single-source-of-truth requirement.

**Migration**:
1. Delete the `FALLBACK_LABELS` constant in `apps/learn/src/app/core/services/mastery-labels.service.ts`.
2. Keep only the `MASTERY_BADGE_CLASS` mapping for visual styling in the client.
3. Update components to render the `label` from the API response and the `badgeClass` from the API (or the client constant if the API does not include it).
