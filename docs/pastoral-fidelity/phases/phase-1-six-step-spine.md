# Phase 1 — Six-step spine como Step 1 del wizard

## Estado

`completed` — **shippeada 2026-05-27 vía PR #257**. Single PR `feat(pastoral-fidelity): Phase 1 — six-step spine` bundleó schema + repo + service + hook + orquestador + 6 sub-step components + gate + PRIMARY VOICE prompt + verbatim check + audit panel + UI audit kill-list. Feature-flagged (`pastoral_fidelity_flow` off por default). Prereqs revalidados al recierre de Fase 0 (2026-05-25, deuda 0, PRs #252/#253/#254/#255 en main).

## Objetivo

Reemplazar el Step 1 actual del wizard de sermón (free-text observation) por la metodología de 6 pasos del tutor griego/hebreo aplicada al pasaje del proyecto. El wizard bloquea avance al Step 3+ hasta que la `pastoralSeed` esté completa. La semilla se inyecta como `PRIMARY VOICE` del prompt de generación posterior.

Esta fase es el **punto de inversión** del producto: aquí cambia el flow de "AI escribe → pastor edita" a "pastor siembra → AI cultiva".

## Prerequisitos

- Fase 0 completa (✅ cerrada 2026-05-25 con deuda 0):
  - [x] **Catálogo de confesiones live** — 14 catalog entries Firestore (`/confessions/{id}`). 4 creeds con sections full (17 sections taggeables), 7 confesiones grandes con stubs `ingestStatus: pending` (content fill follow-up). [PR #252](https://github.com/RicardoCerdaRojas/dosfilos-app/pull/252).
  - [x] **CORE Library system seed sources** — 8 docs no-confesionales en `/library_resources` con `isSystemSource: true` + rights-aware completos. SBLGNT (CC BY 4.0 + 5 attribution requirements) disponible para citation manifest. Schaff Vols I/II/III, Chicago Statements x3, Savoy, 39 Articles, 1689 LBCF, Baptist Cat 1693. Callable `ingestLibrarySeedSources` deployed. [PR #255](https://github.com/RicardoCerdaRojas/dosfilos-app/pull/255).
  - [x] **Multi-witness default-on** ([ADR-010](../decisions/ADR-010-confessional-witnesses-default-on.md)) — `User.useConfessionalWitnesses: boolean` default `true`. NO onboarding step, NO banner. Toggle único en `/settings/confession` con justificación ≥50 chars cuando opt-out + audit log `confessionChangeAudit/`. Legacy `declaredConfession*` fields preserved sin consumir. [PR #253](https://github.com/RicardoCerdaRojas/dosfilos-app/pull/253) + [PR #254](https://github.com/RicardoCerdaRojas/dosfilos-app/pull/254) refetch fix.
  - [x] **Feature flag `pastoral_fidelity_flow` operativo** — `User.featureFlags` + callable `setUserFeatureFlags` super_admin-only + admin Flags tab + hook `useFeatureFlag('pastoral_fidelity_flow')`. PR 0.1 (parte de [#252](https://github.com/RicardoCerdaRojas/dosfilos-app/pull/252)).
  - [x] **Hook combinado** `usePastoralFidelityGate()` con 3 reasons (loading / flag-disabled / allowed) + `confessionalWitnessesEnabled` flag (post ADR-010) — listo para gate del flow reformado. Phase 2 Testigo 3 lee `confessionalWitnessesEnabled` para decidir si `distinctive`/`open-evangelical` fire.
  - [x] **Cross-reference engine sample** — `lookupCrossReferences` callable (auth users) + sample dataset (~12 anchor verses) para Step 4 (Reconocimiento). PR 0.5.
  - [x] **doctrineLevel tagging operacional** — `ConfessionSection.doctrineLevel` taggeado vía Gemini 2.5 Flash + `reviewStatus` workflow. PR 0.4.
  - [x] **Rights-aware citation schema** — `LibraryResource` + `Confession` con license/citation templates. SBLGNT attribution PDF + Word export. Legacy docs reciben defaults conservadores (`license: 'unknown'` + `ingestionStatus: 'requires_manual_review'`) read-time. Admin backfill tool clasifica heurísticamente por autor PD conocido. PR 0.3 + [PR #255](https://github.com/RicardoCerdaRojas/dosfilos-app/pull/255).
  - [x] **`useUserProfile.refetch()` expuesto** — hook reactivo post-mutation. Consumers que mutan profile (settings pages, gate-aware flows) pueden invalidar cache sin recargar página. [PR #255](https://github.com/RicardoCerdaRojas/dosfilos-app/pull/255).
  - [ ] **Schema de `Project`** — **diferido a Fase 5** (sin consumer aún). Phase 1 puede operar contra wizard standalone existente; refactor a `Project` será unbox de Fase 5. **Decisión registrada en bitácora Phase 0**.

### Prereqs NO satisfechos (asumir o accionar)

- **Content fill 7 confesiones largas** (WCF/WSC/WLC/Belgic/Heidelberg/Dort/Augsburg): puede iniciar Phase 1 sin ellas. Si Step 4 (Reconocimiento) o Step 6 (Insight) requiere referencia confesional, solo 4 creeds responden hoy. Phase 2 Testigo 3 será limitado hasta parsers CCEL aterricen.
- **TSK full dataset (~340k links)**: Step 4 trabaja con sample (~12 versos). Para producción real ingest CSV de openbible.info debe correr antes de release a usuarios.
- **Pastoral review doctrineLevel**: secciones taggeadas viven con `reviewStatus: 'pending-pastoral-review'`. Phase 1 no consume `doctrineLevel` directamente (es input de Phase 2 override policy). No bloquea.
- **Faculty sermon RAG enrichment**: propuesta tracked en [proposals/faculty-sermon-rag-enrichment.md](../proposals/faculty-sermon-rag-enrichment.md). NO bloquea Phase 1 (que reforma path standalone, no Faculty). Path Faculty mantiene techo citacional limitado hasta este PR follow-up aterrice (post-Fase 0, antes de Fase 2.5).
- **PDF export rewrite**: propuesta tracked en [proposals/pdf-export-rewrite.md](../proposals/pdf-export-rewrite.md). NO bloquea Phase 1 (export funcional, calidad de render mejorable). Migración a Puppeteer es follow-up no-bloqueante.
- **Backfill manual de docs sin match heurístico**: 43 docs en `library_resources` quedan `Sin clasificar` post-backfill heurístico de Phase 0. Admin debe clasificarlos manualmente en Phase 1+ cuando los consume Step 4/6. No bloquea arranque.

## Decisiones tomadas

- [ADR-002](../decisions/ADR-002-six-step-as-step1-spine.md) — six-step como spine del Step 1, sin bypass
- [ADR-005](../decisions/ADR-005-exegetical-confessional-pedagogy.md) — pedagogía operacional. Agrega Paso 8 del manifiesto (aplicación doxológica) al seed.

## Decisiones pendientes

- [ ] **UX micro-design**: ¿los 6 pasos son sub-steps lineales del Step 1, o tabs, o accordion? Recomendación tentativa: lineales con breadcrumb visible.
- [ ] **Autosave granularity**: ¿autosave por keystroke, por paso completado, por session? Recomendación: por paso completado + session.
- [ ] **Step 6 sin AI**: ¿cómo prevenimos que el pastor copy-paste de ChatGPT en `centralIdea`? Recomendación: log de paste events + UI nota "este paso es tu voz; resiste la tentación de pegar". No bloqueamos paste (intrusivo) pero lo audita.
- [ ] **Skip de griego/hebreo para pastores sin formación**: ¿modo "guíame paso a paso" del tutor o gate distinto? Recomendación: tutor en modo principiante, NO skip.
- [ ] **Cuántos word studies obligatorios en Paso 3**: 2 o 3? Recomendación: 2 mínimo.

Cerrar cada uno con ADR específico (ADR-010 al ADR-014).

## Diseño técnico

### Schema `PastoralSeed`

```typescript
// Top-level collection: pastoralSeeds/{seedId} — ver ADR-015
interface PastoralSeed {
  id: string;
  sermonId: string;                    // 1:1 v1
  projectId?: string;                  // populated en Fase 5
  userId: string;
  createdAt: timestamp;
  updatedAt: timestamp;

  passageRef: PassageRef;

  // Paso 1: Lectura
  reading: {
    firstImpression: string;           // ≥50 chars
    completedAt: timestamp;
    timeSpentSeconds: number;
  };

  // Paso 2: Sintaxis
  syntax: {
    mainClause: {
      reference: string;               // ej. "Romanos 8:1a"
      analyzerOutput: ClauseAnalysis;  // from canonical analyzer
      pastorNote: string;              // ≥30 chars
    };
    completedAt: timestamp;
    timeSpentSeconds: number;
  };

  // Paso 3: Morfología
  morphology: {
    wordStudies: WordStudy[];          // mínimo 2
    completedAt: timestamp;
    timeSpentSeconds: number;
  };

  // Paso 4: Reconocimiento
  recognition: {
    parallels: ParallelRef[];          // 1-3, con relevanceNote ≥30 chars cada uno
    completedAt: timestamp;
    timeSpentSeconds: number;
  };

  // Paso 5: Función
  function: {
    originalAudienceFunction: string;  // ≥100 chars
    completedAt: timestamp;
    timeSpentSeconds: number;
  };

  // Paso 6: Insight (sin AI assistance)
  insight: {
    centralIdea: string;               // 1 oración, ≥30 chars
    observations: string[];            // mínimo 3, ≥40 chars cada una
    openQuestion: string;              // 1, ≥30 chars
    pastoralAnecdote: string;          // 1, ≥80 chars
    doxologicalApplication: string;    // ≥80 chars — Paso 8 manifiesto.
                                       // "¿a qué adoración, vida santa o ministerio fiel
                                       // debe llevar este sermón?" Sin AI.
    pasteEvents: PasteEvent[];         // audit only, no blocking
    completedAt: timestamp;
    timeSpentSeconds: number;
  };

  // Meta
  totalTimeSeconds: number;
  toolsConsulted: ToolUsage[];
  completed: boolean;
  completedAt?: timestamp;
}

interface WordStudy {
  word: string;                        // ej. "δικαιοσύνη"
  reference: string;                   // ej. "Rom 8:4"
  pastorDiscovery: string;             // ≥30 chars — what the pastor learned
  tutorInteractionId?: string;         // link to greek tutor session
}

interface ParallelRef {
  reference: string;                   // ej. "Gálatas 5:1"
  relevanceNote: string;               // ≥30 chars
  source: 'pastor-suggested' | 'cross-ref-engine-suggested';
}

interface ToolUsage {
  tool: 'greek-tutor' | 'hebrew-tutor' | 'canonical-analyzer' | 'cross-ref' | 'faculty-historical';
  step: 1 | 2 | 3 | 4 | 5 | 6;
  invokedAt: timestamp;
  durationSeconds: number;
}

interface PasteEvent {
  step: 6;
  field: 'centralIdea' | 'observations' | 'openQuestion' | 'pastoralAnecdote';
  charsCount: number;
  at: timestamp;
}
```

### Orquestador del wizard

Componente nuevo: `PastoralSeedWizard` (orquesta los 6 sub-steps).

```
PastoralSeedWizard
├── ReadingStep (Paso 1)
├── SyntaxStep (Paso 2) — embed canonical analyzer
├── MorphologyStep (Paso 3) — invoke greek/hebrew tutor on-demand
├── RecognitionStep (Paso 4) — embed cross-ref engine
├── FunctionStep (Paso 5) — optional faculty historical mode
└── InsightStep (Paso 6) — pure pastor input, no AI
```

Cada step:
- Lee state del seed actual
- Permite input/edit
- Valida criterios (≥X chars, etc.)
- Persiste a Firestore al completar
- Trackea time + tools invocados
- Solo permite avanzar si su completado válido

Gate: wizard de sermón redirige a `PastoralSeedWizard` si `project.study.pastoralSeed.completed !== true`. No skip.

### Integración con prompt builder

El prompt builder del Step 3+ del wizard (donde se genera el borrador) consume la seed:

```typescript
function buildSermonPrompt(project: Project, params: PromptParams): string {
  const seed = project.study.pastoralSeed;

  return `
# PRIMARY VOICE (PASTOR'S OWN VOICE — DO NOT OVERRIDE)

The pastor has produced the following seed through 6 steps of personal study.
This is the pastor's voice and must drive the sermon. AI develops, AI does not originate.

## Central idea (pastor's exact words):
"${seed.insight.centralIdea}"

## Pastor's observations (must be developed, not replaced):
${seed.insight.observations.map((o, i) => `${i+1}. "${o}"`).join('\n')}

## Open question to address in the sermon:
"${seed.insight.openQuestion}"

## Pastoral anecdote to integrate:
"${seed.insight.pastoralAnecdote}"

## Pastor's exegetical findings (use as foundation):
- Main clause: ${seed.syntax.mainClause.reference} — ${seed.syntax.mainClause.pastorNote}
- Word studies: ${seed.morphology.wordStudies.map(w => `${w.word} (${w.reference}): ${w.pastorDiscovery}`).join('; ')}
- Parallels marked relevant: ${seed.recognition.parallels.map(p => `${p.reference} — ${p.relevanceNote}`).join('; ')}
- Function for original audience: ${seed.function.originalAudienceFunction}

# DEVELOPMENT INSTRUCTIONS

You are NOT the author. You are an assistant developing the pastor's seed into a structured sermon.

Rules:
1. The central idea above is the spine. Do not introduce a different central idea.
2. Each major section of the sermon must connect explicitly to one of the pastor's observations or to the open question.
3. Pastor's exact phrasing of central idea must appear verbatim at least once in the sermon body.
4. Pastoral anecdote must be integrated at the point the pastor's framing makes most sense, not invented.
5. Parallels mentioned by the pastor are PRIMARY sources to cite; you may add others but pastor's parallels take precedence.

[... rest of prompt with audience, length, style preferences ...]
  `;
}
```

### Gates del wizard

```typescript
function canEnterStep(stepN: number, project: Project): { allowed: boolean; reason?: string } {
  if (stepN >= 3 && !project.study.pastoralSeed?.completed) {
    return {
      allowed: false,
      reason: 'Debes completar los 6 pasos de estudio personal antes de generar el borrador.'
    };
  }
  // ...
}
```

## Reuso identificado

| Componente | Uso en esta fase |
|---|---|
| Greek tutor (6 pasos) | Embed en `MorphologyStep`; `SyntaxStep` usa su analyzer; metodología completa |
| Hebrew tutor | Mismo, para pasajes AT |
| Canonical analyzer (SBL GNT) | `SyntaxStep` y `MorphologyStep` |
| Faculty doctrinal mode | `FunctionStep` invoca modo histórico opcional |
| Cross-reference engine | `RecognitionStep` (dependiente de Q1 Fase 0) |
| Wizard step infrastructure | Refactor del Step 1 actual |

Código realmente nuevo:
- `PastoralSeedWizard` orchestrator (~3-4 días)
- 6 sub-step components (~2-3 días, hereda mucho de los embeds)
- Schema + persistence (~1 día)
- Prompt builder update (~1 día)
- Wizard gates (~0.5 día)
- Audit trail dashboard (preview, no full UI) (~1 día)

Total estimado: **2 semanas** de trabajo concentrado.

## Tests / verificación

Criterios de aceptación:

- [ ] Usuario con `pastoral_fidelity_flow=true` que crea nuevo sermón es enviado a six-step Step 1
- [ ] No puede avanzar a Step 3+ sin completar los 6 pasos
- [ ] `pastoralSeed` persiste correctamente con todos los campos
- [ ] Cada paso valida sus criterios mínimos (chars, count)
- [ ] Greek tutor se invoca contextualizado al pasaje del proyecto
- [ ] Canonical analyzer surface cláusulas del pasaje en Paso 2
- [ ] Cross-ref sugiere paralelos en Paso 4
- [ ] Step 6 (Insight) NO tiene asistencia AI generativa visible
- [ ] Prompt del Step 3+ incluye `PRIMARY VOICE` block con seed completa
- [ ] Borrador generado contiene `centralIdea` verbatim del pastor
- [ ] Audit trail (time + tools) persistido por paso
- [ ] Feature flag off → flow legacy intacto (no regression)

Tests automatizados:
- Unit: validators de cada step
- Integration: flow E2E de seed → prompt → mock LLM response
- Snapshot: prompt builder output

Tests manuales:
- 1 pastor experimentado completa flow en <45 min
- 1 pastor principiante completa flow en <90 min con tutor en modo guiado

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Pastor abandona en Paso 2 (sintaxis lo intimida) | Tutor en modo principiante explica conceptos básicos inline |
| Time-to-first-draft tan alto que conversión cae bruscamente | A/B con feature flag; medir abandono por paso; iterar UX |
| Copy-paste de ChatGPT en Step 6 burla el gate | Audit log de paste events; eventual ML detector si problema crece |
| Costo LLM por proyecto sube (más tools invocados) | Medir; ajustar pricing si necesario; cache aggressive en tutor |
| Greek tutor no tiene contexto de "estamos en proyecto X" | Pasar `projectId` + `passageRef` como context al invocar |

## Bitácora

- **2026-05-22** — Phase doc creado. Esperando completar Fase 0 antes de codear.
- **2026-05-23** — **Prereqs actualizados al cerrar Fase 0**. Phase 0 entrega: feature flag operacional + confession catalog (14 fuentes) + declaredConfession persistido + cross-ref engine sample + doctrineLevel tagging + rights-aware schema + `usePastoralFidelityGate()` hook. Schema `Project` diferido a Fase 5. UI audit ([phase-0-ui-audit.md](../phase-0-ui-audit.md)) entrega kill-list directa: Categoría 1 (StepHomiletics auto-generate) + Categoría 4 (paperToWizardProgress prefill risk) son scope Phase 1. Phase 1 destrabada, lista para arranque.
- **2026-05-25** — **Kickoff Fase 1 + decisiones lockeadas vía `/iniciar-fase 1`**:
  - **Schema location**: top-level collection `pastoralSeeds/{seedId}` con `sermonId` + futuro `projectId` ref. ADR-015 emitido. Decisión: migración a Fase 5 (Project subcollection) = field update, no reshape.
  - **`derivedContext` (paper/Faculty pre-fill, PR #213/#214)**: bajo flag-on bloquea igual + pre-pobla seed como sugerencias editables del paper/Faculty. Pastor confirma o reescribe. NO bypass.
  - **Hebrew tutor**: link-out v1 a `/hebrew-tutor?passage=X&returnTo=...`. NO overlay embed v1 (defer si métrica uso justifica).
  - **Canonical analyzer**: SBLGNT read-only inline en SyntaxStep. Pastor escribe cláusula principal manual (no analyzer interactivo v1).
  - **Confesión proactiva en prompt**: diferida a Fase 2 (Testigo 3). Phase 1 NO toca prompt confesional.
  - **Verbatim check post-gen**: 2 capas — (a) instrucción en prompt "MUST include centralIdea verbatim"; (b) post-gen check + inline-banner "tu idea central no aparece verbatim — re-generar / editar". NO auto-regen silencioso. Telemetría miss-rate para tuning.
  - **Paste detection**: DOM `paste` event sólo, suficiente v1.
  - **Audit dashboard**: `PastoralSeedAuditPanel` inline en sermón detail. Preview, sin tab dedicada.
  - **GreekTutorOverlay**: recibe `sermonId` + callback `onWordStudyComplete` para registrar `tutorInteractionId` en `WordStudy`.
  - **D1 numeración**: seed = nuevo Step 1. `StepExegesis` ML deprecated bajo flag-on (no se renderiza). Flag-off mantiene legacy intacto. Fase 7 revisita exégesis reform.
  - **Granularidad ejecución**: 1 PR mega `feat(pastoral-fidelity): Phase 1 — six-step spine` por memoria `feedback_pr_complete_units` (unidad funcional completa testeable). 9 sub-tasks plan inicial bundled. Feature-flagged (`pastoral_fidelity_flow` off por default) → blast radius 0 hasta toggle.
  - **ADRs deferred decisions**: UX micro-design lineal con breadcrumb visible (commit-time decision sin ADR). Autosave por keystroke debounced 1s + por sub-step completed. Word studies min = 2. Skip griego = NO, tutor modo principiante.
  - Arranque inmediato — single conversation owns Fase 1 hasta cierre.
- **2026-05-25 (cierre)** — **Fase 1 shippeada en single PR**. Entregables:
  - **Schema + persistencia**: domain entity `PastoralSeed` con 6 sub-step interfaces + per-step validators (`evaluatePastoralSeed`) + `PASTORAL_SEED_THRESHOLDS` + `PASTORAL_SEED_AI_FORBIDDEN_FIELDS` constant. Port `IPastoralSeedRepository`. `FirestorePastoralSeedRepository` top-level (ADR-015). Service `PastoralSeedService` singleton con autosave-friendly `savePatch`/`appendToolUsage`/`appendPasteEvent`/`addWordStudy`. Firestore rules owner-only + indexes (sermonId + userId).
  - **Web wizard**: `PastoralSeedWizard` orquestador con state machine 6 sub-steps + `PastoralSeedBreadcrumb` lineal. Hook `usePastoralSeed` con autosave debounced 1s + recompute completion inline. 6 step components: `ReadingStep` (≥50 chars) · `SyntaxStep` (cláusula + nota + `SblgntPassagePanel` read-only inline) · `MorphologyStep` (≥2 word studies + `GreekTutorOverlay` embed + Hebrew link-out) · `RecognitionStep` (`useCrossReferences` hook → `lookupCrossReferences` callable + manual editor) · `FunctionStep` (≥100 chars + Faculty histórico link) · `InsightStep` (5 AI-forbidden fields + DOM `paste` event audit + `Lock` banner). `StepShell` shared frame surface reasons del validator. `useStepTimer` hook acumula `timeSpentSeconds` por step.
  - **Gate**: `SermonWizard` consume `usePastoralFidelityGate` + bajo flag-on render `PastoralSeedWizard` en lugar de `StepExegesis`. Hard gate efecto que redirige a Step 1 si pastor intenta Step 2/3 sin seed completa. Eagerly mint sermón cuando entra al seed wizard para anchor del seed.
  - **Prompt builder**: nuevo `buildPastoralSeedBlock` en `prompts-generator.ts` prepende bloque `PRIMARY VOICE (LA VOZ DEL PASTOR — NO ANULAR)` + `DEVELOPMENT INSTRUCTIONS` antes de `BASE_SYSTEM_PROMPT`. Bloque incluye idea central verbatim, observaciones, pregunta, anécdota, doxológica, cláusula principal, word studies, paralelos, función. `GenerationRules.pastoralSeed` field nuevo. Snapshot test verifica precedencia sobre paper context.
  - **Verbatim check**: `draftIncludesCentralIdea` post-gen en `StepDraft.handleGenerate` (whitespace normalised + case-insensitive). Si ausente: warning toast con guidance "re-genera o edita". NO auto-regen (P2). Telemetría miss-rate via console.warn.
  - **Audit panel**: `PastoralSeedAuditPanel` inline en sermón detail (`detail.tsx`) — pastor-facing. Muestra per-step completion, tiempo, herramientas consultadas, paste events count. Compact mode para sidebars.
  - **Admin inspector**: `/dashboard/admin/pastoral-seed/:sermonId` debug page con raw seed, validators, audit log, tool usage history.
  - **Kill-list UI audit**: Categoría 1 — `StepHomiletics` auto-fire gateado por `pastoralGate.allowed` (no se dispara bajo flag-on). Categoría 4 — `paperToWizardProgress` docstring documenta `PASTORAL_SEED_AI_FORBIDDEN_FIELDS` enforcement future contract.
  - **Tests**: 8 domain tests (`PastoralSeed.test.ts` cubre validators per-step + `evaluatePastoralSeed` + `createEmptyPastoralSeed` + AI-forbidden constant). 5 infra prompt tests (`pastoralSeedPrompt.test.ts` cubre block omission/inclusion/verbatim instruction/lists/precedencia sobre paper). Total 264 domain + 38 infra + 61 app tests passing.
  - **Type-check verde** en domain/infra/app + web (errores pre-existentes en GeneratorSettings/IntegrationsSettings/preach/StepDraft son legacy, no introducidos por Fase 1).
  - **Migration ramp pendiente**: feature flag `pastoral_fidelity_flow` per-user via admin UI. Default-on plan a definir post-smoke-test (~2-4 semanas de internal dogfooding antes de ramp 5% → 25% → 100%).
  - **Decisiones deferred a ADRs intra-fase NO escritas** (cerradas sin ADR formal porque resultaron triviales en implementación): UX micro-design (lineal con breadcrumb), autosave granularity (debounced 1s + flush en advance), word studies min (2 hardcoded en `PASTORAL_SEED_THRESHOLDS`), skip griego (no skip — tutor en modo principiante reusa GreekTutorOverlay existente).
- **2026-05-26 (smoke test issue + arquitectónica)** — **ADR-016 emitido + Fase 1.5 abierta**:
  - **Issue detectado durante smoke test**: `MorphologyStep` integró `GreekTutorOverlay` existente como herramienta de análisis de palabras. Smoke test reveló que el tutor está construido como **módulo de aprendizaje de idiomas** (training units, quizzes, refuerzo paradigmático, conceptos library) — no como **herramienta de extracción exegética pastoral**. UI académica genera carga cognitiva inapropiada para el caso de uso del pastor preparando sermón. Viola manifesto explícito: "sin convertir la clase en lección de idiomas".
  - **Decisión arquitectónica (ADR-016)**: separar `PastoralWordStudy` (nuevo) de tutores de aprendizaje (existentes). Tutores siguen en `/dashboard/greek-tutor` y `/dashboard/hebrew-tutor` para usuarios que quieren formación lingüística; Pastoral Fidelity flow consume nuevo módulo focalizado.
  - **Fase 1 ships con embed actual como interim degradado** documentado. Pastor puede usar el tutor pero la UX es sub-óptima. Reemplazo en Fase 1.5.
  - **Fixes pre-existentes Greek Tutor shipped en este commit** (descubiertos durante smoke test):
    - `GeminiGreekTutorService.cleanJsonResponse`: returns `''` (deterministic SyntaxError) en lugar de `'[]'` (silent empty) cuando response no tiene JSON shape.
    - `GeminiGreekTutorService.explainMorphology`: shape validation + throw si components empty.
    - `ExplainMorphologyUseCase`: defense-in-depth guard + throw si empty.
    - `GreekTutorSessionView.handleRequestMorphology`: toast.error surface al user.
    - `MorphologyDisplay`: defensive empty-state amber card con guía cuando components missing.
    - `es/greekTutor.json`: agregado `wordPreview.alreadyInUnits` (faltaba traducción ES).
  - **Bug pendiente identificado**: tooltip de palabras en `PassageVersionRow` muestra greek+transliteration+RV60+lema pero NO gloss/significado del lema. Schema `PassageWord` no tiene campo `gloss`. Fix requiere extender schema + extraction pipeline. Resolved en Fase 1.5 (nuevo modal usa schema propio).
  - **Fase 1.5 docs**: `phases/phase-1-5-pastoral-word-study.md` + `decisions/ADR-016-pastoral-word-study-vs-language-tutor.md` aterrizados. Fase 1.5 destrabada post-Phase 1 merge.
- **2026-05-25 (recierre Fase 0 — incorporado desde main)** — Prereqs revalidados. ADR-009 + ADR-010 cambian asunción de Phase 1: NO hay `declaredConfession` obligatorio, NO hay banner, hook `usePastoralFidelityGate` retorna `confessionalWitnessesEnabled` (default `true`) en vez de `confession-required` gate. Phase 2 Testigo 3 ajustado: `core` fire siempre + `distinctive`/`open-evangelical` fire si toggle ON. CORE Library seed con 8 system sources adicionales en `library_resources` (SBLGNT + Schaff + Chicago + minor confessions) disponibles para citation manifest desde Step 6. `useUserProfile.refetch()` disponible para flows que muten profile (settings, gate-aware). Faculty sermon RAG enrichment + PDF export rewrite tracked como proposals no-bloqueantes. Phase 1 absorbió estos cambios sin deuda invisible heredada.
- **2026-05-27** — **PR #257 mergeable**. Conflicts en `README.md` + `phase-1-six-step-spine.md` (overlap docs Phase 0 recierre + Phase 1 closeout) resueltos preservando ambas líneas históricas.

## Cross-references desde Fase 0 (handoff)

Insumos Phase 0 que Phase 1 consume directamente:

| Insumo Phase 0 | Path | Uso en Phase 1 |
|---|---|---|
| `usePastoralFidelityGate()` | `packages/web/src/hooks/usePastoralFidelityGate.ts` | Wizard reformado debe consultar antes de entrar — render CTA según reason |
| `lookupCrossReferences` callable | `packages/functions/src/admin/cross-references/lookupCrossReferences.ts` | `RecognitionStep` (Paso 4) suggests paralelos |
| `Confession` + `ConfessionSection` Firestore | `/confessions/{id}/sections/{sectionId}` | Prompt builder referencia secciones por id en `PRIMARY VOICE` block |
| `User.declaredConfession` | `User` entity + `useUserProfile` | Prompt builder include "tu confesión declara sobre este tema: ..." (Paso 6 manifiesto, proactivo) |
| `aggregateRequiredAttributions` | `packages/domain/src/services/aggregateRequiredAttributions.ts` | Export del sermón hereda atribución automática sin acción adicional |
| UI audit kill-list | `docs/pastoral-fidelity/phase-0-ui-audit.md` | Categoría 1 + Categoría 4 son acciones de Phase 1 (gate auto-generate + AI-forbidden fields) |
