## Why

`parseBilingual()` y `sanitizeForTts()` viven en `apps/learn/src/app/core/services/tts.service.ts`. Ambas codifican conocimiento del dominio: cómo detectar segmentos en inglés dentro de explicaciones en español (marcadores `"…"`, `'…'`, `«…»`), cómo sanear emojis y caracteres raros para que la Web Speech API no los deletree literal, y cómo mapear los segmentos a códigos BCP-47. Esta lógica es invariante del dispositivo y debería ser la misma para cualquier consumidor (futura app móvil, integración con TTS de servidor, etc.).

## What Changes

- **Backend**: nuevo módulo `apps/api/src/tts-segments/` con:
  - `tts-segments.constants.ts` que exporta `parseBilingual(text)` y `sanitizeForTts(text)` (las mismas funciones que están hoy en `tts.service.ts`, portadas a TS sin dependencias de browser).
  - `tts-segments.service.ts` con `getSegmentsForCard(cardId, userId)` que valida propiedad y devuelve `BilingualSegment[]`.
  - `tts-segments.controller.ts` con `GET /api/v1/cards/:cardId/tts-segments` (autenticado).
  - `tts-segments.module.ts` registrado en `AppModule`.
- **Frontend**: nuevo servicio `apps/learn/src/app/core/services/tts-segments.service.ts` con caché en memoria por `cardId`.
- **Frontend**: `tts.service.ts` ya no exporta `parseBilingual` ni `sanitizeForTts`. `speakBilingual` ahora acepta segmentos pre-parseados (`BilingualSegment[]`) en vez de texto crudo.
- **Frontend**: `study.page.ts` y `lesson-detail.page.ts` piden segmentos al servicio antes de invocar TTS. Eliminan la dependencia de `parseBilingual`.
- **BREAKING**: `parseBilingual` y `sanitizeForTts` dejan de existir como exports de `@engclass/...`. Mitigación: ningún archivo fuera de `tts.service.ts`, `study.page.ts`, `lesson-detail.page.ts` los importa (verificable con search). Las funciones se mueven al backend sin cambio de comportamiento.

## Capabilities

### New Capabilities
- `tts-segmentation`: el backend es la fuente de verdad para parsear texto bilingüe (ES/EN) y sanear caracteres problemáticos para TTS. Expone un endpoint REST autenticado.

### Modified Capabilities
- *(ninguna)* — los specs existentes (`backend-system-prompt`, `frontend-system-prompt`, `cefr-level-catalog`, `mastery-display-labels`) no cambian.

## Impact

- **Backend** (`apps/api`):
  - Nuevo módulo `apps/api/src/tts-segments/` (~4 archivos: constants, service, controller, module).
  - Sin migraciones de BD — la lógica es stateless.
  - El endpoint valida propiedad: `cardId → vocabularyCard.lessonId → lesson.ownerId === userId`.

- **Frontend** (`apps/learn`):
  - Nuevo servicio `apps/learn/src/app/core/services/tts-segments.service.ts` con caché.
  - `tts.service.ts` pierde ~60 líneas (parseBilingual, sanitizeForTts, TIP_PREFIX_RX, QUOTE_REGEX) y cambia la firma de `speakBilingual`.
  - `study.page.ts:325` y `lesson-detail.page.ts:311` eliminan su llamada local a `parseBilingual`; en su lugar, pre-fetch vía `TtsSegmentsService`.
  - Tests existentes de `tts.service.ts` (si los hubiera) se quedan — solo cambia la firma.

- **No hay migraciones de BD ni cambios en el schema de Prisma**.
- **No se cambian prompts ni specs existentes**.