## 1. Backend: labels constants module

- [x] 1.1 Crear `apps/api/src/labels/labels.constants.ts` exportando `LEVEL_META: CefrLevelMeta[]` (6 entradas con `code`, `order`, `label`, `description`), `MASTERY_META: Record<Mastery, MasteryMeta>` con `label` y `badgeClass`, y derivados `LEVEL_ORDER` y `LEVEL_RANK` desde `LEVEL_META`.
- [x] 1.2 Crear `apps/api/src/labels/labels.service.ts` con `getLevels()` y `getMasteryLabels()` que devuelven los valores de las constantes.
- [x] 1.3 Crear `apps/api/src/labels/labels.controller.ts` con `@Controller('cefr')` + `@Get('levels')` y `@Controller('mastery')` + `@Get('labels')`. Ambos `@UseGuards(JwtAuthGuard)`.
- [x] 1.4 Crear `apps/api/src/labels/labels.module.ts` exportando `LabelsService`. Registrar en `AppModule.imports`.

## 2. Backend: refactor services to use shared constants

- [x] 2.1 En `apps/api/src/lessons/lessons.service.ts`, eliminar la constante local `LEVEL_ORDER` y `LEVEL_RANK` (líneas 69-72); importar desde `labels.constants.ts`.
- [x] 2.2 En `apps/api/src/learning-path/learning-path.service.ts`, eliminar la constante local `LEVEL_ORDER` (línea 27); importar desde `labels.constants.ts`.
- [x] 2.3 En `apps/api/src/srs/srs.service.ts`, eliminar la constante local `LEVEL_ORDER` (línea 26); importar desde `labels.constants.ts`.

## 3. Frontend: types and services

- [x] 3.1 En `apps/learn/src/app/core/models.ts` añadir interfaces `CefrLevelView` y `MasteryLabelView` (con `label: string` y `badgeClass: string`).
- [x] 3.2 Crear `apps/learn/src/app/core/services/cefr.service.ts` (`providedIn: 'root'`) con `signal<CefrLevelView[]>` poblado por fetch en el constructor, fallback `FALLBACK_LEVELS` idéntico al map actual, método `get()` (sync, devuelve el signal) y `refresh()` opcional.
- [x] 3.3 Crear `apps/learn/src/app/core/services/mastery-labels.service.ts` con la misma estructura (signal poblado, fallback `FALLBACK_MASTY` con los mismos strings de hoy, método `get()`).

## 4. Frontend: replace hardcoded lookups

- [x] 4.1 En `apps/learn/src/app/features/lessons/learning-path.component.ts`, eliminar el método `levelName(level)` y la lógica que lo usa. Reemplazar con lookup `this.cefr.get()().find(l => l.code === lvl.level)?.label ?? lvl.level`.
- [x] 4.2 En `apps/learn/src/app/features/lessons/lesson-detail.page.ts`, eliminar `masteryLabel()` y `masteryClass()`. Reemplazar con `this.masteryLabels.get()()[c.mastery]?.label` y `?.badgeClass` respectivamente.
- [x] 4.3 En `apps/learn/src/app/features/study/study.page.ts`, mismo cambio que 4.2 (eliminar `masteryLabel()` y `masteryClass()`, usar `MasteryLabelsService`).
- [x] 4.4 En `apps/learn/src/app/features/lessons/lessons.page.ts`, eliminar `levelLabel()` (ya se removió en un change anterior — verificar que no quede referencia huérfana).

## 5. Verification

- [x] 5.1 `pnpm --filter @engclass/api typecheck && pnpm --filter @engclass/api build` verde.
- [x] 5.2 `pnpm --filter @engclass/learn typecheck` verde.
- [ ] 5.3 Levantar backend y verificar manualmente:
  - `curl -H "Authorization: Bearer <jwt>" http://localhost:3001/api/v1/cefr/levels` devuelve 6 entradas A1→C2.
  - `curl -H "Authorization: Bearer <jwt>" http://localhost:3001/api/v1/mastery/labels` devuelve `{ learning, reviewing, mastered }`.
- [ ] 5.4 Levantar frontend y verificar:
  - `/lessons` muestra A1 · Beginner, A2 · Elementary, etc. (idéntico a antes).
  - `/lessons/:id` muestra los chips de mastery con los mismos colores que antes.
  - `/study/:id` muestra los chips de mastery con los mismos colores que antes.
- [x] 5.5 Commit con mensaje `feat(learn): centralize CEFR + mastery labels in the backend API`.