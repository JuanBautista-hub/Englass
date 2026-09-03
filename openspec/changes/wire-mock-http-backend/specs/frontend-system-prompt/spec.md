## ADDED Requirements

### Requirement: Frontend prompt documents that the mock backend is a separate interceptor
The frontend system prompt SHALL add a "Mock backend" section under "Auth y CSRF" describing that, when `environment.useMockApi === true`, an interceptor registered before `csrfInterceptor` short-circuits every request to the in-memory `MockApiService`, and that the `csrfInterceptor` continues to apply for non-mock flows. The prompt SHALL NOT require AI assistants to redefine the mock in their generated code.

#### Scenario: prompt mentions the mock interceptor
- **WHEN** an engineer reads the "Auth y CSRF" section of the frontend prompt
- **THEN** the section mentions `mockBackendInterceptor` and its position before `csrfInterceptor`

#### Scenario: prompt does not require the AI to regenerate the mock
- **WHEN** an AI assistant reads the prompt to scaffold the frontend
- **THEN** it does not generate a parallel mock implementation; it reuses `MockApiService`