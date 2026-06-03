# Phase 3 — Pass de fidelidad claim↔source en borrador

## Estado

`complete` — cerrada 2026-06-03 con `/cerrar-fase 3`. Plan locked + ADR-029 escrito.
- **PR 1** (fidelity pass core + per-marker verdicts panel) — ✅ MERGEADO #287 (2026-05-30).
- **PR 2** (publish gate + thresholds + override + audit) — ✅ MERGEADO #289 (2026-05-31).
- **PR 3** (plurality validator — no-proof-texting) — ✅ MERGEADO #290 (2026-05-31).
- **PR 4** (authority subordination + prompt clause) — ✅ MERGEADO #298 (2026-06-01).
- **PR 5** (attribution footer) — ✅ MERGEADO #300 (2026-06-03), merge commit `3aefc7a8`.
  CI verde (Build / Lint+TypeCheck / Run Tests). **Cierra Fase 3.**

**Smoke manual pendiente** (no bloquea cierre, consistente con patrón de la fase): export con
SBLGNT → página "Atribuciones". Se ejecuta al flip del flag `fidelity_pass` (default off hoy, Q10).

Prereqs actualizados al cerrar Fase 2.5 (2026-05-29). Lista de dependencias
satisfechas + no satisfechas + preguntas emergentes + riesgos cross-fase abajo.

## Objetivo

Implementar segundo-pass LLM que evalúa, para cada marcador `[N]` del borrador generado, si el chunk
citado realmente respalda la oración a la izquierda del marcador. Surface al pastor los marcadores
dudosos antes de publish. Gate de publish basado en thresholds (>20% `unrelated|contradicts` →
hard-block, override impossible; `partial` → soft-block con justificación ≥100 chars audit-logged).

Cierra el gap más grande del motor de citas actual: validamos identidad (Fases B+C ya en main), NO
fidelidad.

Extiende con 3 validators de [ADR-006](../decisions/ADR-006-rights-aware-citation-system.md):

- **Plurality** (no-proof-texting): claims sustantivas exigen ≥2 pasajes bíblicos distintos.
- **Attribution**: licencias CC BY/BY-SA honoradas — el render final incluye atribución obligatoria.
- **Authority**: detecta "WCF dice X, por tanto X" → confronta, exige reformular apelando al texto.

## Handoff Fase 2.5 → Fase 3 (snapshot al cierre 2.5, 2026-05-29)

### Satisfechos (al cierre Fase 2.5, 2026-05-29)

| Prereq | De dónde viene | Estado |
|---|---|---|
| Fase 1 (six-step → 8-step spine canónico) | Fase 1.6 PR #265 (ADR-022) | ✅ |
| Fase 2 (tres testigos para validar semilla) | Fase 2 PR #262 (ADR-011) | ✅ |
| Fase 1.5 (Pastoral Word Study — usabilidad pastoral lexicon) | Fase 1.5 PR #258 | ✅ |
| Fase 2.5 (Study Depth Copilot — coverage model 1:1 con seed) | Fase 2.5 PRs #267–#285 (ADR-025/026/027/028) | ✅ |
| Motor de citas Fases B+C en producción | Pre-Pastoral Fidelity (branch `feat/phase-c1-export-with-citations`) | ✅ |
| `citationManifest` persistido por sermón | PR #213 | ✅ |
| `studyDepthSnapshot` embedded en `Sermon.ts` | Fase 2.5 PR #269 | ✅ — disponible como contexto para ajustar threshold de fidelity pass por cobertura del estudio que originó el borrador |
| `pastoralSeed.witnessReview` (respuestas del pastor a confrontaciones) | Fase 2 PR #262 + Fase 2.5 PR #269 | ✅ — signal de engagement con confrontación, útil para el authority check |
| `AiAssistLog` cobertura completa (8 pasos + `stepOrientation`) | Fase 1.6 PR #265 + Fase 2.5 PR #267 | ✅ — base para "% tuyo" del sermón generado |
| `ILlmClient` port + `GeminiLlmClient` adapter | Fase 2.5 PR #267 (Q7) | ✅ — **usar este port** para el fidelity evaluator callable nuevo, NO `GoogleGenerativeAI` directo |
| `WitnessOrchestrator` + cache pattern `witnessResults/` | Fase 2 + Fase 1.6 | ✅ — patrón de classifier batcheado reusable para fidelity pass per-marker |
| `confessionsCatalog` + multi-witness pattern | Fase 0 (ADR-010) | ✅ — base para `AuthorityReport` (detectar uso de credo como autoridad final) |

### No satisfechos (deuda heredada o intencional)

- **PD content trasfondo histórico** — Fase 1.6 dejó la infra RAG; contenido sigue sin ingestar
  por el fundador. **Fase 3 NO depende** de esto (fidelity pass evalúa claim vs chunk
  real cited; si el chunk es bíblico o de la biblioteca del pastor, no necesita PD). Documentado
  para visibilidad.
- **LLM provider abstraction** — `tech_debt_llm_provider_abstraction`. ~34 callers directos a
  Gemini SDK. **Fase 3 debe usar `ILlmClient`** (patrón de 2.5) para el fidelity evaluator, no
  importar `@google/generative-ai` directo. Si Fase 3 toca callables legacy, no rebrandeo
  obligatorio — eso es track separado.
- **Cache `orientStudy`/`buildStructuralPuzzle`** — propuesto para PR post-2.5 (subcolección por
  seed con clave estructural `hash(passage + stepKey + pastorInput + simplify)`). **Fase 3 debería
  shippear con cache análogo** desde el día 1 (fidelity pass per-marker es naturalmente cacheable:
  clave = `hash(claim + chunkContent + evaluatorPromptVersion)`).
- **Cleanup duplicación Bible parser** — `tech_debt_bible_parser_duplication`. **Fase 3 NO
  depende** salvo que toque referencias bíblicas dentro del fidelity evaluator; si las toca, leer
  la memoria + verificar receta `grep` post-build en BOTH `BibleContext-*.js` Y `index-*.js`.
- **Tier 3 v2 dependency-diagram puzzle** — propuesta abierta (PR #278) para Sprint 2. NO es
  prereq de Fase 3.

### Riesgos cross-fase

| Riesgo | Mitigación |
|---|---|
| Fidelity pass introduce nuevo callable LLM con Gemini directo en lugar de `ILlmClient` → cementa deuda | Code review: cualquier `import { GoogleGenerativeAI }` en `packages/functions/src/` nuevo es red flag. Usar `ILlmClient` mirror local pattern (ver `LlmClient.ts` + `GeminiLlmClient.ts`). |
| Fidelity pass per-marker sin cache → costo explota (N markers × M sermones × dinero) | Diseñar el cache desde el día 1, no agregarlo después. Patrón `witnessResults/` + key estructural. Ver § "Detalle TBD". |
| Pre-gen gate (2.5) + fidelity pass (3) confunden al pastor con dos confrontaciones secuenciales | Decisión de UX al iniciar fase: ¿el fidelity pass es parte del mismo gate de 2.5 (segundo bloque post-generar), o es un gate independiente pre-publish (tercero)? Ver § "Decisiones pendientes". |
| Fidelity pass marca como `unrelated` un claim que el `studyDepthSnapshot` muestra que el pastor SÍ cubrió en profundidad | Considerar el snapshot como input al prompt del evaluador (no como gate, como contexto). Pastor con cobertura `profundo` en D5 + claim marcado `unrelated` por el LLM = posible falso positivo del evaluador. |
| Cambios en `BibleService` para fidelity pass tocan parser → deben mirrorearse web↔infra | Leer `tech_debt_bible_parser_duplication` antes de cualquier cambio en `packages/{web,infrastructure}/.../bible/repositories/`. JSDoc warnings ya están en los archivos. |

### Preguntas nuevas que surgieron en Fase 2.5 (para decidir al iniciar Fase 3)

1. **¿Fidelity pass usa `studyDepthSnapshot` como input al prompt?** Pastor con cobertura
   `profundo` en una dim relacionada al claim merece mayor benefit-of-the-doubt; pastor con
   cobertura `iniciado` merece evaluación estricta.
2. **¿Pre-gen gate (2.5) y fidelity pass (3) son secuenciales o el fidelity pass es post-gen
   block?** El gate de 2.5 confronta antes de generar; el fidelity pass es naturalmente post-gen
   (necesita el sermón ya generado para evaluar markers). Probable orden: gate 2.5 → genera →
   fidelity pass → publish.
3. **¿El Tier 3 puzzle estructural produce artefacto consumible por el fidelity pass?** El puzzle
   genera `StructuralPuzzle` con clauses + canonical roles. Si Fase 3 quiere validar que un claim
   se apoya en la cláusula CORRECTA del pasaje, el puzzle podría exponer esa estructura como
   evidencia. Decisión de scope al iniciar.
4. **¿Tier 3 v2 (dependency-diagram) cambia esto?** Si v2 ship en Sprint 2 antes de empezar Fase
   3, el output (`StructuralDiagram` con esqueleto + roleLabel) es más rico — fidelity pass
   podría usar el `roleLabel` ("apositivo", "subordinada causal") para detectar claims que
   apoyan una cláusula subordinada como si fuera la principal.
## Prerequisitos — ESTADO

| Prereq | De dónde viene | Estado |
|---|---|---|
| Fase 1 + 1.6 + 2 + 2.5 cerradas (seed + tres testigos + study depth producen borradores fundamentados) | Fases anteriores | ✅ |
| Motor de citas Fases B+C en main | PRs Phase B.1-B.5 + C.1 (commits `a174ac05`, `b15dfcf5`, `248c40d6`, `2b74237a`, `21ba44c9`) | ✅ |
| `citationManifest` persistido por sermón (`wizardProgress.draft.citationManifest`, mirror en `sermons/{id}/content.citationManifest`) | PR #213 | ✅ |
| `validateCitations` domain pure function (identity-only) | [`packages/domain/src/services/validateCitations.ts:48`](../../packages/domain/src/services/validateCitations.ts) | ✅ |
| `aggregateRequiredAttributions` (computa AttributionBlock[] desde manifest) | [`packages/domain/src/services/aggregateRequiredAttributions.ts`](../../packages/domain/src/services/aggregateRequiredAttributions.ts) | ✅ renderizado PDF + Docx + web view (PR 5); split SBLGNT BY 4.0 / MorphGNT BY-SA 4.0 |
| `LibraryResource` + `DocumentChunk` con rights fields (license, ingestionStatus, requiredAttribution, etc.) | [`packages/domain/src/entities/LibraryResource.ts`](../../packages/domain/src/entities/LibraryResource.ts), [`DocumentChunk.ts`](../../packages/domain/src/entities/DocumentChunk.ts) | ✅ |
| `SermonService.publishSermon(id)` — gate point natural | [`packages/application/src/services/SermonService.ts:126`](../../packages/application/src/services/SermonService.ts) | ✅ |
| `study_depth` flag + modo experto self-service (SDS>80, N sermones) | Fase 2.5 ADR-027 | ✅ — Fase 3 reusa el mismo gate experto |
| `AiAssistLog` audit infrastructure | Fase 1.6 + cableado completo Fase 2.5 PR A | ✅ |

**Deuda heredada** (no bloquea, pero documentada):
- **SBLGNT license discrepancia** — ✅ RESUELTA en PR 5 (2026-06-02). Decisión locked del fundador
  (2026-05-30): split en dos blocks — texto base **CC BY 4.0** + morfología **CC BY-SA 4.0**
  (latente). El código ahora renderea ambos según `hasMorphologyRendered`. Legal review del split
  queda fuera de banda (no bloquea). Ver bitácora 2026-06-02.
- **SBLGNT hardcoded como constante** en `aggregateRequiredAttributions.ts` (ahora
  `SBLGNT_TEXT_ATTRIBUTION` + `MORPHGNT_ATTRIBUTION`), no viene del catálogo CORE Library. Tech debt
  de Fase 0 NO resuelta en Phase 3 (Q8); mover a catalog viene con próxima ingesta CORE. Memoria
  `tech_debt_sblgnt_hardcoded` creada al cerrar PR 5.
- **Claim-level metadata ausente**: `SermonContent.body[]` son párrafos prosa sin tagging por
  oración. PR 3 (Plurality) extrae claims con LLM tagger antes de validar pluralidad.

## Decisiones tomadas — Q1-Q10 (lock 2026-05-30, ADR-029)

Resueltas en sesión kickoff `/iniciar-fase 3`. Detalle + justificación en
[ADR-029](../decisions/ADR-029-fidelity-pass-gate-policy.md).

| # | Pregunta | Decisión |
|---|---|---|
| Q1 | Modelo LLM evaluator | **Gemini Flash batched** para evaluar todos los markers; **escalar a Sonnet 4.6** los verdicts `partial`/`contradicts` para razonamiento más fino. Costo estimado <$0.05/sermón. |
| Q2 | Granularidad del claim | **Oración completa antes del marker** (regex de fin de oración). NO claim semántico extraído (evita LLM extra). |
| Q3 | Threshold del gate | **20% `unrelated|contradicts` → hard-block sin override**. `>10% partial` → soft-block con justificación. Toggle admin para calibrar post-launch con corpus real. |
| Q4 | Detección de claim sustantiva (PR 3) | **LLM tagger en el mismo batch del fidelity pass** (no call separado). Reusa Gemini Flash. |
| Q5 | Modo experto / skip fidelity pass | **Reusa el gate de Fase 2.5** (SDS>80, N sermones threshold). NO doble paternalismo. |
| Q6 | Re-run y cache | **Invalidar solo verdicts del marker afectado** cuando user re-cita/re-genera una oración. Full report intacto. |
| Q7 | Attribution footer scope | **TODOS los surfaces**: PDF + Docx + web view. Full compliance CC BY/BY-SA. |
| Q8 | SBLGNT hardcoded | **Dejar esta fase** + memoria nueva de deuda. Mover a catalog CORE en próxima ingesta Fase 0. |
| Q9 | PR ordering | **Secuencial 1→2→3→4→5**. NO priorizar PR 5 antes (aunque sea compliance). |
| Q10 | Sub-flag `fidelity_pass` | **Default off** en PR1-4. Flip default on tras smoke con 1-2 usuarios reales. |

## Arquitectura propuesta

### Schema

```typescript
// packages/domain/src/entities/FidelityReport.ts (new)

interface FidelityReport {
  version: '1';
  reportId: string;
  sermonId: string;
  generatedAt: Date;
  modelTier: 'flash' | 'sonnet' | 'mixed';  // tracking Q1 tiering
  verdicts: FidelityVerdict[];
  summary: FidelitySummary;

  // Sub-reports opt-in (Discrepancia D3 — composables, no monolítico)
  pluralityReport?: PluralityReport;      // PR 3
  attributionReport?: AttributionReport;  // PR 5
  authorityReport?: AuthorityReport;      // PR 4

  gateStatus: 'pass' | 'soft-block' | 'hard-block';
  gateOverride?: GateOverride;            // PR 2
}

interface FidelityVerdict {
  marker: number;                          // [N]
  claim: string;                           // sentence_before(marker), Q2
  citedSource: ChunkRef;
  verdict: 'supports' | 'partial' | 'unrelated' | 'contradicts';
  reasoning: string;
  confidence: number;
  modelUsed: 'flash' | 'sonnet';           // Q1
  evaluatedAt: Date;
  stale?: boolean;                         // Q6 — set when marker re-cited
}

interface FidelitySummary {
  supports: number;
  partial: number;
  unrelated: number;
  contradicts: number;
  totalMarkers: number;
  unrelatedRatio: number;                  // for gate calc
}

interface GateOverride {
  reason: string;                          // ≥100 chars
  overriddenAt: Date;
  overriddenBy: UserId;
  bypassedKind: 'partial' | 'plurality' | 'authority';
  // hard-block (>20% unrelated|contradicts) NO admite override
}

// PR 3
interface PluralityReport {
  substantiveClaims: SubstantiveClaim[];
  failures: SubstantiveClaim[];            // <2 distinct biblical sources
}

interface SubstantiveClaim {
  claimText: string;
  detectedLevel: 'core' | 'distinctive' | 'open-evangelical';
  biblicalSources: PassageRef[];           // distinct passages
  confessionalSupport: ChunkRef[];         // not counted toward plurality
}

// PR 4
interface AuthorityReport {
  authorityViolations: AuthorityViolation[];
}

interface AuthorityViolation {
  claim: string;
  citedSource: ChunkRef;
  reformulationHint: string;               // suggested rewrite
  reasoning: string;
}

// PR 5
interface AttributionReport {
  requiredAttributions: AttributionBlock[];
  missingAttributions: AttributionBlock[]; // present in manifest, not in rendered output
  ok: boolean;
}
```

### Componentes a construir

```
FidelityPass (orchestrator — PR 1)
├── ClaimExtractor (regex sentence-before-marker, Q2)
├── FidelityEvaluator (LLM call — Gemini Flash batched, Q1)
│   └── PartialContradictionEscalator (Sonnet 4.6 follow-up, Q1)
├── FidelityReportRepository (Firestore persist on sermon doc)
└── FidelityReviewPanel (UI sidebar, manual run button)

PublishGate (PR 2)
├── FidelityGatePolicy (pure, thresholds — Q3)
├── PrePublishFidelityModal (confront flow)
└── FidelityOverrideForm (≥100 chars, audit)

PluralityValidator (PR 3)
├── SubstantiveClaimDetector (LLM tagger in same batch, Q4)
├── PluralityCheck (pure)
└── PluralityFailureRow (UI w/ CTA "Añadir paralelo canónico")

AuthorityValidator (PR 4)
├── AuthorityDetector (LLM)
├── AuthorityReportComputer (pure)
├── Sermon prompt update (AUTHORITY SUBORDINATION clause)
└── AuthorityViolationRow (UI w/ reformulation hint)

AttributionFooter (PR 5)
├── computeAttributionCheck (pure, verifies render against requiredAttribution)
├── PDF render extension (append "Atribuciones" section)
├── Docx render extension (append "Atribuciones" section)
└── Web view section (SermonAttributionsSection)
```

## Plan de PRs (locked 2026-05-30)

Cada PR = unidad funcional completa testeable en UI (regla `feedback_pr_complete_units`).

### PR 1 — Fidelity pass core + per-marker verdicts visibles

**Branch**: `feat/pastoral-fidelity-phase-3-pr-1-fidelity-core`

**Archivos clave**:
- `packages/domain/src/entities/FidelityReport.ts` (new)
- `packages/domain/src/services/computeFidelitySummary.ts` (new, pure)
- `packages/application/src/use-cases/RunFidelityPassUseCase.ts` (new)
- `packages/application/src/services/SermonService.ts` (edit) — `runFidelityPass(sermonId)`
- `packages/infrastructure/src/gemini/fidelityEvaluatorPrompt.ts` (new)
- `packages/functions/src/sermon/evaluateClaimSourceFidelity.ts` (new, callable, Gemini Flash batched + Sonnet escalation)
- `packages/infrastructure/src/repositories/SermonRepository.ts` (edit) — persist `fidelityReport?`
- `packages/domain/src/entities/Sermon.ts` (edit) — add `fidelityReport?: FidelityReport`
- `packages/web/src/features/sermon/editor/FidelityReviewPanel.tsx` (new)
- `packages/web/src/features/sermon/editor/FidelityVerdictRow.tsx` (new)
- `packages/web/src/features/sermon/editor/SermonEditorPage.tsx` (edit) — wire panel + manual button
- Sub-flag `fidelity_pass` en `packages/domain/src/featureFlags.ts` Y allowlist server-side
  `packages/functions/src/users/setUserFeatureFlags.ts` (gotcha heredado Fase 2)
- Tests: domain + application + UI snapshots

**UI test (smoke)**: pastor abre sermón con flag on → click "Revisar fidelidad" → modal de progreso
→ panel muestra verdicts → click verdict → jumps al marker.

**Estimación**: 5-7 días.

### PR 2 — Publish gate + thresholds + override + audit

**Branch**: `feat/pastoral-fidelity-phase-3-pr-2-publish-gate`

**Archivos clave**:
- `packages/application/src/services/SermonService.ts` (edit) — `publishSermon` runs fidelity, applies gateStatus
- `packages/domain/src/services/computeFidelitySummary.ts` (edit) — threshold logic (20%/10%)
- `packages/domain/src/entities/FidelityReport.ts` (edit) — add `gateOverride?`
- `packages/functions/src/sermon/publishSermonWithFidelity.ts` (new, server-enforced)
- `packages/web/src/features/sermon/publish/PrePublishFidelityModal.tsx` (new)
- `packages/web/src/features/sermon/publish/FidelityOverrideForm.tsx` (new)
- `packages/web/src/features/sermon/editor/SermonEditorPage.tsx` (edit) — replace "Publicar" click
- Audit log writes

**UI test**: 22% unrelated → hard-block sin path; 15% partial → soft-block → justification 100+ → publica.

**Estimación**: 3-4 días.

### PR 3 — Plurality validator (no-proof-texting)

**Branch**: `feat/pastoral-fidelity-phase-3-pr-3-plurality`

**Archivos clave**:
- `packages/domain/src/entities/FidelityReport.ts` (edit) — add `pluralityReport?`, `SubstantiveClaim`
- `packages/domain/src/services/computePluralityCheck.ts` (new, pure)
- `packages/infrastructure/src/gemini/substantiveClaimDetectorPrompt.ts` (new)
- `packages/functions/src/sermon/evaluateClaimSourceFidelity.ts` (edit) — piggy-back substantive claim tagging (Q4)
- `packages/web/src/features/sermon/editor/PluralityFailureRow.tsx` (new) — CTA "Añadir paralelo canónico" → opens cross-ref lookup (reusa Fase 0)
- `packages/web/src/features/sermon/editor/FidelityReviewPanel.tsx` (edit) — sección "Pluralidad"

**UI test**: claim "Cristo es preexistente" con solo Juan 1:1 → Plurality fail → CTA → lookup propone Col 1:16, Heb 1:3.

**Estimación**: 3-4 días.

### PR 4 — Authority subordination + prompt update

**Branch**: `feat/pastoral-fidelity-phase-3-pr-4-authority`

**Archivos clave**:
- `packages/domain/src/entities/FidelityReport.ts` (edit) — add `authorityReport?`, `AuthorityViolation`
- `packages/infrastructure/src/gemini/authorityDetectorPrompt.ts` (new)
- `packages/functions/src/sermon/detectAuthorityViolations.ts` (new)
- `packages/infrastructure/src/gemini/prompts.ts` (edit) — append `AUTHORITY SUBORDINATION` block al sermon prompt principal (referencia ADR-006 §8 + manifesto §6)
- `packages/web/src/features/sermon/editor/AuthorityViolationRow.tsx` (new) — "Sugerencia de reformulación" inline
- `packages/web/src/features/sermon/editor/FidelityReviewPanel.tsx` (edit) — sección "Autoridad"

**UI test**: prompt actualizado reduce violaciones; las que quedan → reformulación sugerida click-to-replace.

**Estimación**: 3 días.

### PR 5 — Attribution footer en exports + AttributionReport pre-publish check

**Branch**: `feat/pastoral-fidelity-phase-3-pr-5-attribution-footer`

**Archivos clave**:
- `packages/infrastructure/src/export/PdfExportService.ts` (edit) — append "Atribuciones" section
- `packages/web/src/lib/sermon/exportSermonToDocx.ts` (edit) — append "Atribuciones" section
- `packages/web/src/features/sermon/preview/SermonAttributionsSection.tsx` (new)
- `packages/web/src/features/sermon/preview/SermonPublishedView.tsx` (edit) — include section
- `packages/domain/src/entities/FidelityReport.ts` (edit) — add `attributionReport?`
- `packages/domain/src/services/computeAttributionCheck.ts` (new, pure)
- `packages/web/src/features/sermon/editor/AttributionMissingRow.tsx` (new)
- Snapshot tests PDF + Docx con corpus que incluye SBLGNT

**UI test**: pastor exporta sermón con SBLGNT → última página tiene bloque "Atribuciones" con copyright notice + license URL.

**Estimación**: 2-3 días.

**Total**: 16-21 días ≈ 3-4 semanas.

## Reuso identificado

| Componente | Uso en Fase 3 |
|---|---|
| `citationManifest` schema (PR #213) | Input directo del fidelity pass |
| `validateCitations` (domain pure) | Pre-condition: marker identity validado antes de fidelity |
| `CitationManifestEntry.requiredAttribution[]` | Source-of-truth para AttributionReport (PR 5) |
| `aggregateRequiredAttributions` | Wired pero unused — PR 5 lo enchufa |
| `SermonService.publishSermon` línea 126 | Gate point (PR 2) |
| `SubstantiveClaim.detectedLevel` (core/distinctive/open) | Reusa tagging de Fase 0 / 06-pedagogy-applied §4 |
| Cross-ref engine (Fase 0) | CTA "Añadir paralelo" (PR 3) |
| `pastoralFidelity_flow` flag + sub-flag pattern (Fase 2) | `fidelity_pass` sub-flag (Q10) |
| Modo experto self-service (Fase 2.5 ADR-027) | Skip fidelity gate (Q5) |
| `AiAssistLog` (Fase 1.6/2.5) | Audit de overrides + verdicts |
| `LlmClient` port (Fase 2.5 PR A) | Llamadas LLM batched + escalation |

## Criterios de aceptación

### PR 1
- [ ] `evaluateClaimSourceFidelity` callable disparable manualmente desde editor
- [ ] Batch Gemini Flash + escalate `partial`/`contradicts` a Sonnet 4.6
- [ ] Verdicts persistidos en `sermons/{id}/fidelityReport`
- [ ] Sidebar panel muestra summary + lista de verdicts
- [ ] Click verdict → jumps al marker en el editor

### PR 2
- [ ] `publishSermon` auto-corre fidelity si no hay report fresh
- [ ] Thresholds aplicados (>20% unrelated|contradicts → hard, >10% partial → soft)
- [ ] Hard-block NO admite override
- [ ] Soft-block exige justificación ≥100 chars, audit-logged
- [ ] Modo experto (Fase 2.5) skip-able

### PR 3
- [ ] LLM tagger detecta claims sustantivas en mismo batch
- [ ] Plurality fail surface en panel con CTA cross-ref
- [ ] CTA abre lookup de paralelos canónicos

### PR 4
- [ ] Sermon prompt incluye `AUTHORITY SUBORDINATION` clause
- [ ] Authority detector surface violaciones con reformulación sugerida
- [ ] Click-to-replace funcional

### PR 5
- [x] PDF export incluye sección "Atribuciones" con AttributionBlock[] rendered (hereda split vía `aggregateRequiredAttributions`)
- [x] Docx export idem
- [x] Web view publicada incluye sección (`SermonAttributionsSection` en `detail.tsx`)
- [x] AttributionReport check: missing attributions → pre-publish flag (`AttributionMissingRow` en panel)

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Costo LLM × markers × usuarios | Batch + Flash tier por default; escalate solo `partial`/`contradicts` (Q1). Cache por marker (Q6). |
| LLM evaluator falso positivo `contradicts` → frustración pastor | Sonnet escalation + confidence score + path "Reportar evaluación incorrecta" → audit + future calibration. |
| Threshold 20% mal calibrado para launch | Admin toggle (Q3) + dashboard de pass-rate post-launch. |
| Override demasiado fácil → derrota propósito | 100-char justification + audit log + Fase 4 contra-scan refuerza. |
| Sermon prompt update (PR 4) regresa calidad | Snapshot tests + A/B con corpus pre-vs-post. |
| Attribution footer rompe layout export | Tests visuales por export type. |
| `study_depth` (Fase 2.5) + `fidelity_pass` (Fase 3) confusion para pastor | Copy unificada: panel `FidelityReviewPanel` agrupa todo bajo "Revisión pre-publicación". |

## Bitácora

- **2026-06-02 (PR 5 — attribution footer, code-complete)** — Cierra Fase 3. El footer
  obligatorio de atribución por licencia ahora rendea en TODOS los surfaces (Q7) y el split de
  SBLGNT del fundador (decisión 2026-05-30) quedó aterrizado.
  - **Split SBLGNT en dos blocks** (`aggregateRequiredAttributions.ts`): `SBLGNT_TEXT_ATTRIBUTION`
    (texto base Holmes 2010, **CC BY 4.0**, siempre que haya chunk SBLGNT) +
    `MORPHGNT_ATTRIBUTION` (tagging morfológico, **CC BY-SA 4.0**, solo si
    `hasMorphologyRendered(manifest)`). Reemplaza el block único anterior `SBLGNT_ATTRIBUTION`
    (que renderaba todo bajo BY-SA). **Conflicto detectado y resuelto con el fundador antes de
    codear**: una respuesta inicial pidió "un block todo BY-SA"; se levantó que contradecía la
    decisión locked 2026-05-30 (dos blocks) → confirmado dos blocks.
  - **`hasMorphologyRendered` es estructural, no content-sniffing**: lee un flag nuevo opcional
    `CitationManifestEntry.morphologyRendered`. Hallazgo de arquitectura: `SBLGNTBibleProvider`
    **descarta** las columnas `pos`+`parsing` de MorphGNT (solo emite la forma de superficie), así
    que hoy NINGÚN path del pipeline emite morfología al manifest → el flag queda ausente → solo
    Block 1 (BY 4.0) rendea. Block 2 (BY-SA) queda **latente** y correcto el día que aterrice un
    path que renderee parsing, sin re-tocar la lógica de licencia. Se eligió el flag estructural
    sobre un regex sobre la prosa para evitar falsos positivos (un pastor describiendo gramática
    griega con sus palabras NO dispara ShareAlike).
  - **`computeAttributionCheck` (puro, sin LLM)**: deriva `AttributionReport`
    (`requiredAttributions` = lo que el footer rendea, vía `aggregateRequiredAttributions` como
    SSOT; `missingAttributions` = fuentes con licencia CC BY/copyright pero **sin** líneas de
    `requiredAttribution` — gap de ingesta; `ok`). SBLGNT exento (su atribución viene de los
    compliance blocks, no de líneas per-entry). Reemplaza el stub `AttributionReport`.
  - **Wiring (Option report-attached)**: `RunFidelityPassUseCase` hace `findById` y computa
    `attributionReport` del `citationManifest` del sermón — independiente del LLM, así que es
    correcto aunque el evaluador devuelva 0 verdicts. **NO alimenta el gate** (la compliance legal
    rendea en cada export sin importar el flag); es una bandera pre-publish en el panel.
  - **Render**: PDF (`PdfExportService`) + Docx (`exportSermonToDocx`) ya llamaban
    `aggregateRequiredAttributions` → heredan el split automáticamente (cero cambios en esos
    archivos). Web view: nuevo `SermonAttributionsSection` cableado en `detail.tsx` tras la
    bibliografía (footer público on-screen, Q7). Panel: nuevo `AttributionMissingRow` +
    `AttributionSection` en `FidelityReviewPanel` (sección "Atribución de fuentes") +
    i18n `fidelityGate.attribution.*` + `attributions.*` (es/en).
  - **Deuda registrada (no resuelta esta fase, Q8)**: SBLGNT sigue hardcoded en
    `aggregateRequiredAttributions.ts` (no viene del catálogo CORE) → memoria nueva
    `tech_debt_sblgnt_hardcoded`. Legal review del split BY/BY-SA queda fuera de banda (no bloquea).
    Deuda heredada de PR 1 (color-literals + strings sin i18n en `FidelityReviewPanel`/`SummaryBar`)
    NO tocada; mis componentes nuevos cumplen standards (tokens semánticos + i18n + a11y label).
  - **Verde**: tsc 0 errores (domain/application/infrastructure/web). 558 tests
    (domain 392 + application 73 + web 93). Tests nuevos: `aggregateRequiredAttributions` (7,
    split + morphology + dedup), `computeAttributionCheck` (8), `RunFidelityPassUseCase` +1
    (attribution attach), `SermonAttributionsSection` (4). compliance:staged sin hard violations.

- **2026-05-31 (PR 3 — plurality validator, code-complete)** — Check anti-proof-texting aterrizado.
  - **Decisión operacional Q4**: "mismo batch" se implementa como **2ª llamada Flash dentro del
    mismo callable** `evaluateClaimSourceFidelity` (no el mismo prompt — las unidades difieren:
    fidelity es per-marker de cita de biblioteca, plurality es por afirmación doctrinal sobre la
    prosa completa). Costo ≈ 1 request Flash extra (~$0.001), dentro del budget Q1. El detector
    corre **aunque el sermón no tenga markers de cita** (un sermón sin citas de biblioteca igual
    puede hacer afirmaciones doctrinales mono-pasaje).
  - **Niveles de doctrina**: se reusa el `DoctrineLevel` canónico de `entities/Confession`
    (`core|distinctive|open-evangelical`) — NO se duplicó el tipo. Plurality aplica solo a
    `core`+`distinctive`; `open-evangelical` exento (materia de libertad).
  - **Distinctness de pasajes**: `book|chapter|verseStart` (citar "Juan 1:1" dos veces = un testigo);
    fallback a label normalizado cuando faltan campos estructurados. Mínimo 2 pasajes distintos.
  - **CTA "Añadir paralelo canónico"**: reusa el cross-ref engine de Fase 0 vía
    `useCrossReferences(label)`. **Read-only / propone** paralelos (Col 1:16, Heb 1:3…); el pastor
    inserta manualmente — PR 3 NO auto-inserta en el borrador (lazy-mount: el callable
    `lookupCrossReferences` solo dispara al expandir la fila).
  - **Gate**: `pluralityReport.failures.length > 0` → `pluralityHasFailures: true` a
    `computeFidelitySummary` → **soft-block** (ya cableado desde PR 1). Override con justificación
    reusa el flujo de PR 2.
  - **Entregado**: domain `PluralityReport`/`SubstantiveClaim`/`PassageRef`/`PLURALITY_MIN_PASSAGES`
    + `computePluralityCheck` puro (8 tests); port `IFidelityEvaluator.substantiveClaims?`;
    functions `substantiveClaimDetectorPrompt` + handler refactor (extraído `runMarkerFidelity`,
    nuevo `detectSubstantiveClaims` con degradación a `[]` en fallo); application
    `CallableFidelityEvaluator` mapea claims + `RunFidelityPassUseCase` computa plurality + feeds
    gate; web `PluralityFailureRow` + sección "Pluralidad" en `FidelityReviewPanel` + i18n es/en
    (`fidelityGate.plurality.*`) + 4 tests.
  - **Deuda no tocada**: 8 color-literals de PR 1 en `FidelityReviewPanel` (GateBanner/SummaryBar)
    siguen — el SummaryBar de 4 colores necesita un token semántico nuevo; refactor aparte. Mi
    código nuevo usa tokens (`warning-subtle`/`card`/`border`). PR 1 strings hardcoded sin i18n
    también siguen.
  - **Verde**: tsc 0 errores en domain/application/infrastructure/web (functions tiene 1 error
    pre-existente en `migratePastoralSeedsEightStep.ts`, ajeno a esta fase). 522 tests
    (domain 374 + application 66 + web 82). compliance:staged sin hard violations.

- **2026-05-31 (PR 2 — publish gate, code-complete)** — Gate de publish aterrizado. Decisiones
  de scope confirmadas con el fundador antes de codear:
  - **Q-A (scope del gate) → ambos paths.** `SermonService.publishSermon` Y
    `publishSermonAsCopy` (path del wizard) enforquean el gate. La orquestación UI completa
    (run pass → modal de confrontación) vive en el editor/detail (`detail.tsx`), surface
    canónico de revisión donde ya está el `FidelityReviewPanel`. El wizard
    (`StepDraft.performPublish`) queda cubierto **solo server-side** (defense-in-depth): si el
    draft trae un `fidelityReport` bloqueante, `publishSermonAsCopy` lanza `FidelityGateError`
    y el catch existente muestra error genérico. En la práctica el wizard rara vez tiene report
    (se genera en el editor), así que el edge es casi-nulo; documentado como scope deliberado.
  - **Q-B (enforcement) → solo client-side `SermonService`.** Coherente con ADR-029 §contexto
    ("gate vive en `SermonService.publishSermon`, no Firebase trigger"). NO se agregó el callable
    `publishSermonWithFidelity.ts` que el phase doc listaba — feature pastoral flag-gated, no
    adversarial; Fase 4 contra-scan refuerza después. **El plan de archivos del phase doc queda
    desviado en este punto** (ver § "Plan de PRs" PR 2: ignorar `publishSermonWithFidelity.ts`).
  - **Entregado**:
    - Domain: `evaluatePublishGate.ts` (pura, hard-block nunca overridable, soft-block exige
      justificación ≥`FIDELITY_OVERRIDE_MIN_CHARS`) + `FidelityGateError` tipado (lleva `reason`
      máquina-legible para mapear copy). 8 tests.
    - Application: `SermonService.enforceFidelityGate` privado — bite SOLO si el sermón tiene
      `fidelityReport` (flag off ⇒ sin report ⇒ blast radius 0). Persiste `GateOverride` stampeado
      (clock server-side) como audit permanente en `fidelityReport.gateOverride`. `publishSermon`
      y `publishSermonAsCopy` aceptan `override?` y rethrow `FidelityGateError` sin envolver.
    - Web: `PrePublishFidelityModal` (hard = sin override, solo "Revisar marcadores"; soft = form
      override) + `FidelityOverrideForm` (counter + min chars) + `useSermonPublishGate` (orquesta
      ensure-fresh-report → pass/modal → override) + `usePublishSermon(override?)` +
      `detail.tsx` cableado + i18n es/en (`fidelityGate.*`). 4 tests de modal.
  - **Audit**: el `GateOverride` en el report ES el registro de audit (overriddenBy + overriddenAt
    + reason + bypassedKind). NO se usó `AiAssistLog` (es seed-scoped; el override de publish es
    otro dominio). `bypassedKind` siempre `'partial'` en PR 2 (plurality/authority son PR 3/4).
  - **Deuda tocada (no introducida)**: `detail.tsx` ya era god component (587→605 líneas);
    decomposición es PR de refactor aparte. PR 1 dejó color-literals + strings sin i18n en
    `FidelityReviewPanel`/`FidelityVerdictRow`; mis componentes nuevos cumplen standards (tokens
    semánticos + i18n). `usePublishSermon` perdió su toast inline (ahora lo dueña el gate hook).
  - **Verde**: tsc 0 errores (domain/application/infrastructure/web), 510 tests
    (domain 366 + application 66 + web 78), compliance:staged sin hard violations.

- **2026-05-30 (`/iniciar-fase 3` — kickoff + decisiones locked)** — Sesión de planning con el
  fundador. Decisiones Q1-Q10 formalizadas en
  [ADR-029](../decisions/ADR-029-fidelity-pass-gate-policy.md):
  - Q1 Flash batched + Sonnet escalation para `partial`/`contradicts`
  - Q2 oración completa antes del marker (regex)
  - Q3 thresholds 20%/10% + admin toggle calibrable
  - Q4 LLM tagger plurality en mismo batch
  - Q5 reusa modo experto Fase 2.5
  - Q6 cache invalidation por marker
  - Q7 attribution footer en TODOS los surfaces
  - Q8 SBLGNT hardcoded queda; deuda nueva
  - Q9 orden secuencial 1→2→3→4→5
  - Q10 sub-flag `fidelity_pass` default off + flip post-smoke

  **Discrepancias detectadas vs phase doc anterior**:
  - D1: README tabla decía Fase 2.5 `in-progress`; reality 19 PRs en main + smoke OK → corregido a `completed`.
  - D2: phase doc anterior referenciaba branch `feat/phase-c1-export-with-citations`; en main desde Fase B+C → corregido.
  - D3: `FidelityReport` debería tener sub-reports opt-in (no monolítico) → reflejado en schema arriba.
  - D5: SBLGNT hardcoded leak Fase 0 → memoria nueva pendiente al cerrar PR 5.
  - D8: gate vive en `SermonService.publishSermon`, NO trigger Firebase → reflejado en arquitectura.
  - D-SBLGNT-license: código renderea `CC BY-SA 4.0` (real upstream), docs dicen `CC BY 4.0` →
    a resolver con fundador antes de PR 5 (público).

- **2026-05-30 (decisión D-SBLGNT-license)** — Fundador eligió **Opción 1: separar en dos blocks**.
  PR 5 renderea dos `AttributionBlock` distintos cuando el manifest contiene chunks SBLGNT:
  - Block 1: **SBLGNT base text** (Holmes 2010) bajo **CC BY 4.0** — siempre presente si hay
    chunk SBLGNT.
  - Block 2: **MorphGNT morphology** bajo **CC BY-SA 4.0** — presente solo si el sermón renderea
    tagging morfológico (tiempo verbal, caso, etc.) en el output.

  Razón: refleja realidad upstream, preserva flexibilidad comercial del sermón sobre el texto base
  (ShareAlike solo viral cuando morfología efectivamente aparece), defendible standalone ante futura
  legal review. ADR-029 §Q8 sigue válido (hardcoded queda; mover a catalog en próxima ingesta CORE);
  esta decisión es operacional de PR 5, no estructural. Updates pendientes:
  - `aggregateRequiredAttributions.ts` (PR 5) — split `SBLGNT_ATTRIBUTION` en `SBLGNT_TEXT_ATTRIBUTION`
    + `MORPHGNT_ATTRIBUTION`, agregar detector `hasMorphologyRendered(manifest)`.
  - ADR-006 + 07-citation-policy + ADR-029 — bajan a "ver phase-3 bitácora 2026-05-30" para evitar
    duplicación. Legal review pendiente como tarea fuera de banda (no bloquea PR 5).

  **PR 1 sigue** — branch `feat/pastoral-fidelity-phase-3-pr-1-fidelity-core` por crear.

- **2026-05-29 (prereqs actualizados al cerrar Fase 2.5)** — Fase 2.5 cerrada (19 PRs #267–#285,
  ADRs 025-028 accepted). Prereqs duros para Fase 3 ahora incluyen: `studyDepthSnapshot` en
  `Sermon.ts`, `AiAssistLog` cobertura completa (8 pasos), `ILlmClient` port + `GeminiLlmClient`
  adapter como base para callable nuevo, `WitnessOrchestrator` + cache pattern como referencia
  para fidelity pass per-marker batcheado. Deuda heredada explícita: PD content sin ingestar
  (Fase 3 no depende), LLM provider abstraction (Fase 3 debe usar `ILlmClient` sí o sí), cache
  pattern obligatorio desde día 1 para evitar explosión de costo per-marker, duplicación bible
  parser (cualquier cambio en `BibleService` mirrorearse web↔infra). 4 preguntas nuevas
  documentadas para responder al iniciar fase. Ver
  [sessions/2026-05-29-phase-2.5-closeout.md](../sessions/2026-05-29-phase-2.5-closeout.md).

- **2026-05-22** — Placeholder creado.
