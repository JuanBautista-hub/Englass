## Context

`apps/learn/src/app/core/services/tts.service.ts` tiene tres capas:

1. **Navegador-API** (debe quedarse en frontend):
   - `pickVoice(lang)` — usa `window.speechSynthesis`
   - `speakRaw` / `speakBilingual` — usa `window.SpeechSynthesisUtterance`
   - `cancel`, `isSupported`, `listVoices`, `waitForVoices` — todos browser-only

2. **Lógica de dominio** (debe moverse al backend):
   - `parseBilingual(text)` — regex que reconoce marcadores `"…"`, `'…'`, `«…»` y asigna `lang: 'en' | 'es'` por segmento. Hoy vive en `tts.service.ts:39-55`.
   - `sanitizeForTts(text)` — limpia emojis, `«»`, `→`, dashes, whitespace. Hoy en `tts.service.ts:29-37`.

3. **Estado de UI** (debe quedarse en frontend):
   - `speakBilingual` recibe texto crudo hoy → debería recibir segmentos ya parseados.
   - `speakSegment(text, lang)` — nuevo método que toma un segmento y lo dice.

Las llamadas actuales en `study.page.ts:325` y `lesson-detail.page.ts:311` hacen `parseBilingual(card.explanationEs)` antes de invocar TTS. Eso es lo que el cambio elimina.

El backend ya tiene `apps/api/src/tts/` (mock audio synthesis: `POST /tts`). Es un concern diferente (síntesis de audio, no segmentación de texto). Para evitar confusión creo un módulo nuevo `apps/api/src/tts-segments/` con scope acotado.

## Goals / Non-Goals

**Goals:**
- `parseBilingual` y `sanitizeForTts` viven en un único archivo backend `apps/api/src/tts-segments/tts-segments.constants.ts`.
- Endpoint autenticado `GET /api/v1/cards/:cardId/tts-segments` que devuelve los segmentos del `explanationEs` de la card, después de validar propiedad.
- Frontend `TtsSegmentsService` cachea por `cardId` para la sesión.
- `tts.service.ts` del frontend pierde los exports `parseBilingual` y `sanitizeForTts`; su `speakBilingual` recibe segmentos pre-parseados.
- Las páginas (`study.page.ts`, `lesson-detail.page.ts`) llaman al servicio de segmentos antes de reproducir.

**Non-Goals:**
- No se cambia la lista de voces ni el ranking de Web Speech API (sigue siendo frontend).
- No se cambia el schema de Prisma (los `explanationEs` ya están en la tabla).
- No se pre-computan segmentos en BD (sigue siendo on-demand, porque el texto no cambia entre requests).
- No se introduce i18n.
- No se cambia `apps/api/src/tts/` (mock audio synthesis) — sigue siendo un módulo separado.

## Decisions

### 1. Módulo nuevo `apps/api/src/tts-segments/` (no añadir al `tts` existente)
**Decisión:** Crear `apps/api/src/tts-segments/` con `constants`, `service`, `controller`, `module`. NO añadir endpoints al `TtsController` existente.

**Por qué:** El `TtsController` actual hace síntesis de audio (devuelve WAV); añadirle segmentación de texto mezcla dos concerns y un endpoint con path confuso (`/tts/cards/:id/segments`). Módulos separados = rutas separadas = `/cards/:id/tts-segments` que se entiende.

**Alternativa:** Añadir el endpoint al `TtsController` con path `/tts/cards/:id/segments`. **Descartada** por lo anterior.

### 2. Validación de propiedad en el endpoint
**Decisión:** El endpoint hace `prisma.vocabularyCard.findUnique({ where: { id: cardId }, include: { lesson: true } })` y devuelve `404` si `lesson.ownerId !== userId`.

**Por qué:** Un usuario autenticado no debe poder leer los `explanationEs` de cards que no le pertenecen (información privada del seed/catálogo, sí, pero también de cards creadas por otros usuarios en el futuro). Es la misma regla que `LessonsService.findOne`.

**Alternativa:** Confiar en el cliente y devolver siempre los segmentos. **Descartada** por privacidad.

### 3. Caché in-memory por `cardId` en frontend
**Decisión:** `TtsSegmentsService` mantiene un `Map<string, Promise<BilingualSegment[]>>` (no `Promise` resuelto — la promesa misma se cachea, evitando race conditions donde dos requests idént en el disparen doble fetch).

**Por qué:** El usuario abre/cierra la misma card varias veces en una sesión. Una sola request HTTP basta.

**Alternativa:** Cachear el resultado resuelto (`Map<string, BilingualSegment[]>`). **Descartada** porque pierde la deduplicación si dos requests vuelan al mismo tiempo (uno empieza el fetch, el otro lo vería como `undefined` y dispararía otro).

### 4. `speakBilingual` cambia de firma
**Decisión:** `speakBilingual(text: string, options)` → `speakSegments(segments: BilingualSegment[], options)`. La función interna que parseaba el texto se elimina; la promesa interna espera a cada `speakRaw`.

**Por qué:** La función ya no tiene trabajo de parsing — solo orquesta. Que la firma lo refleje reduce confusión.

**Alternativa:** Mantener `speakBilingual(text, options)` y parsearlo internamente (re-mover `parseBilingual` al frontend). **Descartada** porque reintroduce el problema.

### 5. `speakRaw` ya no llama a `sanitizeForTts`
**Decisión:** `speakRaw(text)` ahora asume `text` ya saneado (porque viene de `TtsSegmentsService`). Se elimina la llamada interna a `sanitizeForTts`.

**Por qué:** Toda sanitización pasa por backend. El frontend solo pasa al motor de TTS lo que el backend ya preparó.

**Alternativa:** Mantener `sanitizeForTts` en frontend como red de seguridad. **Descartada** porque rompe "single source of truth".

### 6. `pickVoice` se queda en frontend
**Decisión:** El ranking de voces (`Natural` / `Neural` / `Premium` / `Enhanced` / `Google`) y el `lang: 'en' ? 'en-US' : 'es-ES'` mapping siguen en `tts.service.ts` porque depende de `window.speechSynthesis.getVoices()`.

**Por qué:** Es lógica de presentación/browser, no de dominio.

**Alternativa:** Mover el mapping de códigos BCP-47 al backend. **Descartada** porque el backend no tiene contexto de qué voz existe en cada SO del usuario.

## Risks / Trade-offs

- **[Risk] Doble round-trip cuando el usuario hace clic en "EN+ES"** — primero fetch de segmentos, luego la reproducción (que ya era local). Mitigación: la caché in-memory elimina esto en clicks subsecuentes. El primer click es marginal (~10-30ms).
- **[Risk] Backend caído → frontend sin segmentos** — el endpoint devuelve 500; la UI mostraría el botón sin efecto. Mitigación: el botón puede quedar disabled o mostrar error inline; aceptable porque la app entera depende del backend.
- **[Risk] Comportamiento diverge entre el parse actual y el nuevo** — copia exacta de la regex + sanitizer garantiza paridad. Mitigación: snapshot test del output para `«hola "world"»` en backend.
- **[Risk] `speakRaw` sin sanitización rompe con textos que vienen de otro origen** — actualmente solo `speakBilingual` le pasaba texto parseado/sanitizado. Si en el futuro alguien llama `speakRaw('Hola 💡')` directamente, el emoji se deletreará. Mitigación: documentar en `speakRaw` que asume texto sanitizado, y eliminar todas las llamadas que le pasen texto crudo.
- **[Trade-off] Overhead de BD en cada fetch** — el endpoint hace `findUnique` + lookup de `lesson`. Mitigación: índice único en `vocabularyCard.id` ya existe; la query es O(1).

## Migration Plan

1. **Desarrollo:**
   - Crear `apps/api/src/tts-segments/` con los 4 archivos.
   - Registrar `TtsSegmentsModule` en `AppModule`.
   - Crear `apps/learn/src/app/core/services/tts-segments.service.ts`.
   - Refactorizar `tts.service.ts`: eliminar `parseBilingual`, `sanitizeForTts`, `TIP_PREFIX_RX`, `QUOTE_REGEX`. Cambiar firma de `speakBilingual`.
   - Refactorizar `study.page.ts` y `lesson-detail.page.ts`: obtener segmentos vía servicio antes de reproducir.
2. **Despliegue:** un solo commit, deploy simultáneo backend + frontend. Sin migraciones de BD.
3. **Rollback:** revert del commit. El frontend vuelve a `parseBilingual` local; el backend conserva el módulo `tts-segments` pero queda sin uso (limpieza en un commit posterior).
4. **Verificación post-deploy:**
   - `GET /api/v1/cards/{cardId}/tts-segments` responde 200 con array.
   - "🔊 EN+ES" reproduce la explicación + ejemplos en orden correcto, sin deletrear emojis.

## Open Questions

- ¿Vale la pena cachear los segmentos en BD (campo `ttsSegments` JSON en `vocabularyCard`) para evitar el fetch? Por ahora no — el texto es estable y el parsing es trivial. Si el costo de la query crece (muchos cards / latencia alta), se puede añadir un campo computado en el futuro.
- ¿Debería `pickVoice` recibir un `voiceHint` del backend? Hoy el frontend elige solo. Si el backend sabe que el usuario prefiere una voz específica (por configuración guardada), podría pasarlo. Fuera de scope.