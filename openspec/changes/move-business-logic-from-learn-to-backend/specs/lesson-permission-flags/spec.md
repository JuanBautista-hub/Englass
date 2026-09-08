## ADDED Requirements

### Requirement: Lesson view exposes computed permission flags
The system SHALL compute five boolean flags in `GET /api/v1/lessons/:id` and `GET /api/v1/lessons/catalog/:id` and include them in the JSON response. The flags are `isCatalog`, `isOwned`, `canEdit`, `canEnroll`, and `alreadyEnrolled`. The computation MUST be based on the authenticated user (from `JwtAuthGuard`), the lesson's `ownerId`, and `sourceLessonId`. The `SYSTEM_USER_ID` constant in `apps/api/src/common/constants.ts` is the only place where "catalog" is defined; no flag SHALL be derived from any request query parameter.

#### Scenario: Catalog lesson, current user not enrolled
- **WHEN** an authenticated user requests `GET /lessons/catalog/:id` for a catalog lesson (`ownerId === SYSTEM_USER_ID`) and no clone exists for the user (`Lesson.sourceLessonId === id && ownerId === userId`)
- **THEN** the response status is 200
- **AND** `isCatalog` equals `true`
- **AND** `isOwned` equals `false`
- **AND** `canEnroll` equals `true`
- **AND** `canEdit` equals `false`
- **AND** `alreadyEnrolled` equals `false`

#### Scenario: Catalog lesson, current user already enrolled
- **WHEN** the user requests the same catalog lesson and a clone exists (`Lesson.ownerId === userId && Lesson.sourceLessonId === id`)
- **THEN** the response is 200
- **AND** `isCatalog` equals `true`
- **AND** `isOwned` equals `true`
- **AND** `canEnroll` equals `false`
- **AND** `canEdit` equals `true`
- **AND** `alreadyEnrolled` equals `true`

#### Scenario: Lesson owned by the current user
- **WHEN** the user requests a lesson where `Lesson.ownerId === userId` and `Lesson.sourceLessonId IS NULL`
- **THEN** `isCatalog` equals `false`, `isOwned` equals `true`, `canEdit` equals `true`, `canEnroll` equals `false`, `alreadyEnrolled` equals `false`

#### Scenario: Lesson owned by a different user
- **WHEN** the user requests a lesson where `Lesson.ownerId !== userId` and `Lesson.ownerId !== SYSTEM_USER_ID`
- **THEN** the response status is 404
- **AND** no flag is included in the response body

#### Scenario: Unauthenticated request
- **WHEN** `GET /lessons/:id` is called without a valid Bearer token
- **THEN** the response status is 401 from `JwtAuthGuard`
- **AND** no flag is computed

### Requirement: Flags are not derived from query parameters
The system MUST NOT accept any query parameter (`?source=`, `?mode=`, etc.) that selects between catalog and owned behavior. The five flags SHALL be the only signal a client uses to gate UI affordances.

#### Scenario: Ignored query parameter
- **WHEN** the client calls `GET /lessons/:id?source=catalog` for an owned lesson
- **THEN** the response still returns `isCatalog: false`, `isOwned: true`
- **AND** the response is identical (modulo the ignored query string) to the same call without `?source=`

### Requirement: Enroll endpoint returns enroll result flag
The system SHALL make `POST /lessons/catalog/:id/enroll` return a `clonedFromId` field on the cloned `Lesson`. When the user was already enrolled (`alreadyEnrolled: true` before the call), the endpoint MUST return 200 with the existing clone; when newly enrolled, the endpoint MUST return 201 with the new clone. A `created: boolean` field MUST be present so the client can distinguish the two cases without re-querying.

#### Scenario: New enrollment
- **WHEN** the user calls `POST /lessons/catalog/:id/enroll` and no clone existed before
- **THEN** the response status is 201
- **AND** the body contains the new `Lesson` with `sourceLessonId === :id`, `ownerId === userId`
- **AND** `created` equals `true`
- **AND** `clonedFromId` equals `:id`

#### Scenario: Already enrolled
- **WHEN** the user calls `POST /lessons/catalog/:id/enroll` and a clone already exists
- **THEN** the response status is 200
- **AND** the body contains the existing clone
- **AND** `created` equals `false`
- **AND** `clonedFromId` equals `:id`

### Requirement: Catalog endpoint is dropped once flags are wired
The system SHALL remove `GET /api/v1/lessons/catalog/:id` once the frontend consumes the new flags exclusively. The endpoint MAY remain during a deprecation window with a `Sunset` HTTP header pointing to `GET /lessons/:id`, and SHALL be removed before this change is archived.

#### Scenario: Sunset header during deprecation
- **WHEN** during the deprecation window the client calls `GET /lessons/catalog/:id`
- **THEN** the response includes `Sunset: <date>` and `Link: <https://api.engclass.dev/lessons/:id>; rel="successor-version"`
- **AND** the response body is identical to what `GET /lessons/:id` returns for the same id (so the client can migrate transparently)

#### Scenario: Endpoint removed
- **WHEN** the deprecation window closes
- **THEN** any call to `GET /lessons/catalog/:id` returns 404
- **AND** the frontend has migrated and no client reference to the path remains
