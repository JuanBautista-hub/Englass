## Context

El frontend (`apps/learn`) actualmente tiene hardcoded:

- `LearningPathComponent.levelName()` (`learning-path.component.ts:121-130`) — un map de códigos CEFR (`A1` → `'A1 · Beginner'`, etc.).
- `LessonDetailPage.masteryLabel()` y `masteryClass()` (`lesson-detail.page.ts:278-289`) — mapea `learning | reviewing | mastered` a label humano y clase Tailwind.
- `StudyPage.masteryLabel()` y `masteryClass()` (`study.page.ts:340-352`) — mismo mapeo, duplicado.

El backend ya tiene `LEVEL_ORDER` declarado **dos veces**:
- `apps/api/src/lessons/lessons.service.ts:69-72` (constante `LEVEL_ORDER` + `LEVEL_RANK`).
- `apps/api/src/learning-path/learning-path.service.ts:27`.

Y `apps/api/src/srs/srs.service.ts:26` tiene su propio `LEVEL_ORDER`.

Tres copias del mismo array en el backend es ruido, y los labels visuales en el frontend violan el principio de "single source of truth" ya aplicado a los tipos compartidos.

## Goals / Non-Goals

**Goals:**
- Una constante `LEVEL_META` en backend que sirve tanto al endpoint público como a los servicios internos.
- Una constante `MASTERY_META` que mapea cada estado de mastery a su label y clase Tailwind.
- Dos endpoints REST públicos: `GET /cefr/levels` y `GET /mastery/labels`.
- Frontend con dos servicios singleton (caché en `signal`) que reusan la misma key que devuelve el backend.
- Eliminación de los duplicados `LEVEL_ORDER` en backend y frontend.
- Fallback in-memory en frontend para que el render no se degrade durante el cold start.

**Non-Goals:**
- No se introduce i18n (los labels siguen en inglés; añadir traducciones es un change aparte).
- No se cambia el schema de Prisma (los metadatos viven en código, no en BD).
- No se cambian las clases Tailwind concretas (los `badgeClass` strings son los mismos que están hoy hardcoded en el frontend — esto es una **movida** de código, no un rediseño).
- No se cambia el contrato HTTP existente (los endpoints actuales siguen devolviendo los mismos shapes; se añaden dos nuevos).
- No se tocan los prompts (`front-prompt.md`, `backend-prompt.md`).

## Decisions

### 1. Constantes en un único archivo compartido
**Decisión:** Crear `apps/api/src/labels/labels.constants.ts` con `LEVEL_META` y `MASTERY_META`. Exportar también `LEVEL_ORDER` (derivado) y `LEVEL_RANK` (derivado) para que `LessonsService` y `LearningPathService` los importen.

**Por qué:** Hoy hay tres copias de `LEVEL_ORDER` (lessons.service, learning-path.service, srs.service). Consolidar en un módulo evita drift.

**Alternativa:** Mantener las constantes donde están y solo exponer por HTTP. **Descartada** porque deja el problema de drift interno sin resolver.

### 2. Endpoint dedicado vs. piggy-back en `/learning-path`
**Decisión:** Crear `apps/api/src/labels/labels.controller.ts` con dos endpoints independientes (`GET /cefr/levels`, `GET /mastery/labels`). No se modifica `/learning-path`.

**Por qué:** Los metadatos son ortogonales al path. Mezclarlos inflaría el response de `/learning-path` y obligaría al frontend a extraerlos de ahí.

**Alternativa:** Añadir `cefr: CefrLevel[]` y `masteryLabels: {...}` al response de `/learning-path`. **Descartada** porque acopla concerns y dificulta caching selectivo en el frontend.

### 3. Caché en `signal` en frontend
**Decisión:** Cada servicio (`CefrService`, `MasteryLabelsService`) mantiene un `signal<...>` poblado en el `constructor` con un fetch asíncrono (fire-and-forget). Expone un método `get()` que devuelve el signal (sync) o un `getAsync()` para esperar al primer fetch.

**Por qué:** Los metadatos son estáticos durante una sesión. Una sola request HTTP al cargar la app basta; cachear evita requests repetidos.

**Alternativa:** Usar un `HttpInterceptor` que cache por URL. **Descartada** porque añade complejidad para un caso simple.

### 4. Fallback in-memory
**Decisión:** Cada servicio declara un `FALLBACK: CefrLevel[]` (o `MasteryLabels`) con los mismos valores hardcoded actuales. Mientras el fetch no completa o falla, el `signal` mantiene el fallback.

**Por qué:** Garantiza que un deploy parcial (frontend actualizado antes que backend, o backend caído) no rompa el render.

**Alternativa:** Fallar duro si el backend no responde. **Descartada** porque degrada UX sin motivo.

### 5. Servicios reusables (`LEVEL_META`, `MASTERY_META`)
**Decisión:** `LessonsService` y `LearningPathService` importan `LEVEL_ORDER` y `LEVEL_RANK` desde `labels.constants.ts` y eliminan sus copias locales. `SrsService` también.

**Por qué:** Single source of truth interno; agregar `C2` es editar un solo archivo.

**Alternativa:** Dejar las constantes donde están. **Descartada** por la razón de la decisión 1.

### 6. Clase Tailwind como string completo
**Decisión:** `MASTERY_META.mastered.badgeClass = 'bg-emerald-100 text-emerald-800'` (string completo, no array ni objeto). El frontend lo aplica directamente con `[class]="masteryLabels()[c.mastery].badgeClass"`.

**Por qué:** Mismo formato que está hoy hardcoded en `lesson-detail.page.ts:285` y `study.page.ts:347`. Cero cambio de estilo — solo cambio de fuente.

**Alternativa:** Devolver un objeto `{ bg: 'emerald', text: 'emerald-800' }` y componer en frontend. **Descartada** porque requiere reescribir la lógica de clases y arriesga cambios visuales accidentales.

### 7. Nuevo módulo Nest `LabelsModule`
**Decisión:** Crear `apps/api/src/labels/` con `LabelsModule`, `LabelsController`, `LabelsService`, `labels.constants.ts`. Registrar en `AppModule.imports`.

**Por qué:** Sigue el patrón del repo (cada dominio en su módulo). El service es trivial (lee las constantes), pero aísla los endpoints bajo `/api/v1/cefr/levels` y `/api/v1/mastery/labels` con sus controllers limpios.

**Alternativa:** Añadir los endpoints a `LessonsController`. **Descartada** por separación de concerns.

## Risks / Trade-offs

- **[Risk] Cold start visual** — antes del primer fetch, el frontend usa el fallback; si el backend decide cambiar un label y desplegar antes que el frontend, los usuarios verán el label viejo durante ~1 request. → Mitigation: el fallback es exactamente el valor actual, así que solo importa si backend cambia sin actualizar el frontend (escenario raro y recuperable con un redeploy).
- **[Risk] Tailwind purge** — si el frontend no usa estáticamente las clases `bg-emerald-100` etc., el compilador de Tailwind las puede purgar del bundle final. → Mitigation: las clases ya están hardcoded hoy en `lesson-detail.page.ts:285` y `study.page.ts:347`, así que el scanner las detecta. Si se rompe en producción, agregar safelist a `tailwind.config.js`.
- **[Risk] Duplicación constante durante la transición** — durante el deploy, el frontend antiguo sigue usando sus copias locales (sin breaking change). → Mitigation: el contrato HTTP es aditivo; los endpoints nuevos no rompen clientes existentes.
- **[Trade-off] Request adicional al cargar la app** — dos requests más en el primer load. → Mitigation: son respuestas < 1 KB y se cachean en `signal` durante toda la sesión.

## Migration Plan

1. **Desarrollo:** añadir `labels.constants.ts`, `LabelsService`, `LabelsController`, `LabelsModule`; refactorizar `lessons.service.ts`, `learning-path.service.ts`, `srs.service.ts` para importar del nuevo módulo; añadir `CefrService` y `MasteryLabelsService` en frontend; reemplazar `levelLabel()` / `masteryLabel()` / `masteryClass()` por llamadas a los servicios.
2. **Despliegue:** un solo commit, deploy simultáneo de backend y frontend (ambos cambios ship juntos). No requiere migraciones de BD.
3. **Rollback:** revert del commit. Los endpoints `/cefr/levels` y `/mastery/labels` desaparecen pero el frontend tiene fallback idéntico a los valores viejos, así que sigue funcionando.
4. **Verificación post-deploy:**
   - `GET /cefr/levels` responde 200 con 6 entradas en orden A1 → C2.
   - `GET /mastery/labels` responde 200 con 3 keys.
   - Las páginas `/lessons` y `/lessons/:id` siguen mostrando los mismos labels y badges que antes.

## Open Questions

- ¿Vale la pena exponer también un endpoint de "Achievement badges" (iconos, labels, colores)? Es el siguiente paso natural pero fuera de este change.
- ¿La descripción del nivel (`description`) debe ser traducible? Hoy va hardcodeada en inglés; lo dejo así para no abrir i18n en este change.