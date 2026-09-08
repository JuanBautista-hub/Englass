## Context

El modelo de lecciones en `apps/api` distingue dos tipos de filas en la tabla `lessons`:
- **Catálogo** (`ownerId = 'seed-system-user'`, `sourceLessonId = null`): lecciones globales sembradas por el seed, visibles para todos los usuarios como referencia. No se pueden estudiar directamente.
- **Usuario** (`ownerId = userId`, `sourceLessonId = <catalog id>`): copia personal creada al "enroll". Solo estas son devueltas por `list(userId)` y aceptadas por `GET /review/lessons/:id/due` y `applyReview`.

El frontend (`apps/learn/src/app/features/lessons/lessons.page.ts:269`) actualmente enlaza el botón "Study" directamente a `/study/:l.id`, pero `l.id` es del catálogo cuando el usuario no se ha inscrito. El backend rechaza con `NotFoundException('lesson_not_found')` (`apps/api/src/review/review.service.ts:62-64`).

El endpoint `POST /lessons/catalog/:id/enroll` existe en `lessons.service.ts:331-360` y respeta `@@unique([ownerId, sourceLessonId])`, así que es idempotente. Hoy lo dispara el frontend en `lesson-detail.page.ts` desde el botón "Add".

El usuario quiere eliminar el paso de "Add" para que las primeras lecciones del catálogo estén inmediatamente disponibles, agrupadas por nivel CEFR.

## Goals / Non-Goals

**Goals:**
- Inscripción automática, idempotente y sin race conditions.
- Endpoint nuevo `GET /lessons/grouped` para que el frontend renderice secciones por nivel.
- UI de "My lessons" en `/lessons` que muestra las lecciones agrupadas por `A1 → B2` con conteo de cards.
- Eliminar el paso manual "Add" del flujo por defecto; conservarlo solo como opt-in para niveles superiores desde el catálogo.
- Mantener la cobertura de tests y la idempotencia bajo `signup` reintentado.

**Non-Goals:**
- No se cambia el sistema de SRS / SM-2 / mastery.
- No se cambia el seed ni la BD.
- No se modifica `backend-prompt.md` ni `front-prompt.md` (decisiones de producto viven en este change).
- No se introduce un nuevo modelo de "nivel del usuario"; el nivel por defecto para auto-enroll es `A1`. La pista de nivel del usuario puede venir más adelante (no en este change).
- No se elimina `POST /lessons/catalog/:id/enroll`; sigue siendo útil para opt-in manual.

## Decisions

### 1. Auto-enroll en `signup` Y en primer `GET /lessons/grouped`
**Decisión:** Llamar a `autoEnrollAllForUser(userId)` desde dos puntos:
- `auth.service.signup` después de crear el usuario (best-effort, log si falla para no bloquear el registro).
- `lessonsController.listGrouped` si el usuario no tiene lecciones propias todavía.

**Por qué:** Si `signup` falla en la inscripción (p.ej. timeout), el usuario aún podrá estudiar gracias al fallback lazy en `/lessons/grouped`. La idempotencia de `autoEnrollAllForUser` garantiza que la segunda llamada no duplica filas.

**Alternativa considerada:** Solo lazy en `/lessons/grouped`. Descartada porque retrasa el primer estudio (request más pesado en el primer load) y complica el `GET /dashboard`.

### 2. `autoEnrollAllForUser` itera el catálogo en una transacción
**Decisión:** Nuevo método `lessonsService.autoEnrollAllForUser(userId)`:
1. Lee todas las lecciones del catálogo (`ownerId = SYSTEM_USER_ID`) filtradas por `level <= currentLevel`.
2. Lee las inscripciones existentes del usuario (`where: { ownerId: userId, sourceLessonId: { not: null } }`).
3. Calcula el set de `sourceLessonId` ya inscritos y clona solo los faltantes, usando `createMany` con `skipDuplicates: true` como red de seguridad final.
4. Devuelve `{ enrolled: number, skipped: number }`.

**Por qué:** `createMany` con `skipDuplicates` (soportado por Prisma 5 + Postgres/MySQL con índice único) elimina la condición de carrera incluso si dos requests corren en paralelo.

**Alternativa:** Loop con `findFirst` + `create`. Descartada por N+1 y por no proteger contra concurrencia.

### 3. Default level = `A1`
**Decisión:** Si el usuario no tiene nivel explícito, se inscribe solo en lecciones `A1`.

**Por qué:** El seed actual siembra ~5 lecciones A1 (vocales, consonantes, números, países, saludos). Es el set mínimo viable para un primer estudio. Niveles superiores (B1, B2) requieren opt-in manual vía el catálogo.

**Alternativa:** Inscribir TODO el catálogo. Descartada por generar ~133 cards de golpe y contradecir el modelo progresivo A1→B2.

### 4. Endpoint nuevo `GET /lessons/grouped`
**Decisión:** Añadir `lessonsController.grouped(@Req() req)` que devuelve `Array<{ level: 'A1'|'A2'|'B1'|'B2', lessons: LessonView[] }>` en orden canónico, omitiendo niveles vacíos. Cada `LessonView` extiende con `cardCount` (`cards.length`).

**Por qué:** Es lo que el frontend necesita para renderizar las secciones sin tener que re-agrupar en cliente. Mantiene la lógica de orden canónico en backend (single source of truth).

**Alternativa:** Devolver todo plano y agrupar en cliente. Descartada por exponer el orden CEFR al frontend y por permitir errores visuales si se agregan niveles (C1, C2).

### 5. Frontend: nueva sección "My lessons" antes del catálogo
**Decisión:** En `lessons.page.ts`, después de "Stats" y antes del catálogo, renderizar un bloque "My lessons" con `<details>` abiertos por nivel. Cada lección muestra `[Study] [Open]` (sin `[Add]`). El catálogo se mantiene abajo como preview colapsable.

**Por qué:** Separa claramente "lo que ya puedo estudiar" de "lo que podría añadir". Refuerza el modelo "solo empieza".

**Alternativa:** Reemplazar completamente la sección de catálogo. Descartada porque sigue siendo útil para opt-in de niveles superiores y para descubrir contenido nuevo.

### 6. Eliminar `[routerLink]="['/study', l.id]"` para lecciones del catálogo
**Decisión:** En `lessons.page.ts:269` eliminar el `Study` que apuntaba a lecciones del catálogo (las del system user). Dejar solo `Open` en la sección de catálogo. En "My lessons", el `Study` apunta a la lección propia del usuario.

**Por qué:** Cierra el bug 404 raíz. El frontend ya nunca asume que una lección del catálogo es estudiable directamente.

### 7. `lesson-detail.page.ts`: borrar el "Add" implícito y el banner para lecciones propias
**Decisión:** Eliminar el efecto que llama a `enrollInCatalog` automáticamente. Si el backend responde 404 en `findOne`, el detalle muestra CTA "Ir al catálogo" en lugar del banner "Add".

**Por qué:** El detalle asume que cualquier id que el usuario tiene es propio. Si no lo encuentra, es porque está intentando abrir una lección del catálogo sin haberse inscrito — flujo que ya no es principal.

## Risks / Trade-offs

- **[Risk] Race condition en signup concurrente** → Mitigation: `createMany({ skipDuplicates: true })` y `@@unique([ownerId, sourceLessonId])` como red final.
- **[Risk] Auto-enroll falla en signup por timeout de BD** → Mitigation: fallback lazy en `GET /lessons/grouped`. Log estructurado con `pino` si falla.
- **[Risk] Usuarios existentes (pre-change) sin lecciones propias** → Mitigation: la primera llamada a `GET /lessons/grouped` dispara auto-enroll para ellos también (no solo nuevos signups).
- **[Risk] Frontend queda con estado inconsistente si el backend devuelve `lessons: []` antes del fallback** → Mitigation: el servicio `lessonsService.listGrouped()` hace el fallback dentro del endpoint, no en cliente.
- **[Risk] Tests existentes de `lesson-detail.page.spec.ts` asumen el banner "Add"** → Mitigation: actualizar los specs para reflejar el nuevo comportamiento (sin banner en lecciones propias).
- **[Trade-off] Más carga en `signup`** → Aceptable: ~5 lecciones × ~13 cards ≈ 65 inserts, < 100ms en BD local.
- **[Trade-off] El catálogo queda visualmente abajo** → Aceptable: el usuario ya tiene su camino principal arriba; el catálogo es discovery secundario.

## Migration Plan

1. **Desarrollo:**
   - Implementar backend (`autoEnrollAllForUser`, `listGroupedByLevel`, controller endpoint).
   - Implementar frontend (servicio + UI agrupada + limpieza del banner).
   - Correr `pnpm -r typecheck && pnpm -r test` y resolver hasta verde.
2. **Despliegue:**
   - No requiere migración de schema (la tabla `lessons` ya soporta el modelo).
   - No requiere script de datos; los usuarios existentes se auto-inscriben en su próximo `GET /lessons/grouped`.
3. **Rollback:**
   - Revertir el commit. La tabla `lessons` queda con las filas auto-creadas (inocuas). Los usuarios retoman el flujo manual "Add".
4. **Verificación post-deploy:**
   - Login con un usuario nuevo → debe ver ≥1 sección en "My lessons" sin haber hecho clic en "Add".
   - Login con un usuario existente → debe auto-inscribirse en su primer `GET /lessons/grouped`.
   - Intentar `GET /review/lessons/<mi-leccion>/due` → debe devolver 200.

## Open Questions

- ¿El nivel por defecto debería ser `A1` o el primer nivel del seed que tenga lecciones publicadas? (Resuelto: `A1`).
- ¿Deberíamos también auto-inscribir lecciones que el usuario ya estudió en otro dispositivo? (No: el endpoint de review funciona con cualquier lección propia, y los `CardProgress` se mantienen ligados al usuario).
- ¿Mover la sección "Catalog preview" a `/catalog` separado? (Fuera de scope; se mantiene en `/lessons` por ahora).