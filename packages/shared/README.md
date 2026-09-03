# @engclass/shared

Single source of truth for cross-cutting types and runtime validators used by the Engclass frontend (`apps/web`) and backend (`apps/api`).

> ESM only. TypeScript strict. Zero runtime dependencies.

## Public exports

| Symbol | Kind | Source |
| --- | --- | --- |
| `Annotation` | type | `src/annotation.ts` |
| `ANNOTATION_LIMITS` | const | `src/annotation.ts` |
| `SubmissionStatus` | type | `src/dto/submission.ts` |
| `SubmissionPayload` | type | `src/dto/submission.ts` |
| `isDraft` | function | `src/dto/submission.ts` |
| `isImmutable` | function | `src/dto/submission.ts` |
| `LoginRequest` | type | `src/dto/auth.ts` |
| `RefreshResponse` | type | `src/dto/auth.ts` |
| `UploadResponse` | type | `src/dto/pdf.ts` |
| `TemplateSummary` | type | `src/dto/pdf.ts` |
| `ErrorCode` | type | `src/error-envelope.ts` |
| `ErrorEnvelope` | type | `src/error-envelope.ts` |
| `ERROR_CODE_BY_STATUS` | const | `src/error-envelope.ts` |
| `isErrorEnvelope` | function | `src/error-envelope.ts` |
| `SharedValidationError` | class | `src/validators/errors.ts` |
| `assertAnnotation` | function | `src/validators/annotation.ts` |
| `assertSubmissionPayload` | function | `src/validators/submission.ts` |

## Commands

```sh
pnpm --filter @engclass/shared install   # install dev deps
pnpm --filter @engclass/shared build     # tsc -b → dist/
pnpm --filter @engclass/shared test      # Jest with ≥ 90% statements
pnpm --filter @engclass/shared lint      # ESLint, zero warnings
```

## Validator examples

```ts
import {
  assertAnnotation,
  assertSubmissionPayload,
  isErrorEnvelope,
} from '@engclass/shared';

const a = { id: 'x', pageIndex: 0, x: 1, y: 2, text: 'hi', fontSize: 12 };
assertAnnotation(a); // OK; `a` is now typed as Annotation

const unknownBody: unknown = await res.json();
if (isErrorEnvelope(unknownBody)) {
  console.error(unknownBody.code, unknownBody.requestId);
}
```