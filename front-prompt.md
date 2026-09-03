# Frontend Prompt — Fase 1

Actúa como un Desarrollador Frontend Senior especializado en Angular 17+. Entrega módulo completo production-ready, accesible y performante. Toda decisión debe respetar la spec `openspec/specs/frontend-system-prompt/spec.md`.

## Contexto
Módulo Angular para visualizar PDFs maestros y permitir al alumno anotar respuestas (cajas de texto flotantes sobre el PDF). El backend es Node/Express y devuelve coordenadas en **user-space PDF** (no píxeles del canvas); `pdf-lib` las dibuja tal cual. El contrato HTTP vive bajo `/api/v1`.

## Stack obligatorio
- Angular 17+ con **standalone components**, **Signals** y nuevo control flow (`@if`, `@for`, `@switch`).
- Visor PDF: **pdfjs-dist** (control total de coordenadas — NO mezclar con ngx-extended-pdf-viewer). API actual: `page.getViewport({ scale })`, `viewport.convertToPdfPoint(x, y)`, `viewport.convertToViewportPoint(x, y)`.
- Estilos: **Tailwind CSS** (excluyente: no CSS modular paralelo).
- HTTP: `HttpClient` + interceptor CSRF (header `X-CSRF-Token`).
- Routing: lazy-loaded feature module con `loadChildren`.
- Tipos compartidos: **`@engclass/shared`** (workspace `packages/shared`). Importar `Annotation`, DTOs y el envelope de error desde ahí. Prohibido redefinir.
- Tests: Jest (unit) para Fase 1; e2e opcional.

## Estructura
```
src/app/
  core/
    interceptors/
      csrf.interceptor.ts
    guards/
      auth.guard.ts
    services/
      auth.service.ts
  features/
    pdf-editor/
      components/
        pdf-viewer/
        annotation-input/
        toolbar/
        page-canvas/
      services/
        pdf-editor.service.ts
        pdf-renderer.service.ts
      pages/
        pdf-editor.page.ts
      pdf-editor.routes.ts
  app.routes.ts
  app.config.ts
packages/
  shared/
    src/
      annotation.ts
      dto/
      error-envelope.ts
```

## Modelos y contratos (fuente única: `@engclass/shared`)
```ts
import { Annotation, SubmissionPayload, ErrorEnvelope } from '@engclass/shared';
```
**Prohibido** declarar `Annotation` o `SubmissionPayload` localmente. El prompt asume que `packages/shared` ya existe; si falta, el siguiente paso es proponer la change `add-shared-types-package` antes de generar código.

```ts
// packages/shared/src/annotation.ts (referencia, no generar)
// export interface Annotation {
//   id: string;            // uuid generado en cliente
//   pageIndex: number;     // 0-based
//   x: number;             // user-space PDF (puntos)
//   y: number;             // user-space PDF (puntos), origen bottom-left
//   text: string;
//   fontSize: number;      // default 12, debe coincidir con backend (StandardFonts.Helvetica)
// }

// packages/shared/src/error-envelope.ts (referencia)
// export interface ErrorEnvelope {
//   statusCode: number;
//   message: string;
//   code: string;          // ej. "RATE_LIMITED" | "VALIDATION" | "NOT_FOUND" | ...
//   details?: unknown;
//   requestId: string;     // correlacionado con X-Request-Id
// }
```

## Servicios

### `PdfEditorService`
Responsabilidad: comunicación HTTP con el backend bajo `/api/v1`.

- `loadTemplate(templateId: string): Promise<ArrayBuffer>` → `GET /api/v1/pdfs/templates/:id/file`.
- `saveProgress(payload: SubmissionPayload): Promise<void>` → `POST /api/v1/pdfs/submissions`. No compila.
- `downloadCompiled(payload: SubmissionPayload): Promise<Blob>` → `POST /api/v1/pdfs/compile`. Devuelve Blob; dispara descarga vía `URL.createObjectURL`.
- Manejo centralizado de errores: traduce `HttpErrorResponse` cuyo body cumple `ErrorEnvelope` a un signal `errorMessage` que incluye `requestId` para mostrarlo al usuario.

### `PdfRendererService`
Responsabilidad: encapsular `pdfjs-dist` y la transformación de coordenadas.

- Estado interno: `pdfDocument: signal<PDFDocumentProxy | null>`.
- `loadDocument(arrayBuffer: ArrayBuffer): Promise<void>`.
- `getPage(pageIndex: number): Promise<PDFPageProxy>`.
- `renderPage(pageIndex: number, canvas: HTMLCanvasElement, scale: number): Promise<RenderTask>`.
- `screenToPdfPoint(canvas, screenX, screenY, pageIndex): { x: number; y: number }`.
- `pdfPointToScreen(canvas, pageIndex, pdfX, pdfY): { x: number; y: number }`.

### Transformación de coordenadas (CRÍTICO)

El backend opera en **user-space PDF** (origen bottom-left, unidades puntos). El canvas se renderiza a un `scale` arbitrario. Por tanto:

```ts
// Click en pantalla -> user-space
const rect = canvas.getBoundingClientRect();
const screenX = event.clientX - rect.left;
const screenY = event.clientY - rect.top;
const viewport = page.getViewport({ scale });
const [pdfX, pdfY] = viewport.convertToPdfPoint(screenX, screenY).map(n => Math.round(n * 100) / 100);

// Renderizar anotación existente -> píxeles del overlay
const [screenX2, screenY2] = viewport.convertToViewportPoint(pdfX, pdfY);
```

**Regla inquebrantable**: persistir SIEMPRE en user-space. Nunca en píxeles del canvas.

## Componentes

### `<pdf-viewer>` (contenedor scrollable)
- Mantiene signal `annotations: WritableSignal<Annotation[]>`.
- Recibe `(pageIndex, x, y)` de `<page-canvas>` y abre `<annotation-input>` en esa posición.
- **Rendimiento**: monta solo la página visible + 1 vecina por lado. Las páginas restantes se renderizan vía `requestIdleCallback`. Un `ResizeObserver` en el contenedor recalcula `pdfPointToScreen` para todas las anotaciones visibles al cambiar el tamaño.

### `<page-canvas>` (por página)
- Inputs: `pageIndex`, `scale`, `annotations` (filtradas por página).
- Tiene un `<canvas>` + un overlay `<div class="absolute inset-0" role="region" [attr.aria-label]="'Página ' + (pageIndex + 1)">` con las cajas de anotación posicionadas en píxeles del canvas.
- `(canvasClick)`: emite coordenadas user-space.
- Reacciona al `ResizeObserver` del viewer reposicionando sus anotaciones.

### `<annotation-input>` (caja flotante)
- Aparece en la posición del clic (en píxeles del overlay).
- `<textarea>` con auto-focus.
- `[Enter]` sin Shift → guarda (emite `save`) y cierra.
- `[Esc]` → cancela.
- `[Shift+Enter]` → salto de línea.

### Cada anotación renderizada
- Caja con `<textarea>` de solo lectura por defecto.
- Double-click o `F2` → modo edición.
- `Delete` / `Backspace` (con foco en la caja) → emite `delete(id)`.
- Botón ✕ visible al recibir foco → emite `delete(id)`.

### Navegación por teclado entre anotaciones
- `Tab` / `Shift+Tab` → siguiente / anterior anotación dentro de la página.
- `Arrow keys` → misma función (alternativa).
- `Enter` / `Space` sobre una anotación enfocada → entra en modo edición.

### Región de anuncios (`aria-live`)
- Un único `<div aria-live="polite" aria-atomic="true" class="sr-only">` en el viewer anuncia eventos: "Guardado", "Error al guardar (requestId: ...)".

### `<toolbar>`
- Botón **"Guardar avance"**: llama `saveProgress`.
- Botón **"Descargar PDF"**: llama `downloadCompiled`.
- Indicador: `Guardado hace X seg` (signal `lastSavedAt`).
- Spinner mientras `isLoading()`.
- Banner de error si `hasError()` que muestra el `requestId` del envelope y un botón "Copiar ID" (`navigator.clipboard.writeText`).

## Accesibilidad (obligatorio)
- Toda interacción descrita arriba es operable sólo con teclado.
- Overlay: `role="region"` con `aria-label="Página N"`.
- Live region: `aria-live="polite"` para anuncios.
- Cajas de anotación: `aria-label="Anotación N en página M"`; foco visible (no `outline: none`).
- Contraste mínimo 4.5:1 en el texto de la anotación sobre el PDF.
- No usar `:hover` como único disparador de UI crítica.
- Foco atrapado dentro del `<annotation-input>` mientras está abierto.

## Rendimiento (obligatorio)
- Política de montaje: sólo página visible ± 1.
- Renderizado diferido con `requestIdleCallback` (fallback `setTimeout(fn, 0)`).
- `ResizeObserver` en el `<pdf-viewer>` recalcula posiciones.
- Debounce en inputs (`debounceTime(150)`) para evitar reposicionamientos masivos al escribir.
- `IntersectionObserver` opcional para pausar render de páginas fuera de viewport durante scroll rápido.

## Estado reactivo (signals)
```ts
annotations = signal<Annotation[]>([]);
isLoading   = signal(false);
hasError    = signal<{ message: string; requestId: string } | null>(null);
lastSavedAt = signal<Date | null>(null);
activePage  = signal(0);
isInputOpen = signal(false);
```

- **Auto-guardado**: `effect()` con `debounceTime(2000)` que dispara `saveProgress` cuando `annotations()` cambia. **Suprimir** mientras `isInputOpen()`.
- **Flush en `beforeunload`**: handler registrado en `ngOnInit` que dispara `saveProgress` inmediatamente y espera hasta 5 segundos a la promesa para reducir pérdidas.
- **Hard caps**: rechazar la adición si `annotations().length >= 500`. Antes de enviar, serializar y comprobar `payloadBytes < 256 * 1024`; si excede, mostrar error UX sin enviar.
- **Loading**: `withLoading()` wrapper para spinners consistentes.
- **Estado vacío**: `@if (annotations().length === 0 && !isLoading() && !isInputOpen())` muestra hint "Haz clic sobre el PDF para añadir una respuesta".

## Routing
```ts
// pdf-editor.routes.ts
export const routes: Routes = [
  { path: ':templateId', component: PdfEditorPage, canActivate: [authGuard] }
];
```
- Lazy-load desde `app.routes.ts` con `loadChildren: () => import('./features/pdf-editor/pdf-editor.routes').then(m => m.routes)`.
- `authGuard` redirige a `/login` si no hay sesión válida (validada por `/api/v1/auth/me`).
- **Todas** las llamadas al backend usan la base `/api/v1`.

## Auth y CSRF
- El backend emite el access token en una cookie `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. El frontend **NO** lee ni escribe esa cookie en JavaScript.
- El backend emite además una cookie NO-`HttpOnly` `csrf-token` con un valor aleatorio.
- `csrf.interceptor.ts`: en cada request no-GET, lee `csrf-token` con `document.cookie` y añade el header `X-CSRF-Token: <valor>`.
- **Prohibido**: `localStorage`, `sessionStorage` o variables JS para tokens de acceso o refresh.
- 401 → redirige a `/login`.

### Mock backend (sólo Fase 1 / dev)
- Cuando `environment.useMockApi === true`, el `HttpClient` se enruta a `MockApiService` mediante `mockBackendInterceptor`, registrado **antes** de `csrfInterceptor` en `app.config.ts`.
- El interceptor corta cada request antes de salir a la red, llama `mockApi.handle({ method, url, body, headers })` y sintetiza un `HttpResponse` (o lanza `HttpErrorResponse` si el envelope tiene `statusCode >= 400`).
- El PDF demo se incluye como base64 en `core/services/demo-pdf.b64.ts` (regenerado por `pnpm --filter @engclass/web fixtures:build`) y se sirve como `ArrayBuffer` en `GET /api/v1/pdfs/templates/demo/file`.
- En el resto de flows (producción, staging), `useMockApi` está en `false` y el interceptor es un pass-through.
- El AI-assistant NO debe regenerar una implementación paralela del mock; debe reusar `MockApiService` y `mockBackendInterceptor` ya provistos.

## Errores (envelope compartido)
- Toda respuesta no-2xx del backend se ajusta a `ErrorEnvelope`.
- El banner de error muestra: `message` + `code` + `requestId` + botón copiar.
- Errores con `code === 'RATE_LIMITED'` → deshabilitar botón "Guardar avance" durante `Retry-After` segundos.

## Estilos
- Tailwind únicamente.
- Componentes UI primitivos (botones, inputs) con clases utility.
- Caja de anotación: borde dashed, fondo semi-transparente, `resize: none`.
- No confiar en `:hover` para mostrar acciones críticas.

## Versionado y lifecycle (UI)
- Las plantillas se muestran con su `version` y, si `deletedAt` está presente, un badge "Archivada".
- Cuando `submission.status === 'SUBMITTED' | 'GRADED'`: el editor entra en **modo lectura**:
  - `<annotation-input>` no se abre al hacer clic.
  - Las cajas se renderizan con `<textarea readonly>` y sin borde de edición.
  - El toolbar muestra "Descargar PDF" pero oculta "Guardar avance".

## Tests
- Cobertura mínima: **≥ 70% statements** en services y components.
- `pdf-renderer.service.spec.ts`: round-trip `screenToPdfPoint` ↔ `pdfPointToScreen` con PDF fixture.
- `pdf-editor.service.spec.ts`: mock HttpClient, verifica shape de requests y manejo del `ErrorEnvelope`.
- `annotation-input.component.spec.ts`: Enter guarda, Esc cancela, Shift+Enter inserta línea, F2 edita, Delete elimina.
- `csrf.interceptor.spec.ts`: añade `X-CSRF-Token` en POST/PUT/PATCH/DELETE, no en GET.
- `toolbar.component.spec.ts`: muestra `requestId` y permite copiarlo.

## Calidad
- `eslint` + `prettier` con **cero warnings**.
- Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
- Antes de declarar una tarea como terminada, ejecutar `npm run lint` y `npm test` y ambos deben pasar.

## Entrega
1. `package.json`, `angular.json`, `tailwind.config.js`, `tsconfig.json` (con project references a `packages/shared`).
2. Código completo archivo por archivo (sin snippets sueltos).
3. README breve con `npm install`, `npm start`, variables de entorno (`API_BASE_URL`, `COOKIE_DOMAIN`).
4. Evidencia: salida de `npm run lint` y `npm test`.