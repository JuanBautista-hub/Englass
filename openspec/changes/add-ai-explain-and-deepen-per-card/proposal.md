## Why

Hoy un estudiante que abre `lesson-detail` ve las tarjetas con su `term` y `definition` y, si tiene suerte, una `translation` y `explanationEs`. No hay forma de pedir una explicación a fondo, ejemplos adicionales, ni contexto cultural o de uso para una palabra específica. El usuario quiere incorporar un proveedor de IA (MiniMax, accediendo a un modelo compatible con la API de chat) para que cada tarjeta tenga dos acciones nuevas: **"Explicar"** (definición clara + 1-2 ejemplos cortos) y **"Profundizar"** (contexto, colocaciones, falsos amigos, nivel CEFR). Esto convierte cada tarjeta en una mini-lección generativa y le da al usuario una razón nueva para abrir la lección.

## What Changes

- Se añade un nuevo módulo backend `AiModule` con un `AiService` que abstrae el proveedor. La implementación inicial usa MiniMax vía HTTP (`POST {AI_BASE_URL}/chat/completions` con `model: "MiniMax-M3"`), pero la interfaz permite intercambiarla por cualquier proveedor compatible (OpenAI, Azure, Ollama, etc.) sin tocar consumidores.
- Se exponen dos endpoints autenticados, parametrizados por tarjeta:
  - `POST /api/v1/lessons/:lessonId/cards/:cardId/explain` — devuelve `{ summary, examples: string[] }` (≤ 60 palabras en español para A1/A2, ≤ 120 para B1+, en inglés si la tarjeta es EN-first).
  - `POST /api/v1/lessons/:lessonId/cards/:cardId/deepen` — devuelve `{ context, collocations: string[], falseFriends: string[], level: 'A1'|'A2'|'B1'|'B2'|'C1'|'C2' }`.
- Backend cachea respuestas en `AiCacheStore` (en memoria) con clave `hash(lessonId:cardId:mode:level)`. TTL configurable (default 24 h).
- Backend aplica rate-limit por usuario (5 req/min, 60 req/día) sobre los dos endpoints. Si se excede, responde 429 con el envelope de error estándar y código `RATE_LIMITED`.
- Frontend añade dos botones en cada `<article>` de tarjeta en `lesson-detail.page.ts`: "💡 Explicar" y "🧠 Profundizar". Al pulsar, abre un diálogo/sheet con la respuesta, renderiza skeletons mientras carga, y muestra el error rate-limit/IA con retry.
- Se añade el campo `aiCallCount` opcional en `LessonCardView` (no breaking) para UI: badge que muestra cuántas llamadas de IA se han hecho esta sesión para esa tarjeta (transparencia de uso).
- La política de privacidad manda: el prompt enviado al proveedor contiene **solo** el `term` de la tarjeta + el `level` CEFR + el `mode` (`explain` o `deepen`). Nunca se envía `definition`, `example`, `translation`, `explanationEs` ni nada del usuario. Documentado en código y en `backend-prompt.md`.

## Capabilities

### New Capabilities
- `lesson-ai-explain`: el endpoint `POST /lessons/:lessonId/cards/:cardId/explain` devuelve una explicación corta y ejemplos; el prompt nunca incluye más que `term` + `level`; la respuesta es cacheada por 24 h y rate-limiteada por usuario.
- `lesson-ai-deepen`: el endpoint `POST /lessons/:lessonId/cards/:cardId/deepen` devuelve contexto, colocaciones y falsos amigos para profundizar en la palabra; mismo contrato de privacidad, caché y rate-limit que `explain`.
- `ai-rate-limit`: el backend aplica un rate-limit por usuario (5 req/min, 60 req/día) sobre los endpoints de IA; las respuestas caché-hit no consumen cupo.

### Modified Capabilities
*(ninguna)* — los specs `lesson-permission-flags`, `study-session-summary`, `auth-self-check`, `cefr-level-catalog`, `mastery-display-labels` no cambian a nivel de requisito. La feature es puramente aditiva.

## Impact

- **Backend** (`apps/api`):
  - Nuevo `apps/api/src/ai/ai.module.ts` que exporta `AiService`, `AiCacheStore`, `AiProvider` (interfaz), `MiniMaxProvider` (implementación HTTP), `AiRateLimitStore`.
  - Nuevo `apps/api/src/ai/ai.controller.ts` con `POST /lessons/:lessonId/cards/:cardId/explain` y `POST /lessons/:lessonId/cards/:cardId/deepen`.
  - Nuevo `apps/api/src/ai/dto/{explain,deepen}.dto.ts`.
  - Nuevo `apps/api/src/ai/prompts.ts` con los dos prompt templates como funciones puras (testeables sin red).
  - `apps/api/src/lessons/lessons.module.ts` importa `AiModule`.
  - `apps/api/src/common/config.ts` añade `aiBaseUrl`, `aiApiKey`, `aiModel`, `aiCacheTtlMs`, `aiRatePerMinute`, `aiRatePerDay`.
  - Dependencia: `undici` o `fetch` nativo (Node 20+) para el cliente HTTP. Sin nuevo paquete si usamos `fetch` global.

- **Frontend** (`apps/learn`):
  - Nuevo `apps/learn/src/app/core/services/ai.service.ts` con `explain(lessonId, cardId)` y `deepen(lessonId, cardId)`.
  - `apps/learn/src/app/features/lessons/lesson-detail.page.ts` añade los dos botones por `<article>` y renderiza un panel modal con la respuesta.
  - `apps/learn/src/app/core/models/index.ts` exporta `AiExplainResponse` y `AiDeepenResponse`.
  - `packages/shared/src/ai.ts` con los tipos `AiExplainResponse`, `AiDeepenResponse`, `AiMode` (`'explain'|'deepen'`).

- **Tests**:
  - Backend: `prompts.spec.ts` verifica que `buildExplainPrompt` y `buildDeepenPrompt` solo contienen `term` + `level` + `mode` (nada más del card). `ai-cache.store.spec.ts`, `ai-rate-limit.store.spec.ts`. `ai.controller.spec.ts` cubre 200, 401, 403 (foreign card), 404 (card no existe), 429, 502 (provider falla).
  - Frontend: `ai.service.spec.ts`, `lesson-detail.page` actualizado para reflejar los botones.

- **Seguridad / privacidad**:
  - `AI_API_KEY` solo en backend, nunca expuesto al cliente.
  - Logs estructurados con `requestId`, `userId`, `cardId`, `mode`, `level`, `promptHash`, `tokensUsed`, `cacheHit`, `latencyMs`. Nunca se loguea el contenido del prompt ni la respuesta (riesgo de PII si el term es propio del usuario).
  - El proveedor MiniMax se invoca con `temperature: 0.4` y `max_tokens` proporcional al modo para acotar costo.

- **Documentación**:
  - `backend-prompt.md`: añadir sección de IA con contratos, prompt privacy rules, rate limits, env vars, y advertencias ("never log prompt content").
  - `front-prompt.md`: añadir patrón de UI para botones AI y manejo de errores rate-limit.
  - `apps/api/CHANGELOG.md`: entrada "Unreleased — add-ai-explain-and-deepen-per-card".

- **No breaking**: ninguna ruta existente cambia. El campo `aiCallCount` es opcional en `LessonCardView` (no rompe consumidores que lo ignoren).
