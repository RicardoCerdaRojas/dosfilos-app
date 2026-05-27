# Phase 2.5 — Study Depth Copilot

## Estado

`planning` — bloqueada por completion de Fase 1 (six-step spine) + Fase 2 (tres testigos). Inserta entre Fase 2 y Fase 3 en el roadmap. Numeración decimal preserva trazabilidad de referencias existentes a Fases 3-7.

## Objetivo

Implementar un **motor de medición y confrontación de profundidad de estudio** que opera en el path Faculty (sermón vía tutores) y en cualquier surface que produzca sermones sin pasar por el six-step spine canonical (Fase 1).

Cierra el gap arquitectónico identificado durante smoke test post-Fase 0 (sesión 2026-05-25): el path Faculty (PR #214, `derivedContext: 'faculty'`) permite generar sermón tras una sola interacción con el tutor, lo cual viola **P1 — Labor antes que output** del manifesto pedagógico.

El motor NO bloquea producción. **Confronta**: mide multidimensional, surface lo que falta cubrir, propone caminos concretos, exige justificación escrita audit-logged si el pastor decide producir igual con cobertura insuficiente.

## Marco teórico

Profesional educational pedagogy que el diseño absorbe:

| Marco | Aplicación |
|---|---|
| **Bloom's Taxonomy** (Anderson 2001) | Sermón = nivel 6 (Create). Requiere niveles 1-5 cubiertos primero. 1 Q&A solo toca Recall/Understand. |
| **Cognitive Load Theory** (Sweller) | Germane load (esfuerzo formador de schemas) debe acumularse antes del output productivo. |
| **Mastery Learning** (Bloom 1968) | No advance hasta evidencia de dominio. Sermón = mastery output. |
| **Productive Struggle** (Kapur, "Productive Failure") | Pastor debe intentar lectura propia antes que el sistema sintetice. Struggle precede insight estable. |
| **Scaffolding ZPD** (Vygotsky) | Sistema andamia en zona próxima; retira andamios cuando demuestra competencia. |
| **Deliberate Practice** (Ericsson) | Esfuerzo focal en dimensiones débiles con feedback específico, no repetición ciega. |
| **Andragogy** (Knowles) | Adultos aprenden por interrogación. El tutor debe preguntar más que responder. |

Plataformas referencia que aplican estos marcos:

- **Brilliant.org**: bloquea avance hasta resolver problema interactivo
- **Khan Academy**: prerequisites tree por skill
- **Duolingo**: mastery score per skill gate
- **WriteSparks** (AI essay assist): fuerza outline antes que draft

## Prerequisitos

| Prereq | De dónde viene | Estado |
|---|---|---|
| Cross-reference engine TSK lookup | Fase 0 (PR 0.5) | ✅ Sample dataset shippeable; full dataset PR follow-up |
| Confession catalog + multi-witness mode | Fase 0 + ADR-010 | ✅ |
| Six-step spine como Step 1 (pastoralSeed schema) | Fase 1 | ✅ PR #257 (`pastoralSeeds/{seedId}`, ADR-015) |
| Three-witness orchestrator | Fase 2 | ✅ PR #262 (`validateSeedWitnesses` + `WitnessResult` domain, ADR-011) |
| Faculty chat session persistence | Existing | ✅ |
| Greek/Hebrew tutor session linkage to passage | Existing | ✅ |
| LLM classifier infrastructure (Gemini Flash for dim tagging) | Build durante esta fase | — |

Sin Phase 1 + Phase 2, esta fase NO puede arrancar — los dimension trackers leen artifacts producidos por six-step y three-witness. **Ambos prereqs duros satisfechos al 2026-05-27** (Fase 1 PR #257, Fase 2 PR #262). Fase 2.5 destrabada.

**Insumos concretos que Fase 2.5 consume de Fase 2**:
- `WitnessResult` / `WitnessedClaim` (domain `WitnessValidation.ts`) → evidence directa para D4 (canon) + D6 (historia). El `detectedLevel` + verdicts por claim ya están computados.
- `pastoralSeed.witnessReview` (respuestas del pastor a soft/hard blocks) → señal de engagement con confrontación (D7).
- Callable `validateSeedWitnesses` + cache `witnessResults/` → patrón de classifier batcheado reusable para `DimensionClassifier`.
- Sub-flag pattern `three_witnesses` (requiere `pastoral_fidelity_flow`) → mismo patrón para el sub-flag de Study Depth.

**Gotcha heredado**: cualquier flag nuevo debe agregarse también a la allowlist de `setUserFeatureFlags` (functions), no solo a `FEATURE_FLAG_NAMES` (domain).

## Decisiones tomadas

- (Pendientes — los ADRs de esta fase se escriben al arrancar `/iniciar-fase 2.5`)

## Decisiones pendientes — ADRs futuros

> **Política de numeración (corregida 2026-05-27)**: NO se pre-reservan números ADR (lección del
> retrospective de Fase 2 — pre-reservar causa colisiones). Los números 022/023/024 que este doc
> reservó brevemente fueron tomados por **Fase 1.6** al escribirse (ADR-022 8-step spine, ADR-023
> two-tier verification, ADR-024 género/RAG). Los ADRs de Study Depth se numeran **al escribirlos**
> (siguientes libres en su momento). **Además, Fase 2.5 debe re-derivar sus 7 dimensiones desde los
> 8 pasos de Fase 1.6** — no arrancar 2.5 hasta cerrar 1.6.

- **ADR (TBD)** — Study Depth Copilot dimensiones canónicas + mecánica de confrontación (alinear con los 8 pasos de Fase 1.6 + el two-tier de ADR-023)
- **ADR (TBD)** — Override policy: justification length, audit retention, "expert mode" para pastors experimentados (umbral N sermones con SDS≥80)
- **ADR (TBD)** — Dimension classifier prompt + thresholds (cost / accuracy tradeoff)

## Diseño técnico

### Las 7 dimensiones canónicas

Derivadas del **9-step exegético del manifesto** ([05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md)) + el método del fundador:

| # | Dim | Pregunta de cobertura | Evidence source |
|---|---|---|---|
| D1 | **Lectura ancla** | ¿Leyó pasaje completo? ¿Reflexionó sobre afirma/exige/descarta? | Tutor session referenciando passage + responses con `texto.contains(passage)` + reading time tracked |
| D2 | **Lenguas originales** | ¿Interactuó con griego/hebreo del pasaje? | Greek/Hebrew tutor session linked to passage + word lookups |
| D3 | **Sintaxis + morfología** | ¿Analizó estructura sintáctica + word studies (≥2 substantivas)? | SBLGNT analyzer invocado + word study count + pastor notes ≥30 chars cada uno |
| D4 | **Reconocimiento canónico** | ¿Consultó paralelos? ¿Marcó relevancia? | `lookupCrossReferences` calls + parallels marked relevant + relevanceNote ≥30 chars |
| D5 | **Teología sistemática** | ¿La pregunta tocó marco doctrinal ordenado? | LLM classifier per message detecta lenguaje sistemático |
| D6 | **Teología histórica** | ¿Consultó tradiciones confesionales como testigos? | Confession witnesses fired (multi-witness Fase 0) + pastor acknowledgement de divergencias/convergencias |
| D7 | **Confrontación / contraposturas** | ¿Engagiged con interpretaciones contrarias? | LLM classifier detecta argumentative engagement; en Fase 4 se enriquece con contra-scan estructurado |

Score per dim: **0-100**. Aggregate `StudyDepthScore` = weighted avg con pesos configurables (default uniformes).

### Schema `StudyDepthAssessment`

```typescript
// Firestore: projects/{projectId}/studyDepthAssessments/{sessionId}
// O: faculty_sessions/{sessionId}/studyDepth subdoc

interface StudyDepthAssessment {
  sessionId: string;
  userId: string;
  passageRef: PassageRef;
  startedAt: timestamp;
  lastUpdatedAt: timestamp;

  dimensions: {
    [key in DimensionId]: DimensionScore;
  };

  // Aggregate
  overallScore: number;        // 0-100, weighted avg
  weakDimensions: DimensionId[];  // sorted asc by score, scores<60

  // Time tracking
  totalActiveSeconds: number;  // chat activity time (debounced)
  toolsInvoked: ToolUsage[];

  // Audit
  promptSuggestionsClicked: number;
  nudgesReceived: number;
  nudgesActedUpon: number;
}

interface DimensionScore {
  id: DimensionId;
  score: number;               // 0-100
  evidenceCount: number;       // signals contributing
  lastEvidenceAt: timestamp;
  pastorMarkedComplete?: boolean;  // manual override per dim
}

type DimensionId = 'D1_lectura' | 'D2_lenguas' | 'D3_sintaxis' | 'D4_canon' | 'D5_sistematica' | 'D6_historia' | 'D7_confrontacion';
```

### Schema `StudyDepthSnapshot` (per-sermon audit)

```typescript
// Embedded in `sermons/{sermonId}.studyDepthSnapshot`

interface StudyDepthSnapshot {
  capturedAt: timestamp;
  sourceSessionId: string;     // faculty session que generó el sermón
  overallScore: number;
  dimensionScores: Record<DimensionId, number>;
  weakDimensions: DimensionId[];
  bypassedConfrontation: boolean;
  justification?: string;       // ≥100 chars cuando bypassed
  totalStudyDurationSeconds: number;
}
```

Phase 4 (authorship + voice fingerprint) consume este snapshot para badge **"Sello propio: alto/medio/bajo"** en cada sermón producido.

### Componentes a construir

```
StudyDepthCopilot (orchestrator)
├── DimensionClassifier (LLM evaluator)
│   - Gemini Flash batch every 3 messages
│   - Classifies user message + AI response into 1-N dimensions
│   - Returns per-dim score delta + evidence justification
│
├── DimensionTracker (passive aggregator)
│   - Subscribes to faculty session events
│   - Updates StudyDepthAssessment Firestore doc
│   - Listens to tool invocations (Greek tutor, cross-ref, etc.)
│
├── NudgeDispatcher (active intervention, soft)
│   - Detects N minutes without touching dim X
│   - Surfaces 1 prompt suggestion per 5min max (no spam)
│   - User clicks → prompt fires to tutor automatically
│
├── PreGenerationGate (confrontational checkpoint)
│   - Triggers when user clicks "Generar sermón"
│   - Renders modal with dimension scorecard
│   - Green dims: green check + "Adelante con confianza"
│   - Yellow dims: hint "considera profundizar"
│   - Red dims: explicit confrontation + 3 prompt suggestions + override path
│   - Override: textarea ≥100 chars, audit-logged, captured in snapshot
│
├── DimensionPromptLibrary (data)
│   - Per-dim curated questions/prompts pastor can fire
│   - Tagged by dimension + sub-topic
│   - JSON seed in `data/dimension-prompts/`
│
└── StudyDepthBadge (UI widget)
    - Sidebar collapsible: 7 mini-bars
    - Subtle, not gamified (no points, no streaks)
    - Optional toggle hide
```

### Mecánica detallada

#### A. Passive tracker (background)

- Lifecycle: subscribes cuando faculty session abre con `projectId` o `passageRef` definido
- Trigger classification: cada 3 mensajes user O cada 60s (whichever first) batch sent al LLM
- Cost estimate: ~$0.001 per batch × ~20 batches por sesión típica = ~$0.02 per sesión

#### B. Live visibility (no-gamification design)

- Sidebar widget colapsable
- Solo MUESTRA cobertura — NO score numérico, NO badges, NO leaderboard
- Cada dim: bar visual + estado textual ("Aún sin tocar" / "Iniciado" / "Cubierto" / "Profundo")
- Pastor puede manualmente marcar dim como "cubierto" (override) → audit-logged

#### C. Confrontational pre-generation gate

UI flow when pastor click "Generar sermón":

```
┌────────────────────────────────────────────────────┐
│  Antes de generar tu sermón                       │
│                                                    │
│  Hemos rastreado tu trabajo en este pasaje:       │
│                                                    │
│  ✓ Lectura ancla        ████████░░  80           │
│  ✓ Sintaxis             ███████░░░  70           │
│  ⚠ Lenguas originales   ███░░░░░░░  30           │
│  ✗ Reconocimiento       █░░░░░░░░░  10           │
│  ✓ Sistemática          ██████░░░░  60           │
│  ✗ Tradición histórica  ░░░░░░░░░░   0           │
│  ⚠ Confrontación        ████░░░░░░  40           │
│                                                    │
│  Recomendamos profundizar en lenguas, paralelos   │
│  canónicos y tradición histórica antes de         │
│  predicar este texto.                              │
│                                                    │
│  Preguntas sugeridas:                              │
│  [ ¿Qué dice el griego de ἀρχή en Juan 1:1? ]    │
│  [ ¿Hay paralelos en Génesis 1 que iluminen? ]    │
│  [ ¿Qué dice Westminster sobre la preexistencia? ]│
│                                                    │
│  ─────────────────────────────────────────────    │
│  ¿Generar igual con cobertura parcial?            │
│  [ Volver a estudiar ]   [ Generar con nota ]    │
└────────────────────────────────────────────────────┘
```

Si pastor click "Generar con nota":
- Textarea aparece pidiendo justificación ≥100 chars
- "Explica por qué consideras suficiente el estudio actual o por qué quieres proceder sin cobertura completa"
- Audit log con `bypassedConfrontation: true` + justification

#### D. Active nudges (mid-session, soft)

Reglas:
- Después de 10 min sin tocar dim X (con sesión activa) → tutor proactivo surface mensaje sutil:
  - "Notamos que aún no has explorado el griego. ¿Te interesa ver cómo el imperfecto cambia el sentido aquí?"
- Frecuencia cap: 1 nudge per 5 minutos máximo
- Pastor puede desactivar nudges per session (preference saved)

#### E. Dimension prompt library

JSON seed `data/dimension-prompts/{dim-id}.json` con N prompts curados por dim. Ejemplo D2 (Lenguas):

```json
{
  "dimensionId": "D2_lenguas",
  "prompts": [
    {
      "id": "d2-greek-tense",
      "label": "¿Cómo afecta el tiempo del verbo el significado?",
      "applicableWhen": "passage.testament === 'NT'",
      "firesToTutor": "Greek Tutor"
    },
    {
      "id": "d2-key-word-study",
      "label": "Identifica la palabra clave del pasaje y profundiza",
      "applicableWhen": "always",
      "firesToTutor": "Greek Tutor"
    }
  ]
}
```

Promtps se filtran por context (testament, passage type, doctrina central del pasaje) antes de mostrar.

### Mapping a Faculty path (PR #214)

Antes de Fase 2.5:
```
Faculty chat → SermonOutlinePreviewModal → BuildSermonFromFacultyOutlineUseCase → sermon
                                          ↑
                                  Sin gate de profundidad
```

Después de Fase 2.5:
```
Faculty chat
  ├── (background) DimensionClassifier batch every 3 msgs
  ├── (background) DimensionTracker updates StudyDepthAssessment
  ├── (active) NudgeDispatcher surfaces preguntas sugeridas
  └── User clicks "Generar sermón outline"
       └── PreGenerationGate evaluates scores
            ├── All green/yellow → proceeds to SermonOutlinePreviewModal
            └── Any red → ConfrontationalModal
                          ├── User clicks suggested prompt → fires to tutor + dialog stays
                          └── User overrides with justification → modal closes + proceed
                                ↓
                          BuildSermonFromFacultyOutlineUseCase
                                ↓ (snapshot studyDepthSnapshot embedded)
                          sermon
```

## Reuso identificado

| Componente | Uso en esta fase |
|---|---|
| Faculty chat sessions Firestore (existing) | Source de eventos para passive tracker |
| Greek/Hebrew tutor session linkage | Evidence para D2/D3 |
| `lookupCrossReferences` callable (Fase 0) | Evidence para D4 |
| Confession catalog + multi-witness (Fase 0 + ADR-010) | Evidence para D6 |
| `pastoralSeed` schema (Fase 1) | Cuando six-step spine se usa, pre-llena scores algunos dims |
| `WitnessResult` per claim (Fase 2) | Evidence directa para D4/D6 |
| Gemini Flash via existing callable infra | DimensionClassifier LLM |
| `usePastoralFidelityGate` (Fase 0) | UI gate consume `useStudyDepth` también |

Código nuevo (~3 sem trabajo concentrado):
- `StudyDepthAssessment` + `StudyDepthSnapshot` entities (~1 día)
- `DimensionClassifier` callable + prompt eng (~3 días)
- `DimensionTracker` orchestrator + Firestore writers (~2 días)
- `NudgeDispatcher` rules engine (~2 días)
- `PreGenerationGate` UI + modal (~2 días)
- `StudyDepthBadge` sidebar widget (~1 día)
- `DimensionPromptLibrary` JSON seed + filtering logic (~2 días)
- Audit log writes + Phase 4 hooks (~1 día)
- Tests integration + smoke (~1 día)

## Criterios de aceptación

- [ ] Faculty session con `projectId` o `passageRef` dispara passive tracker
- [ ] Sidebar widget muestra 7 dimensiones con estado real
- [ ] LLM classifier corre batch every 3 messages + persiste evidence
- [ ] NudgeDispatcher surface prompt suggestion tras 10 min sin tocar dim
- [ ] Pre-generation gate aparece al click "Generar sermón outline"
- [ ] Si scores todos verdes/amarillos → proceeds direct
- [ ] Si scores rojos → confronta + ofrece 3 prompts + path override
- [ ] Override requiere justification ≥100 chars
- [ ] `studyDepthSnapshot` embedded en sermón generado
- [ ] Audit log entries para confront overrides + nudge interactions
- [ ] Toggle "modo experto" desactiva confrontation (gated detrás de threshold N sermones)
- [ ] Pastor puede manualmente marcar dim "cubierto" (override per-dim)

Tests automatizados:
- Unit: DimensionClassifier prompt + parse logic
- Unit: score aggregation + weak dims sort
- Integration: faculty session → classifier batch → assessment doc updates
- Snapshot: PreGenerationGate UI states (all green / mixed / all red)

Tests manuales:
- 1 pastor experimentado completa sesión Faculty 30 min con cobertura 5/7 dims → confrontation aparece, click 2 prompts, completa cobertura, generates without override
- 1 pastor principiante con 1 pregunta intenta generar → confrontation fuerte, declina, vuelve a estudio

## Riesgos

| Riesgo | Mitigación |
|---|---|
| **Gamification distorsiona** — pastor optimiza score, no comprensión | NO puntos visibles. Solo cobertura cualitativa. Cero leaderboard, cero streaks. Mediciones internas, no marketing-able. |
| **LLM classifier miscategoriza** → pastor frustrado | Feedback button "no era preciso" per evidence + audit. Manual override per dim. Pastor puede recalibrar. |
| **Cost LLM por classification × usuario × mensaje** | Batch every 3 msgs + cache por (passage, dim) + Gemini Flash. Estimado ~$0.02 per sesión. |
| **Confrontation modal feels punitivo** | Copy pastoral, no chastising. "Notamos" no "Fallaste". Suggestions positivas. UX testing pre-launch. |
| **Override demasiado fácil** → derrota propósito | 100-char justification minimum + audit log + Phase 4 audit consumer. Threshold de "modo experto" gated por N sermones con SDS>80. |
| **Pastor con experiencia siente paternalismo** | Toggle "modo experto" after N sermones SDS>80. Configurable per-user. |
| **Subjetividad de "enough"** varía por topic/denomination | Thresholds configurable per dim. Pastor puede ajustar (con justification). Default opinionated pero override per pastor. |
| **Faux-mastery** (pastor finge profundidad pero copy-paste de ChatGPT) | LLM classifier detecta paste events + complexity vs originality. Phase 4 contra-scan refuerza esto. |

## Métricas de éxito

Tracking interno (no pastor-facing):

- **Distribución de SDS por sermón generado**: histograma. Si mayoría <50, gate no está enseñando — diseño debe ajustar.
- **Confrontation override rate**: % de generaciones con `bypassedConfrontation: true`. Target <30%.
- **Nudge acceptance rate**: % nudges donde pastor clicked suggested prompt. Target >40%.
- **Tiempo promedio en Faculty session pre-generation**: target >15 min (vs current ~3 min).
- **Cobertura dimensional promedio**: target >5/7 dims taggeados como "cubierto" or "profundo".

## Estimación

**3 semanas** de trabajo concentrado:
- Schema + entities + Firestore writers: 3 días
- DimensionClassifier + prompt engineering: 4 días
- DimensionTracker passive orchestrator: 3 días
- NudgeDispatcher + rules engine: 3 días
- PreGenerationGate UI + modal + flow: 3 días
- StudyDepthBadge sidebar widget: 1 día
- DimensionPromptLibrary seed + filtering: 2 días
- Audit log + Phase 4 hooks: 1 día
- Tests + smoke: 2 días

## Bitácora

- **2026-05-27 (directiva del fundador, sesión 1.6)** — Durante el smoke de Fase 1.6 el fundador
  identificó que el silencio de la IA fuera de lo doctrinal (ADR-023 tripwire `core`-only)
  **subutiliza** al asistente: un pastor escribió en el paso 2 (Contexto/Género de Juan 1:1)
  "como es una profecía entiendo que todo lo que dice se cumplirá" — doble error (género equivocado
  + regla de lectura equivocada) que el sistema dejó pasar sin guía. **Directiva**: Faculty como
  **tutor silencioso/socrático contextual por paso**, que conoce el pasaje + el paso del flujo y
  da guía en CADA pregunta (no sólo doctrinal). **Restricción (la clave, para no violar P1/P2)**:
  aporta **datos + preguntas socráticas, nunca escribe la respuesta del pastor**; es *confrontativo*
  (manifiesto §7 aplicado a pedagogía: "Juan es Evangelio, no profecía apocalíptica — ¿cómo cambia
  eso tu lectura?"), **pull-first** (botón "Pedir orientación") o nudge suave no-bloqueante, no
  autocompletado intrusivo. Esto **reabre la política de silencio de ADR-023** → al arrancar 2.5,
  emitir ADR que extienda/supersede esa política para los niveles no-core (verificador-orientador,
  no generador). Encaja directo con `NudgeDispatcher` + `DimensionPromptLibrary` + el gate Faculty
  ya diseñados aquí. Decisión 1.6: **NO implementar en 1.6** (se cerró 1.6 con 8-step + fixes);
  el copilot per-step es 2.5. (Número de ADR se asigna al escribirlo — no pre-reservar.)
- **2026-05-27** — **Prereqs actualizados al cerrar Fase 2**. Fase 1 (PR #257) + Fase 2 (PR #262, ADR-011) ✅ completas + deployadas. `WitnessResult`/`pastoralSeed.witnessReview` disponibles como evidence para D4/D6/D7. ADRs de esta fase **renumerados a 022/023/024** (011-013 originales ya consumidos; 011 = tres testigos). Sub-flag pattern + gotcha de `setUserFeatureFlags` allowlist documentados. Fase 2.5 destrabada — lista para `/iniciar-fase 2.5`.
- **2026-05-25** — Phase doc creado. Gap arquitectónico identificado durante smoke test post-Fase 0: Faculty path (PR #214, `derivedContext: 'faculty'`) permite generar sermón sin gate de profundidad — viola P1 del manifesto. Fundador solicita engine que mide multidimensional + confronta soft sin bloquear. Diseño absorbe pedagogía profesional (Bloom, CLT, Productive Struggle, Mastery Learning, Scaffolding ZPD, Deliberate Practice, Andragogy). 7 dimensiones canónicas derivadas del 9-step exegético + método del fundador. Espera Phase 1 + Phase 2 para arrancar — schema `pastoralSeed` + `WitnessResult` son prereqs duros.
