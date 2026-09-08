## ADDED Requirements

### Requirement: Authenticated self-check endpoint
The system SHALL expose `GET /api/v1/auth/me` (authenticated) that returns the current user's public view: `{ id, email, displayName, level, currentStreak }`. The endpoint MUST validate the JWT through the existing `JwtAuthGuard`. The response MUST be cacheable only for the requesting user: the server SHALL include `Cache-Control: private, max-age=60` in the response.

#### Scenario: Valid token
- **WHEN** the client calls `GET /auth/me` with a valid Bearer token
- **THEN** the response status is 200
- **AND** the body contains the five fields above with `id === req.user.id` and `email === req.user.email`
- **AND** `Cache-Control: private, max-age=60` is set

#### Scenario: Missing token
- **WHEN** the client calls `GET /auth/me` without `Authorization` header
- **THEN** the response status is 401
- **AND** the body uses the shared error envelope with `code: "UNAUTHORIZED"`

#### Scenario: Expired token
- **WHEN** the client calls `GET /auth/me` with a token whose `exp` is in the past
- **THEN** the response status is 401
- **AND** no user data is returned

### Requirement: Frontend uses /auth/me to validate cached sessions
The frontend MUST call `GET /auth/me` once on app boot, after reading any token from `localStorage` and before resolving the `AuthGuard`. If the call returns 200, the frontend hydrates the `currentUser` signal with the returned fields and renders protected routes. If the call returns 401, the frontend MUST clear `localStorage` and redirect to `/login`.

#### Scenario: Boot with valid cached token
- **WHEN** the app boots and `localStorage.getItem('engclass.learn.token')` returns a non-empty string
- **AND** `GET /auth/me` returns 200 with `{ id, email, displayName }`
- **THEN** `currentUser` is set
- **AND** `AuthGuard` resolves to `true`
- **AND** no flicker past the login screen

#### Scenario: Boot with stale cached token
- **WHEN** the app boots with a cached token but `GET /auth/me` returns 401
- **THEN** `localStorage` is cleared
- **AND** the user is redirected to `/login`
- **AND** no page under the protected tree renders

#### Scenario: Boot with no cached token
- **WHEN** `localStorage.getItem('engclass.learn.token')` returns null
- **THEN** the app MUST NOT call `/auth/me`
- **AND** the user is redirected to `/login` immediately

### Requirement: Logout clears session locally and server-side
The system SHALL provide `POST /api/v1/auth/logout` that invalidates the current session server-side (clears any rate-limit bucket keyed on the user, removes the session entry if one exists). After successful logout, the frontend MUST clear `localStorage` and the `currentUser` signal.

#### Scenario: Successful logout
- **WHEN** the user clicks "Log out"
- **THEN** the frontend calls `POST /auth/logout`
- **AND** on 200, clears storage and `currentUser`
- **AND** navigates to `/login`

#### Scenario: Logout with already invalid token
- **WHEN** the user clicks "Log out" with a token that has already expired
- **THEN** `POST /auth/logout` returns 200 (idempotent)
- **AND** the frontend clears storage regardless
