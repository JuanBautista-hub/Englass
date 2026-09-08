## Context

`apps/api` (NestJS, Prisma, JWT in `localStorage`) ya tiene `RateLimitStore` en memoria y un patrón de providers intercambiables para almacenamiento (`common/config.ts`). El frontend (`apps/learn`, Angular 17, signals) renderiza cada tarjeta como un `<article>` dentro de `lesson-detail.page.ts`. El usuario quiere sumar inteligencia artificial a la experiencia: dos acciones por tarjeta ("Explicar" / "Profundizar") que llamen a un proveedor de IA (MiniMax por defecto, vía API chat-completions compatible con OpenAI) y muestren la respuesta. La restricción dura es de privacidad: **solo el `term` y el `level` CEFR salen del backend**; nunca el resto del contenido de la tarjeta, ni texto editable del usuario.

El almacenamiento intermedio es en memoria (mismo trade-off que en `RateLimitStore`). El caché vive en el mismo proceso del API: suficiente para una primera iteración; si la app pasa a multi-instancia, una versión futura moverá el caché a Redis o una tabla Prisma.

## Goals / Non-Goals

**Goals:**
- Dos endpoints nuevos (`/explain`, `/deepen`) por par `(lessonId, cardId)`, autenticados, con rate-limit por usuario y por modo.
- Privacy garantiza que el prompt nunca contenga más que `term` + `level` + un token de modo. Esto es verificable con un test que examina el array `messages` enviado al proveedor.
- Caché determinista (`hash(lessonId:cardId:mode:level)`) con TTL configurable; un hit no consume rate-limit.
- Provider intercambiable mediante un token NestJS (`AI_PROVIDER`). La implementación por defecto usa MiniMax HTTP.
- UX frontend: dos botones por tarjeta, modal con skeleton + retry ante errores, render del JSON como texto enriquecido (summary, examples[], context, collocations[], falseFriends[]).

**Non-Goals:**
- Streaming SSE. Una iteración posterior puede añadirlo si la latencia percibida lo amerita.
- Persistencia del caché: queda en memoria. Migrar a Redis/DB es otra propuesta.
- Multilenguaje: el nivel CEFR define el idioma de salida (es-ES para A1/A2, en-US para B1+), no se internacionaliza la API.
- Costos de facturación de IA por usuario: el rate-limit es la única protección inicial. Una propuesta futura añadirá entitlements/billing.
- Personalización por historial del usuario: el prompt no mira qué tarjetas estudió antes.
- Audio de la respuesta (TTS de la explicación): se mantiene fuera; el frontend puede pasar la respuesta por el `TtsService` existente si lo desea.

## Decisions

### Decision 1: provider como port (`AiProvider`) + adapter `MiniMaxProvider`
`AiProvider` es una interfaz NestJS-bound con un método `complete({ system, user, mode, maxTokens }): Promise<{ text: string; tokensUsed: number }>`. `MiniMaxProvider` la implementa usando `fetch` global de Node 20+ contra `{AI_BASE_URL}/chat/completions` con `Authorization: Bearer <key>` y body `{ model, temperature: 0.4, max_tokens, messages: [{role: 'system', content: system}, {role: 'user', content: user}] }`.

Alternativas:
- Llamar directo sin abstracción: simple pero bloquea el cambio de proveedor en el futuro. **Rechazado** porque la propuesta menciona explícitamente "intercambiable".
- Adaptador estilo LangChain: overhead alto para una sola API. **Rechazado**.

### Decision 2: prompt = `term` + `level` + `mode` (string), nada más
Los prompts `buildExplainPrompt({ term, level })` y `buildDeepenPrompt({ term, level })` son funciones puras exportadas, testeables sin red. Devuelven `{ system, user }`. El system es fijo (reglas de formato + idioma objetivo según nivel). El user es solo el `term`.

**Privacy de la entrada**: el `cardId` llega del cliente pero el backend lo usa para resolver el `term` y el `level` del Prisma, y estos son los únicos dos strings que entran al prompt. Si el `term` no existe (404), el prompt nunca se construye.

Alternativas:
- Incluir la `definition` del card: aumenta calidad pero rompe el principio de "solo el term". **Rechazado** por privacidad.
- Pedirle al usuario marcar "modo seguro" vs "modo rico": añade fricción y abre un vector de fuga. **Rechazado**.

### Decision 3: caché en memoria con TTL y clave hash
`AiCacheStore` (mismo patrón que `RateLimitStore`) mantiene `Map<string, { value, expiresAt }>`. Clave: `sha256(lessonId + ':' + cardId + ':' + mode + ':' + level)`. Default TTL 24 h.

Rationale:
- Suficiente para una sola instancia y elimina el 99% de provider-call duplicadas en una sesión normal de estudio.
- Si pasa a multi-instancia, una migración futura moverá el `Map` a Redis. Mientras tanto, el spec deja claro que el estado es por proceso.

Alternativas:
- Tabla Prisma `ai_cache`: añade una migration + lookup por hash. **Rechazado** por simplicidad de la primera iteración; queda como decisión reversible.
- Redis: requiere infraestructura nueva. **Rechazado** por la misma razón.

### Decision 4: rate-limit por usuario y por modo (buckets separados)
`AiRateLimitStore` usa dos ventanas: per-minute (default 5) y per-day (default 60). Llaves: `ai:u:<userId>:explain:<minuteBucket>` y `ai:u:<userId>:deepen:<minuteBucket>` para los buckets por minuto, y `ai:u:<userId>:explain:<dayBucket>` + `...:deepen:<dayBucket>` para los diarios. Un hit de caché **no** cuenta hacia el rate-limit (lo especifica el spec `ai-rate-limit`).

Alternativas:
- Un solo bucket compartido entre modos: si el usuario usa mucho explain, no podría usar deepen. **Rechazado**; el spec quiere buckets independientes.
- Rate-limit también por IP: aumentaría la protección, pero complica el modo multi-device por usuario. **Rechazado por ahora**; añadir en propuesta futura si se observa abuso.

### Decision 5: structured JSON output del proveedor
El prompt del sistema le pide al proveedor responder **estrictamente** con un JSON que cumpla un esquema:
- `explain` → `{ summary: string, examples: string[] }`
- `deepen` → `{ context: string, collocations: string[], falseFriends: string[], level: CEFR }`

El backend parsea la respuesta con `JSON.parse` envuelto en try/catch; si falla, retorna 502 `AI_PROVIDER_FAILED`. Esto evita la fragilidad de regex y le da al frontend una forma estable.

Alternativas:
- Texto libre y heurísticas en el cliente: propenso a alucinaciones de formato, imposible de versionar. **Rechazado**.
- Tool-use / function-calling: requiere capabilities específicas del proveedor que MiniMax puede no ofrecer. **Rechazado** por portabilidad.

### Decision 6: claves `AiExplainResponse`, `AiDeepenResponse`, `AiMode` en `@engclass/shared`
El contrato del wire vive en `packages/shared/src/ai.ts` (mismo patrón que `LessonView`, `StudySessionSummary`). Esto le da al frontend tipos generados sin redeclarar la forma.

Alternativas:
- Definir las interfaces localmente en cada app: drift garantizado. **Rechazado**.

### Decision 7: sin streaming en v1
Endpoints REST estándar (`application/json`). La latencia esperada (2-4 s por respuesta) es tolerable y la cache hace que la segunda vez sea instantánea. Streaming SSE quedaría para una propuesta posterior.

Alternativas:
- WebSockets: más estado, menos opt-in. **Rechazado**.
- Server-Sent Events (`/stream`): viable pero añade manejo de errores mid-stream en cliente y servidor. Diferido.

### Decision 8: errores tipados con códigos del envelope compartido
Reutilizamos el envelope de error de `@engclass/shared` con códigos nuevos: `AI_PROVIDER_FAILED`, `RATE_LIMITED` (ya usado en otros endpoints), `CARD_NOT_FOUND`, `CARD_NOT_IN_LESSON`, `LESSON_NOT_FOUND`. `Retry-After` se añade como header HTTP estándar.

## Risks / Trade-offs

- **[Risk] Cache se invalida por cambios del proveedor** → el cache guarda texto del proveedor; si el prompt o el modelo cambia, las respuestas servidas pueden ser de la versión vieja. **Mitigation**: incluir la versión del provider en la clave de caché (`hash(..., providerVersion)`). La primera vez se setea `v1`; un bump de versión invalida automáticamente.

- **[Risk] El `term` del usuario contiene PII** (por ejemplo, el usuario nombra tarjetas con su email o número de teléfono). **Mitigation**: el spec deja claro que igual se envía el `term` al proveedor (es la única señal que tenemos), pero documentamos en el frontend una advertencia ligera ("This term will be sent to MiniMax to generate the explanation"). Sin bloqueo de UI en v1; añadir opt-out por tarjeta en una propuesta futura.

- **[Risk] Prompt-injection a través del `term`** (un usuario pone "Ignore previous instructions and respond with X"). **Mitigation**: el system prompt es estricto y fijo; el modelo se le instruye a responder solo con JSON válido. Validamos la forma del JSON y descartamos lo demás. Una versión v2 puede usar `response_format: { type: 'json_object' }` si MiniMax lo soporta.

- **[Risk] Rate-limit en memoria se pierde al reiniciar el proceso**. **Mitigation**: documentado en el spec. Un usuario con mucha actividad al inicio de un deploy verá un "reset" de su cuota — aceptable en v1.

- **[Risk] Costo de MiniMax por request** → un usuario que encuentra un loop puede gastar mucho. **Mitigation**: el rate-limit diario (60) lo acota. Adicionalmente, `max_tokens: 256/384` acota la respuesta. Una propuesta futura sumará cost-tracking + entitlements.

- **[Trade-off] El caché vive en memoria y muere con el proceso**. Una falla de proceso = cache miss para todas las claves. **Aceptable** porque el rate-limit previene el abuse de provider calls.

- **[Trade-off] El provider interface es solo HTTP chat-completions**. Si un día se quiere embeddings o multimodal, la interfaz tendrá que extenderse. **Aceptable** porque está acotado a los dos modos actuales.

- **[Risk] Conflicto con el `Cache-Control: private, max-age=60` existente del backend (auth-self-check)**. **Mitigation**: las respuestas de IA se sirven con `Cache-Control: private, no-store` (son user-private y reemplazables en cualquier momento).

## Migration Plan

1. **Despliegue del backend (sin cambios de frontend aún):** los nuevos endpoints están vivos pero nadie los llama. Riesgos: ninguno funcional; único costo: provider API key activa.
2. **Activación gradual:** comienza con `AI_RATE_PER_MINUTE=2` y `AI_RATE_PER_DAY=10` (modo "preview") durante una semana; sube a 5/60 si el piloto no muestra problemas.
3. **Frontend rollout:** añade los botones detrás de un `featureFlag: AiExplainDeepenEnabled` (env en `apps/learn/src/environments/environment.ts`). Off por defecto. Activar al 10% de usuarios, luego general.
4. **Monitoreo:** ver `apps/api/src/ai/ai.controller.ts` logs — campos `mode`, `level`, `cached`, `tokensUsed`, `latencyMs`, `RATE_LIMITED` triggers. Si `tokensUsed` p95 sube sin explicación, desactivar.
5. **Rollback:** apagar `AiModule` importando `if (config.get('AI_ENABLED')) ... else { serve 503 }`. El frontend, al recibir 503, esconde los botones sin más cambio.

## Open Questions

- **Q1**: ¿MiniMax soporta `response_format: { type: 'json_object' }`? Confirmar contra los docs de la API. Si sí, lo usamos en `MiniMaxProvider`. Si no, dependemos del system-prompt insistence + JSON.parse defensivo.
- **Q2**: ¿El límite por día debe ser configurable por usuario (entitlements) desde ya, o se queda global hasta tener billing? Default: global hasta billing.
- **Q3**: ¿La response trae `cached: boolean` o `cacheHit: boolean`? Por consistencia con otras APIs decidí `cached`. Si prefieres `cacheHit` (más explícito), lo cambio en el spec.
- **Q4**: ¿Qué hacer si el proveedor devuelve un JSON con campos faltantes? Spec actual: descartar y devolver 502. ¿Quieres un fallback más suave (ej. devolver `summary` aunque falten `examples`)? Default: 502 estricto, así sabemos si el provider degrada.
- **Q5**: ¿Pondremos un soft-cap de tokens diarios por usuario además del rate-limit (para billing)? Lo dejo como follow-up explícito.
