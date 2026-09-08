## Why

La metadata de CEFR (labels `Beginner`, `Elementary`, etc.) y los labels/colores de mastery (`learning` / `reviewing` / `mastered`) están hardcodeados en el frontend. Cada vez que se añade un nivel o se quiere ajustar el wording o el color, hay que tocar el frontend, redesplegar Angular, y mantener consistencia entre archivos. La regla del repo ("los prompts prohíben redeclarar tipos compartidos") se rompe aquí también: el frontend replica definiciones de dominio que pertenecen al backend.

## What Changes

- **Backend**: nuevo módulo `apps/api/src/labels/` que expone dos endpoints REST:
  - `GET /api/v1/cefr/levels` → array de `CefrLevelView` (`code`, `order`, `label`, `description`) en orden canónico `A1 → C2`.
  - `GET /api/v1/mastery/labels` → map `learning | reviewing | mastered` → `{ label, badgeClass }` donde `badgeClass` es un string de utilidades Tailwind listo para `[class]=…`.
- **Backend**: las definiciones viven en una sola tabla de constantes (`LEVEL_META`, `MASTERY_META`). `LESSONS_SERVICE` y `LEARNING_PATH_SERVICE` los reusan (el `LearningPathLevelView` puede seguir devolviendo solo `level: string` y el frontend resuelve label/orden con el endpoint).
- **Frontend**: nuevos servicios `CefrService` y `MasteryLabelsService` con caché en memoria. Componentes (`LearningPathComponent`, `LessonsPage`, `LessonDetailPage`, `StudyPage`) dejan de tener `levelLabel()` / `masteryLabel()` / `masteryClass()` hardcoded y leen del servicio.
- **Frontend**: el `LEVEL_ORDER = ['A1', …]` duplicado se elimina; el orden se respeta desde el endpoint.
- **BREAKING**: el frontend deja de funcionar si el backend no expone los nuevos endpoints. Mitigación: en los componentes, mantener un fallback mínimo (mapa `A1 → 'Beginner'`, etc.) que se sobreescriba en cuanto llegue la respuesta. Si el backend no responde, el frontend degrada a los labels por defecto (los mismos de hoy).

## Capabilities

### New Capabilities
- `cefr-level-catalog`: el backend es la fuente de verdad del catálogo de niveles CEFR (códigos, orden, labels, descripciones).
- `mastery-display-labels`: el backend devuelve los labels humanos y las clases de badge para los tres estados de mastery.

### Modified Capabilities
- *(ninguna)* — los specs existentes (`backend-system-prompt`, `frontend-system-prompt`) no cambian a nivel de requirement.

## Impact

- **Backend** (`apps/api`):
  - Nuevo módulo `apps/api/src/labels/` con `LabelsService`, `LabelsController`, `LabelsModule`.
  - `LabelsModule` registrado en `AppModule`.
  - Constantes centralizadas en `apps/api/src/labels/labels.constants.ts`.
  - `LearningPathService` puede reusar `LEVEL_META` para `LEVEL_ORDER` en lugar de declararlo localmente.
  - `LessonsService` reusa `LEVEL_META` para su `LEVEL_ORDER` y `LEVEL_RANK` ya existente.

- **Frontend** (`apps/learn`):
  - Nuevo servicio `apps/learn/src/app/core/services/cefr.service.ts` (singleton con caché en signal).
  - Nuevo servicio `apps/learn/src/app/core/services/mastery-labels.service.ts` (singleton con caché en signal).
  - Tipos `CefrLevelView` y `MasteryLabelView` en `apps/learn/src/app/core/models.ts`.
  - `LearningPathComponent.levelName()` reemplazado por lookup en el signal de CefrService (con fallback local).
  - `LessonDetailPage.masteryLabel()` / `masteryClass()` y `StudyPage.masteryLabel()` / `masteryClass()` reemplazados por lookup en MasteryLabelsService (con fallback local).

- **No hay migraciones de BD** — los metadatos viven en código.
- **No se cambian prompts ni OpenSpec capabilities existentes**.