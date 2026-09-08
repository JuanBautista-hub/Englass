## Why

`apps/learn` ejecuta reglas de negocio en el cliente que pertenecen al backend: detecta lecciones de catálogo a partir de un query param de la URL (`?source=catalog`), calcula localmente `retentionPct` y el resumen de la sesión de estudio, reescribe el estado SRS de cada `DueCard` tras calificar, redirige el CTA "Start review" llamando a `allDue(1)` para extraer un `lessonId`, y duplica constantes de dominio (`LEVEL_META`, `MASTERY_META`, `DAILY_GOAL_TARGET`, `LAST_RATINGS_LIMIT`) que ya viven en `apps/api`. La consecuencia práctica es doble: (1) un usuario puede saltarse el gating de ownership manipulando la URL, y (2) si el modelo de datos del backend cambia (p. ej. `sourceLessonId` se renombra), el frontend rompe silenciosamente. Hay que mover el cálculo y la decisión al backend, devolver flags autoritativos y consumir las constantes ya existentes.

## What Changes

- La respuesta de `GET /lessons/:id` (y de `GET /lessons/catalog/:id`) incluye flags calculados por el servidor: `isCatalog`, `isOwned`, `canEdit`, `canEnroll`, `alreadyEnrolled`. El frontend deja de inferir desde query params e IDs.
- El catálogo deja de ser una ruta especial del cliente: `GET /lessons/:id` resuelve cualquier lección para el usuario autenticado y devuelve los flags. Si la lección es de catálogo y no está inscrita, `enroll` se invoca por separado y la respuesta lleva el flag `clonedFromId`. Se elimina `getCatalogLesson` y `enrollInCatalog` como métodos duplicados en el servicio del cliente.
- La respuesta de `POST /review/cards/:cardId` deja de devolver solo `userBefore`/`userAfter`/`newlyAwarded`/`progress` y pasa a adjuntar el `DueCard` actualizado tras aplicar el rate, eliminando la necesidad del cliente de reescribirlo. La respuesta también incluye `sessionDone: boolean` cuando la cola de tarjetas se terminó (basado en la cola del cliente enviada o el estado del servidor).
- Se añade `POST /review/sessions/end` que devuelve `StudySessionSummary`: `totalReviewed`, `byRating { again, hard, good, easy }`, `retentionPct`, `longestIntervalDays`, `nextDueAt`, `streakBefore`, `streakAfter`, `newlyAwarded[]`. El frontend consume este endpoint al cerrar la sesión y ya no recalcula nada.
- `GET /dashboard` ya devuelve `nextLesson`; el CTA "Start review" en `/lessons` se enlaza a `dashboard.nextLesson.lessonId` en vez de llamar a `reviewService.allDue(1)` y extraer el primero.
- Se añade `GET /auth/me` (autenticado) que devuelve `{ id, email, displayName, level, currentStreak }` del usuario actual. La app lo consulta al arrancar (después del `localStorage.getItem('token')`) para validar la sesión; si devuelve 401, se limpia el storage y se redirige a `/login`.
- El frontend elimina los fallbacks `FALLBACK_LEVELS` (`cefr.service.ts`) y `FALLBACK_LABELS` (`mastery-labels.service.ts`) y consume siempre `/cefr/levels` y `/mastery/labels`. Elimina la constante `LAST_RATINGS_LIMIT = 5` local y el truncamiento manual; consume el historial truncado que devuelve `applyReview`. Borra el `dailyGoal.target: 20` hardcodeado en `dashboard.page.ts:127` y usa el `dailyGoal` que devuelve `GET /dashboard`.
- **BREAKING**: el frontend rompe el contrato con `GET /lessons/:id` cuando la lección solicitada no le pertenece al usuario: el backend antes respondía 404; ahora responde 200 con `isOwned: false` y `isCatalog: true|false`. Las páginas que asumían 404 deben migrar a leer `isOwned`.
- **BREAKING**: el frontend asume que `login.page.ts` no debe enviar `minlength=8` al password (esa validación solo aplica a signup; `LoginDto` no exige longitud). Se separa el flujo en formularios distintos o se quita el atributo.

## Capabilities

### New Capabilities

- `lesson-permission-flags`: `GET /lessons/:id` (y `GET /lessons/catalog/:id`) devuelven `isCatalog`, `isOwned`, `canEdit`, `canEnroll`, `alreadyEnrolled` calculados por el servidor a partir del token JWT y de `ownerId`/`sourceLessonId` del registro.
- `study-session-summary`: `POST /review/sessions/end` devuelve `StudySessionSummary` con `totalReviewed`, `byRating`, `retentionPct`, `longestIntervalDays`, `nextDueAt`, `streakBefore`, `streakAfter`, `newlyAwarded[]`. `POST /review/cards/:cardId` devuelve además el `DueCard` actualizado y `sessionDone: boolean`.
- `auth-self-check`: `GET /auth/me` autenticado devuelve `{ id, email, displayName, level, currentStreak }`. El frontend lo usa al arrancar la app para validar la sesión contra el servidor antes de confiar en `localStorage`.

### Modified Capabilities

- `cefr-level-catalog`: el frontend SHALL consumir exclusivamente `GET /cefr/levels` y SHALL NOT mantener un array local `FALLBACK_LEVELS` paralelo. La regla "single source of truth en `LEVEL_META`" se fortalece: si el frontend necesita un fallback offline temporal por red caída, debe provenir de la última respuesta cacheada (no de un literal).
- `mastery-display-labels`: el frontend SHALL consumir exclusivamente `GET /mastery/labels` para los strings `label`, y SHALL mantener solo el mapeo a clases CSS (`badgeClass`) en el cliente como policy de presentación. Eliminar `FALLBACK_LABELS`.
- `backend-system-prompt`: aclarar que toda constante de dominio (`LAST_RATINGS_LIMIT`, `DAILY_GOAL_TARGET`, `LEVEL_META`, `MASTERY_META`) vive en `apps/api/src/*` y se sirve vía endpoint; el cliente SHALL NOT redeclararlas.

## Impact

- **Backend** (`apps/api`):
  - `lessons.service.ts` → en `findOne` y `findOneAsCatalog` añadir el cálculo de los 5 flags. Mover la lógica de `enrollInCatalog` (líneas 472-525) y reusarla cuando el cliente llame a una lección no owned con `canEnroll: true`.
  - `lessons.controller.ts` → devolver los flags en JSON; opcional: añadir `GET /lessons/:id/permissions` si se prefiere endpoint separado para llamadas de barrido.
  - `review/review.service.ts` → añadir `endSession(userId): Promise<StudySessionSummary>`. Modificar `applyReview` para devolver `{ progress, userBefore, userAfter, newlyAwarded, updatedCard, sessionDone }`. Respetar `LAST_RATINGS_LIMIT` al construir el historial devuelto.
  - `review/review.controller.ts` → añadir `POST /review/sessions/end`; modificar la respuesta de `POST /cards/:cardId`.
  - `auth/auth.controller.ts` → añadir `GET /auth/me`. `auth.service.ts` → `me(userId)`. Respuesta cacheable con `Cache-Control: private, max-age=60`.
  - Tests e2e en `apps/api/test` cubren los 5 flags (`owner`, `no owner`, `catalog`, `catalog enrolled`, `catalog not enrolled`), `endSession` con counts y retention, `auth/me` con 200/401.

- **Frontend** (`apps/learn`):
  - `core/services/lessons.service.ts` → borrar `getCatalogLesson` y `enrollInCatalog`; unificar en `get(id)` que devuelve `LessonView` con flags. `enroll(sourceLessonId)` sigue existiendo para el botón explícito pero ya no es llamado implícitamente por la página.
  - `features/lessons/lesson-detail.page.ts` → eliminar la lógica de los tres lugares (líneas 266, 395-413, 440-442); renderizar CTAs y banners a partir de `isCatalog`/`isOwned`/`canEdit`/`canEnroll`/`alreadyEnrolled`.
  - `features/study/study.page.ts` → eliminar la reescritura local del `DueCard` (líneas 445-461) y el cálculo de `byRating`/`retentionPct`/`longestIntervalDays` (líneas 246-250, 463-484). Reemplazar la construcción del resumen por la respuesta de `POST /review/sessions/end`. Eliminar el slice manual de `lastRatings`.
  - `features/study/study.page.ts` → al cerrar la sesión, llamar `endSession()` y consumir el summary.
  - `features/lessons/lessons.page.ts` → el botón "Start review" usa `dashboard.nextLesson.lessonId`; eliminar la llamada a `reviewService.allDue(1)`.
  - `features/dashboard/dashboard.page.ts` → eliminar `dailyGoal.target: 20` hardcodeado (línea 127); consumir el `dailyGoal` del `GET /dashboard`.
  - `core/services/cefr.service.ts` → borrar `FALLBACK_LEVELS`; el servicio lanza si `/cefr/levels` falla hasta que se implemente un caché LRU local separado (no un literal paralelo).
  - `core/services/mastery-labels.service.ts` → borrar `FALLBACK_LABELS`; mantener solo el mapeo a `badgeClass` en cliente.
  - `core/guards/auth.guard.ts` + `core/services/auth.service.ts` → al boot, antes de marcar el guard como `true`, llamar `GET /auth/me`; si responde 200 hidratar el `currentUser` signal; si responde 401, hacer logout (clear storage) y dejar pasar al `/login`.
  - `features/auth/login.page.ts` → quitar `minlength="8"` del password (esa regla es solo de signup, ya validada por `SignupDto`).
  - Test unit: `study.page.spec.ts` verifica que `rate()` ya no muta `DueCard` localmente; `lesson-detail.page.spec.ts` cubre los 4 estados (catalog no enrolled, catalog enrolled, own, other user's).

- **Tests**:
  - Backend e2e para los nuevos endpoints.
  - Frontend unit para los estados de UI derivados de flags.

- **Documentación**:
  - `backend-prompt.md` y `front-prompt.md` no cambian (las decisiones de producto se especifican en este change).
  - Este change **no modifica** los contratos de auth (sigue JWT Bearer con `localStorage`); un change posterior puede migrar a cookies httpOnly.
