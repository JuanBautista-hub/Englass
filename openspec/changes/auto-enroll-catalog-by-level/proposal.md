## Why

Hoy las lecciones del catálogo (sembradas con `ownerId = SYSTEM_USER_ID`) requieren que el usuario haga clic en "Add" / "Enroll" en cada lección antes de poder estudiarla. Esto añade fricción al primer arranque y obliga al usuario a descubrir el botón "Add", contradiciendo el principio de "solo empieza a estudiar". El usuario quiere ver las lecciones agrupadas por nivel CEFR (A1, A2, B1, B2) y poder estudiarlas inmediatamente, sin pasos previos.

## What Changes

- El backend auto-inscribe al usuario en **todas las lecciones del catálogo** de su nivel actual (y por debajo) en el momento del registro (`POST /auth/signup`) o en el primer `GET /lessons` autenticado si aún no está auto-inscrito (idempotente).
- La pantalla `/lessons` mostrará las lecciones del usuario **agrupadas por nivel CEFR** (`A1`, `A2`, `B1`, `B2`) dentro de "My lessons", con la lección actualmente activa destacada.
- Se elimina la acción manual de "Add" del flujo principal: el botón "Add" se conserva solo para **Preview** desde el catálogo (vista que el usuario autenticado ya abrió antes de auto-inscribirse), pero desaparece del header de la lección una vez auto-inscrita.
- La página `/lessons/:id` deja de mostrar el banner "Preview from the catalogue. Add it to start tracking your progress" para lecciones auto-inscritas.
- El endpoint `POST /lessons/catalog/:id/enroll` se mantiene para casos edge (avanzados) pero deja de ser requerido por el flujo normal.
- **BREAKING**: el frontend deja de llamar `enrollInCatalog` automáticamente desde el detalle de lección; el backend garantiza la inscripción, así que el frontend asume que `lessonId` propio existe cuando navega a `/study/:id`.

## Capabilities

### New Capabilities
- `catalog-auto-enrollment`: inscripción automática del usuario en las lecciones del catálogo en su signup, idempotente y agrupable por nivel CEFR. Cubre el contrato backend (`auto-enroll-on-signup`) y el contrato frontend (`lessons-grouped-by-level`).
- `cefr-grouped-lessons`: la página `/lessons` agrupa las lecciones del usuario por nivel CEFR en "My lessons" y permite abrir cualquiera sin acción previa.

### Modified Capabilities
- *(ninguna)* — los specs `backend-system-prompt` y `frontend-system-prompt` no cambian a nivel de requisito.

## Impact

- **Backend** (`apps/api`):
  - `auth.service.ts` → llamar a `lessonsService.autoEnrollAllForUser(userId)` después de crear el usuario.
  - `lessons.controller.ts` → añadir `GET /lessons/grouped` (o `?groupBy=level`) que devuelva lecciones del usuario agrupadas por `level`.
  - `lessons.service.ts` → nuevo método `autoEnrollAllForUser(userId)` que clona todas las lecciones del catálogo cuyo nivel ≤ nivel actual del usuario (default A1 si no hay señal) sin duplicar (respeta `@@unique([ownerId, sourceLessonId])`).
  - `lessons.service.ts` → nuevo método `listGroupedByLevel(userId)` con `include: { cards: { select: { id: true } } }` para mostrar el conteo de cards.
  - Seed sin cambios.

- **Frontend** (`apps/learn`):
  - `lessons.page.ts` → añadir `lessonsGrouped` signal alimentado por `GET /lessons/grouped`; renderizar secciones `<details>` por nivel CEFR con conteo de cards.
  - `lessons.service.ts` → añadir `listGrouped(): Promise<LevelGroup[]>`.
  - `lesson-detail.page.ts` → eliminar la llamada implícita a `enrollInCatalog`; si el backend devuelve 404 en `findOne`, mostrar CTA "Ir al catálogo" en vez de "Add".
  - `lessons.page.ts` → eliminar el `[routerLink]="['/study', l.id]"` que apuntaba a lecciones del catálogo (ya resuelto porque todas están inscritas).

- **Tests**:
  - Backend: `lessons.service.spec.ts` cubre `autoEnrollAllForUser` (idempotencia, duplicados, nivel), `listGroupedByLevel` (orden, conteo).
  - Frontend: `lessons.page.spec.ts` cubre el render agrupado por nivel.

- **Documentación**:
  - `backend-prompt.md` no cambia (las decisiones de producto se especifican en este change, no en el prompt).
  - `front-prompt.md` no cambia.