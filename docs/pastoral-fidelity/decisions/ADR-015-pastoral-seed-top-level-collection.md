# ADR-015 — PastoralSeed como colección top-level de Firestore

## Estado

`accepted`

## Fecha

2026-05-25

## Contexto

Fase 1 (six-step spine) introduce el agregado `PastoralSeed`: producto de los 6 pasos de estudio personal que el pastor completa antes de generar el borrador del sermón. La entidad incluye 6 sub-pasos (reading/syntax/morphology/recognition/function/insight), referencias a estudios de palabras (Greek/Hebrew tutor), paralelos canónicos, tracking de tiempo + herramientas consultadas, y un audit log de paste events.

Tamaño esperado por seed: ~5–10 KB en estado completo (texto libre del pastor + arrays de word studies + parallels + tool usage + paste events).

Lifecycle: el seed nace cuando el pastor entra al `PastoralSeedWizard`, se actualiza ~docenas de veces vía autosave a lo largo de 30–90 min de estudio, y queda como evidencia auditable indefinida (pastor puede revisar profundidad de estudio histórica).

Tres opciones de persistencia se evaluaron:

1. **Subdoc del sermón** (`sermons/{sermonId}.pastoralSeed`) — phase-1 doc original.
2. **Subdoc del Project** (`projects/{projectId}.study.pastoralSeed`) — ADR-003 propone Project como raíz, pero `Project` entity está **diferido a Fase 5** (sin consumer aún).
3. **Colección top-level** (`pastoralSeeds/{seedId}` con `sermonId` ref + futuro `projectId` ref).

## Decisión

`PastoralSeed` se persiste como **colección top-level** `pastoralSeeds/{seedId}` con los siguientes campos de referencia:

- `sermonId: string` — sermón que el seed alimenta (1:1 v1)
- `projectId?: string` — populated en Fase 5 cuando `Project` aterrice
- `userId: string` — owner, base de Firestore rules
- `createdAt: timestamp`, `updatedAt: timestamp`

El servicio `PastoralSeedService` opera con queries por `sermonId` (single doc lookup, cheap) y por `userId` (audit histórica del pastor). En Fase 5 se agrega query por `projectId` sin reshape del documento.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Subdoc del sermón** (`sermons/{id}.pastoralSeed`) | Migración a Fase 5 (`Project.study.pastoralSeed`) requiere copy doc-por-doc + delete del campo viejo + actualizar todos los call-sites. Top-level → Project re-parent es solo update del `projectId` field. Adicionalmente bloata el sermón doc (~5–10 KB extra) y obliga a fetch completo del sermón para inspeccionar audit. |
| **Subdoc del Project** | `Project` entity diferido a Fase 5 sin consumer hoy. Crear el entity solo para alojar seed = scope creep de Fase 5 dentro de Fase 1, lo cual va contra el plan acordado en cierre de Fase 0. |
| **Colección top-level (elegida)** | Migración limpia a Fase 5 (re-parent vía field update). Independent lifecycle (audit histórica del pastor sin tocar sermones). Permisos finos vía `userId`. Trade-off: 2nd fetch al cargar wizard — aceptable, mitigado por hook con cache local + autosave debounced. |

## Consecuencias

### Positivas

- **Migración Fase 5 trivial**: agregar `projectId` field (ya reservado) + update server-side script que rellene `projectId` desde `sermon.projectId`. No reshape del documento, no copy doc-por-doc.
- **Audit histórica eficiente**: `where('userId', '==', uid).orderBy('updatedAt', 'desc')` devuelve track record completo del pastor sin escanear sermones.
- **Sermón doc liviano**: no se contamina con ~5–10 KB de seed audit.
- **Independent permissions**: Firestore rules pueden requerir `request.auth.uid == resource.data.userId` sin acoplarse a sermón rules.
- **Multi-artefacto futuro**: en Fase 5, un mismo `projectId` puede tener múltiples artefactos (sermon + study + newsletter) que comparten el mismo seed — top-level lo permite directo, subdoc requiere duplicación.

### Negativas

- **2 fetches al cargar wizard**: sermón + seed por separado. Mitigación: hook `usePastoralSeed(sermonId)` con cache local; autosave debounced 1s + optimistic UI.
- **2 documentos a mantener consistentes**: si se borra el sermón, el seed huérfano queda. Mitigación: cleanup callable (best-effort, no transactional) + seed audit retiene valor histórico incluso si sermón se borra.
- **Firestore index requerido** para query `where('sermonId') + orderBy('updatedAt')`. Definir en `firestore.indexes.json` al crear el repo.

### Neutrales

- Schema del seed es self-contained: no requiere joins ni denormalización del sermón ni del project.

## Impacto

- **Código afectado**:
  - `packages/domain/src/entities/PastoralSeed.ts` (nuevo)
  - `packages/infrastructure/src/firebase/FirestorePastoralSeedRepository.ts` (nuevo)
  - `packages/application/src/services/PastoralSeedService.ts` (nuevo)
  - `packages/web/src/hooks/usePastoralSeed.ts` (nuevo)
  - `firestore.rules` (collection rule nueva)
  - `firestore.indexes.json` (índice `userId + updatedAt` + `sermonId`)
- **Fases impactadas**: Fase 1 (esta decisión), Fase 5 (migración a `projectId`), Fase 2+ (Testigos consumen seed via `sermonId` lookup).
- **Migraciones requeridas**:
  - v1 (esta fase): ninguna — colección nueva.
  - Fase 5: script server-side que rellene `projectId` desde `sermon.projectId` cuando exista. Idempotente.
- **Reversibilidad**: media. Re-parenting a subdoc sería costoso pero técnicamente posible. La decisión es asumida estable.

## Referencias

- Phase doc: `phases/phase-1-six-step-spine.md`
- ADR relacionado: ADR-002 (six-step spine), ADR-003 (project como raíz, target migration), ADR-005 (manifesto extiende seed con `doxologicalApplication`)
- Memoria: `feature_pastoral_fidelity_roadmap`
