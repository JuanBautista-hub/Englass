## 1. Backend: tts-segments module

- [ ] 1.1 Crear `apps/api/src/tts-segments/tts-segments.constants.ts` con los tipos `BilingualSegment = { text: string; lang: 'en' | 'es' }`, las funciones `parseBilingual(text)` y `sanitizeForTts(text)`, y las constantes regex (`QUOTE_REGEX`, `TIP_PREFIX_RX`). Copia literal del código actual en `apps/learn/src/app/core/services/tts.service.ts:29-67`.
- [ ] 1.2 Crear `apps/api/src/tts-segments/tts-segments.service.ts` con `getSegmentsForCard(cardId, userId): Promise<BilingualSegment[]>` que carga la card (con `lesson`) y devuelve `parseBilingual(sanitizeForTts(card.explanationEs))` o `[]` si `explanationEs` es null. Devuelve `NotFoundException` si `lesson.ownerId !== userId`.
- [ ] 1.3 Crear `apps/api/src/tts-segments/tts-segments.controller.ts` con `@Controller('cards')` + `@Get(':cardId/tts-segments')`. Autenticado.
- [ ] 1.4 Crear `apps/api/src/tts-segments/tts-segments.module.ts` y registrarlo en `AppModule.imports`.

## 2. Frontend: TtsSegmentsService

- [ ] 2.1 En `apps/learn/src/app/core/models.ts` añadir `BilingualSegment = { text: string; lang: 'en' | 'es' }` (export).
- [ ] 2.2 Crear `apps/learn/src/app/core/services/tts-segments.service.ts` (`providedIn: 'root'`) con `get(cardId): Promise<BilingualSegment[]>` que cachea por `cardId` usando `Map<string, Promise<BilingualSegment[]>>`. Si el cache tiene la promesa, la devuelve; si no, dispara HTTP y cachea la promesa.

## 3. Frontend: refactor tts.service.ts

- [ ] 3.1 En `apps/learn/src/app/core/services/tts.service.ts`:
  - Eliminar exports `parseBilingual`, `sanitizeForTts`, `TIP_PREFIX_RX`, `QUOTE_REGEX` y el tipo `BilingualSegment` (ahora vive en `models.ts`).
  - `speakRaw` ya no llama a `sanitizeForTts` (asume texto sanitizado).
  - Renombrar `speakBilingual(text, options)` a `speakSegments(segments, options)`. Recibe `BilingualSegment[]` pre-parseados.
- [ ] 3.2 `speakSegments` mantiene el comportamiento: itera los segmentos, llama `speakRaw` para cada uno, respeta `onSegment` callback y `rate`.

## 4. Frontend: refactor consumers

- [ ] 4.1 En `apps/learn/src/app/features/study/study.page.ts`:
  - Importar `TtsSegmentsService`.
  - Quitar el `parseBilingual(card.explanationEs)` local (línea 325).
  - En `speakBilingual(card)`, primero `await this.ttsSegments.get(card.id)`, luego `this.tts.speakSegments(segments, { rate: 0.95, onSegment })`.
- [ ] 4.2 En `apps/learn/src/app/features/lessons/lesson-detail.page.ts`:
  - Importar `TtsSegmentsService`.
  - Quitar el `parseBilingual(text)` local (línea 311).
  - `speakBilingualForCard(text, cardId)` cambia a `speakBilingualForCard(cardId)` (sin `text`): pre-fetch segmentos vía servicio, luego `this.tts.speakSegments(segments, ...)`.
  - Actualizar la llamada del template (línea 169) para pasar solo `c.id`.

## 5. Verification

- [ ] 5.1 `pnpm --filter @engclass/api typecheck && pnpm --filter @engclass/api build` verde.
- [ ] 5.2 `pnpm --filter @engclass/learn typecheck` verde.
- [ ] 5.3 `grep -r "parseBilingual\|sanitizeForTts" apps/learn/src` no devuelve matches.
- [ ] 5.4 Manual: `curl -H "Authorization: Bearer <jwt>" http://localhost:3001/api/v1/cards/<id>/tts-segments` devuelve un array de segmentos.
- [ ] 5.5 Manual: en `/lessons/:id` y `/study/:id`, el botón 🔊 EN+ES reproduce en orden correcto sin deletrear emojis ni corchetes `«»`.
- [ ] 5.6 Commit con mensaje `feat(learn): centralize bilingual TTS segmentation in the backend API`.