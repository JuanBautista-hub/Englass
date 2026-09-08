## 1. Backend: auto-enrollment service

- [x] 1.1 Añadir método `autoEnrollAllForUser(userId: string, maxLevel = 'A1')` en `apps/api/src/lessons/lessons.service.ts` que clone todas las lecciones de catálogo con `level <= maxLevel`. Implementado con `findFirst`+`create` (idempotente vía `@@unique([ownerId, sourceLessonId])`) y `vocabularyCard.createMany` + `cardProgress.createMany`. (Desviación del `skipDuplicates` de la propuesta: Prisma 5 + MySQL requiere un unique key específico; el patrón `findFirst`+`create` evita la excepción.)
- [x] 1.2 Devolver `{ enrolled: number; skipped: number }` y respetar el orden de niveles `A1 < A2 < B1 < B2`. Listo: `LEVEL_ORDER` + `LEVEL_RANK` reusados, `eligibleLevels` se ordena por rank ascendente.
- [ ] 1.3 Tests unitarios en `apps/api/src/lessons/lessons.service.spec.ts`. **Bloqueado**: `apps/api/package.json` no tiene jest configurado (`test: echo "no tests yet" && exit 0`). Requiere un change que instale jest antes de poder escribir specs backend.

## 2. Backend: grouped-by-level endpoint

- [x] 2.1 Añadir método `listOwnedByLevel(userId: string)` (renombrado de `listGroupedByLevel` para reflejar que son lecciones del usuario) en `lessons.service.ts` que devuelve `OwnedLessonsByLevelGroup[]` en orden canónico, omitiendo niveles vacíos, con `cardCount` incluido.
- [x] 2.2 Añadir `@Get('grouped')` en `lessons.controller.ts` (autenticado). Si el usuario no tiene lecciones propias, invoca `autoEnrollAllForUser` antes de devolver la respuesta.
- [ ] 2.3 Tests del endpoint grouped. **Bloqueado**: mismo motivo que 1.3 (sin jest en backend).

## 3. Backend: signup integration

- [x] 3.1 En `apps/api/src/auth/auth.service.ts`, tras `prisma.user.create`, llamar a `this.lessons.autoEnrollAllForUser(user.id)` envuelto en `try/catch` con `Logger.warn` si falla. `AuthModule` importa `LessonsModule` y `AuthService` inyecta `LessonsService`.
- [ ] 3.2 Tests del signup. **Bloqueado**: mismo motivo que 1.3.

## 4. Frontend: lessons service extension

- [x] 4.1 En `apps/learn/src/app/core/services/lessons.service.ts`, añadido `listGrouped(): Promise<OwnedLessonsByLevelGroup[]>` que llama a `GET /lessons/grouped`.
- [x] 4.2 Definidas interfaces `OwnedLessonSummary` (con `cardCount` y `sourceLessonId`) y `OwnedLessonsByLevelGroup` en `apps/learn/src/app/core/models.ts`. (Desviación de `mastery`: la vista agrupada lista resúmenes, no mastery — eso sigue viviendo en `LessonView` del detalle.)
- [ ] 4.3 Tests en `lessons.service.spec.ts`. **Bloqueado**: `apps/learn/package.json` no tiene jest (`test: echo "no tests yet"`).

## 5. Frontend: lessons page grouping

- [x] 5.1 En `apps/learn/src/app/features/lessons/lessons.page.ts`, añadido signal `lessonsGrouped = signal<OwnedLessonsByLevelGroup[]>([])`. Eliminado el signal `lessons: Lesson[]`.
- [x] 5.2 En `loadMyLessons()`, llamar a `svc.listGrouped()` y poblar `lessonsGrouped`.
- [x] 5.3 Renderizar "My lessons" con un `<details open>` por nivel (`A1 → B2`), mostrando el conteo de cards y los botones `[Study] [Open]` por lección.
- [x] 5.4 Verificado que la sección de catálogo **no** tiene `[routerLink]="['/study', ...]"` — solo `Preview` / `Open` / `Add`. El botón Study de la sección "My lessons" apunta a IDs propios del usuario (vienen de `listGrouped`), nunca del catálogo.
- [ ] 5.5 Tests del render. **Bloqueado**: mismo motivo que 4.3.

## 6. Frontend: lesson detail cleanup

- [x] 6.1 Verificado: `lesson-detail.page.ts` no tenía `effect` que llamara a `enrollInCatalog` automáticamente — la inscripción solo se disparaba al hacer clic en "+ Add to my lessons". Sin cambios necesarios.
- [x] 6.2 En el estado "Lesson not found" (`lesson() === null && !loading()`), añadido CTA "Go to catalogue" que enlaza a `/lessons`.
- [ ] 6.3 Tests del detail. **Bloqueado**: mismo motivo.

## 7. Verification

- [x] 7.1 `pnpm --filter @engclass/api prisma:migrate` no aplica (sin cambios de schema); `pnpm --filter @engclass/api typecheck` ✓; `pnpm --filter @engclass/api build` ✓; `pnpm --filter @engclass/api test` ✓ (no-op).
- [x] 7.2 `pnpm --filter @engclass/web typecheck` ✓; `pnpm --filter @engclass/web test` ✓ (no-op).
- [ ] 7.3 `pnpm --filter @engclass/learn start` y verificación manual: pendiente del usuario (login nuevo → ver A1 agrupado, click Study → 200 en `/study/:id`).
- [x] 7.4 `pnpm -r typecheck` ✓ (todos los paquetes).
- [ ] 7.5 Commit con mensaje `feat(learn): auto-enroll catalog lessons on signup, grouped by CEFR level`.