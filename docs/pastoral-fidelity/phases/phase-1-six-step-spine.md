# Phase 1 — Six-step spine como Step 1 del wizard

## Estado

`planning` — bloqueada por completion de Fase 0.

## Objetivo

Reemplazar el Step 1 actual del wizard de sermón (free-text observation) por la metodología de 6 pasos del tutor griego/hebreo aplicada al pasaje del proyecto. El wizard bloquea avance al Step 3+ hasta que la `pastoralSeed` esté completa. La semilla se inyecta como `PRIMARY VOICE` del prompt de generación posterior.

Esta fase es el **punto de inversión** del producto: aquí cambia el flow de "AI escribe → pastor edita" a "pastor siembra → AI cultiva".

## Prerequisitos

- Fase 0 completa:
  - Catálogo de confesiones live
  - `declaredConfession` persistido por usuario
  - Feature flag `pastoral_fidelity_flow` operativo
  - Schema de `Project` definido (aunque migración sea Fase 5 — esta fase ya escribe contra `Project`)

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
// Subdoc de Project: projects/{projectId}.study.pastoralSeed
interface PastoralSeed {
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
