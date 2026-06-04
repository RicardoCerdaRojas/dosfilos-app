# Phase 2.5 — Study Depth Copilot

## Estado

`complete` — cerrada **2026-05-29**. 19 PRs entregados a main (#267–#285). Smoke end-to-end
confirmado por el fundador en prod. Tests verde 499/499 (web 62 + domain 325 + application 61 +
infra 51). CI verde + Deploy Production verde. Feature flag `study_depth` (sub-flag de
`pastoral_fidelity_flow`) default off; dogfooders on.

Diseño shipped diverge del plan original post-kickoff Option B (ADR-025): NO se construyó passive
tracker en Faculty ni classifier batch every-3-messages; el Acompañante se unificó como un solo
motor con 3 momentos (orientación per-paso + confrontación inline + gate pre-publish), las 7
dimensiones se re-derivaron de los 8 pasos canónicos, y Faculty quedó como surface de exploración
con su propio agente socrático (PR B / ADR-028) que tras decisión "Componer sermón" rerouted al
pipeline único de wizard. Detalle completo en bitácora + handoff doc.

Inserta entre Fase 2 y Fase 3 en el roadmap. Numeración decimal preserva trazabilidad de
referencias existentes a Fases 3-7.

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
| **Eight-step spine** como Step 1 (pastoralSeed schema 8 pasos) | **Fase 1.6** | ✅ **PR #265** (`b0fbcbd5`, ADR-022). Las 7 dimensiones se re-derivan de estos 8 pasos. |
| Three-witness orchestrator + two-tier verification | Fase 2 + **Fase 1.6** | ✅ PR #262 (ADR-011) + **PR #265** (`validateSeedWitnesses` modo `inline-core`/`full-gate`, ADR-023). El pre-gen gate de 2.5 se unifica con el two-tier. |
| `AiAssistLog` (alimenta "% tuyo" + audit de assists) | **Fase 1.6** | ✅ **PR #265** (subcolección `pastoralSeeds/{id}/aiAssistLogs/`, ADR-024). Cobertura parcial: assists nuevos cableados, resto follow-up. |
| `verifyTimelessPrinciple` (verificador no-generador, patrón a reusar) | **Fase 1.6** | ✅ **PR #265** — patrón base para el tutor socrático de 2.5. |
| Faculty chat session persistence | Existing | ✅ |
| Greek/Hebrew tutor session linkage to passage | Existing | ✅ |
| LLM classifier infrastructure (Gemini Flash for dim tagging) | Build durante esta fase | — |
| **Contenido PD para trasfondo histórico (RAG ruta C)** | Fase 1.6 dejó la infra; **contenido pendiente** | ❌ **NO satisfecho** — tarea del fundador (ISBE/K&D/JFB). El tutor de 2.5 que use trasfondo dependerá de esto; degrada elegante mientras tanto. |

Sin Phase 1.6 + Phase 2, esta fase NO puede arrancar — los dimension trackers leen artifacts producidos por el **eight-step spine** + three-witness. **Prereqs duros satisfechos al 2026-05-27** (Fase 1.6 PR #265, Fase 2 PR #262). Fase 2.5 destrabada.

**Prereqs NO satisfechos (deuda heredada de 1.6, a considerar en el diseño de 2.5):**
- **Contenido PD de trasfondo histórico** — la infra RAG existe (`retrieveChunks` + `PastoralSeedService.retrieveHistoricalContext`), pero sin fuentes ingestadas. Si 2.5 quiere que el tutor cite trasfondo real, el fundador debe ingestar primero.
- **`AiAssistLog` cobertura parcial** — solo genre/historical/eisegesis loggean hoy; structural/wordStudies/crossRef NO. Si la métrica "% tuyo" de 2.5/Fase 4 necesita cobertura total, completar el cableado.
- **Outline LLM de `BookPanorama`** — diferido en 1.6 (género usa mapa determinista). Si 2.5 quiere outline rico del libro como insumo del tutor, reactivar la reutilización de `BookPanorama`.

**Insumos concretos que Fase 2.5 consume de Fase 2**:
- `WitnessResult` / `WitnessedClaim` (domain `WitnessValidation.ts`) → evidence directa para D4 (canon) + D6 (historia). El `detectedLevel` + verdicts por claim ya están computados.
- `pastoralSeed.witnessReview` (respuestas del pastor a soft/hard blocks) → señal de engagement con confrontación (D7).
- Callable `validateSeedWitnesses` + cache `witnessResults/` → patrón de classifier batcheado reusable para `DimensionClassifier`.
- Sub-flag pattern `three_witnesses` (requiere `pastoral_fidelity_flow`) → mismo patrón para el sub-flag de Study Depth.

**Gotcha heredado**: cualquier flag nuevo debe agregarse también a la allowlist de `setUserFeatureFlags` (functions), no solo a `FEATURE_FLAG_NAMES` (domain).

## Decisiones tomadas

Al arrancar `/iniciar-fase 2.5` (2026-05-27), modelando casos de uso del flujo completo con el
fundador, se reformuló la fase: **NO dos motores, sino un Acompañante de Estudio unificado**. ADRs:

- **[ADR-025](../decisions/ADR-025-study-companion-unified-model.md)** — Modelo unificado: un
  acompañante, un modelo de cobertura (`StudyDepthAssessment` **1:1 con el `pastoralSeed`**, no con
  el proyecto → cero dependencia de Fase 5), tres momentos (orientación / cobertura / gate). 7 dims
  **re-derivadas de los 8 pasos** (1.6). **Opción B**: Faculty es exploración que alimenta el seed;
  el sermón nace **solo** del seed (pipeline único); el path Faculty→sermón de PR #214 se re-rutea.
- **[ADR-026](../decisions/ADR-026-step-orientation-supersede-silence.md)** — Orientación por paso:
  **extiende** (no revierte) el silencio no-core de ADR-023 sobre un eje ortogonal — **corrección de
  método** (género, regla de lectura, estructura, salto exegético) vs interpretación legítima.
  Verificador-orientador (nunca generador), pull-first ("Pedir orientación"), nudge suave opcional.
  Cierra el escenario del smoke 1.6 (género equivocado sin guía).
- **[ADR-027](../decisions/ADR-027-override-and-expert-mode-policy.md)** — Override (justificación
  ≥100 chars, audit, no bloquea) + modo experto **self-service ganado** (toggle en config usuario,
  bloqueado hasta umbral N sermones → resuelve chicken-egg) **+ override super-admin** (escape hatch)
  + **suaviza no silencia** (P3: confronta gaps reales igual).

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

> **Cierre 2026-05-29** — Criterios escritos para el plan original (passive tracker + classifier
> batch + nudges). Tras el pivot Option B del kickoff (ADR-025), varios items quedaron
> **reformulados** en lugar de tachados: el objetivo pedagógico se cumple via diseño unificado (un
> Acompañante, tres momentos, 7 dims re-derivadas de los 8 pasos). Cada item lista la
> reformulación shipped + PR + tests.

- [x] ~~Faculty session con `projectId` o `passageRef` dispara passive tracker~~ → **Pivot**: NO
  passive tracker. Faculty Socratic Sermon Agent (PR #268 / ADR-028) opera en verification mode
  durante "Componer sermón"; el surface Faculty conserva exploración libre, el tracking real vive
  en el wizard via `StudyDepthAssessment` colgado del `pastoralSeed` (ADR-025).
- [x] Sidebar widget muestra 7 dimensiones con estado real → `StudyDepthBadge` (PR #267)
  cualitativo, sin números/streaks, 7 dims re-derivadas de los 8 pasos canónicos. Test
  `StudyDepthBadge.test.tsx` (2 tests).
- [x] ~~LLM classifier corre batch every 3 messages + persiste evidence~~ → **Pivot**: el spine
  determinista (`computeStudyDepthFromSeed`) calcula cobertura sin LLM batch; clasificación LLM
  pasó a ser per-step on-demand (`orientStudy` + `classifyDimensions` en PR B). Cero costo por
  mensaje. Tests `StudyDepthAssessment.test.ts` cobertura completa.
- [x] ~~NudgeDispatcher surface prompt suggestion tras 10 min sin tocar dim~~ → **Pivot**:
  `StepCompanion` per-step (PR #267 / ADR-026) entrega Tier 1 (orientación pull-first) + Tier 2
  (simplificar con ejemplo en otro pasaje) + Tier 3 (puzzle estructural — PR #270). Pastor
  invoca explícitamente; no hay timer-based nudge (evitamos paternalismo).
- [x] Pre-generation gate aparece al click "Generar sermón outline" → `WitnessGate` +
  `StudyDepthGate` unificados pre-publish (PR #269). Test `WitnessGate.test.tsx` (3 tests).
- [x] Si scores todos verdes/amarillos → proceeds direct → PR #269.
- [x] Si scores rojos → confronta + ofrece 3 prompts + path override → PR #269.
- [x] Override requiere justification ≥100 chars → PR #269.
- [x] `studyDepthSnapshot` embedded en sermón generado → PR #269; field en `Sermon.ts`.
- [x] Audit log entries para confront overrides + nudge interactions → `AiAssistLog` cobertura
  completa (PR #267 cableó structural/wordStudies/crossRef + `stepOrientation` nuevo); PR #269
  agregó `pastoralSeed.witnessReview` + audit del gate override.
- [x] Toggle "modo experto" desactiva confrontation → PR #269 (self-service-once-earned tras N
  sermones SDS>80 + super-admin override). ADR-027.
- [x] Pastor puede manualmente marcar dim "cubierto" → PR #267 (floor override per-dim en
  `IPastoralSeedRepository.setStudyDepthOverride`).

Tests automatizados shipped (vs originales):
- Unit `StudyDepthAssessment.test.ts` (domain) — coverage del spine + override + snapshot.
- Unit `WitnessGate.test.tsx` (web) — UI states del gate.
- Unit `StudyDepthBadge.test.tsx` (web) — render badge cualitativo.
- Snapshot tests embebidos en los anteriores.
- Total Fase 2.5: 499/499 verde en cierre.

Tests manuales ejecutados 2026-05-29 (fundador, prod):
- ✅ Smoke completo wizard pastoral (Filemón completo + Juan 1:1 + Romanos 1) — confirmado
  funcional tras 6 fix-PRs derivados del smoke (#274 #277 #279 #281 #283 #284).
- ✅ Tier 3 puzzle Juan 1:1 (chiasmo 2:1:0) resolvable con hint atado a pieza específica,
  badge progreso, CTA dinámico (PR #275 UX pass 1).
- ✅ Pre-gen gate verde/rojo con override + justification.
- ✅ Salida wizard navega a `/dashboard/sermons` (PR #285).

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

- **2026-06-04 (fix nudge↔mecánica D7 Confrontación — hallazgo smoke #5)** — El nudge de D7
  (`studyDepth.json` `dimensionNudges.D7_confrontacion`) decía "Considera al menos una postura
  contraria y desmantélala con el texto" — sonaba a *escribir/pensar* algo, pero `computeD7`
  (`StudyDepthAssessment.ts`) sube el score SOLO por artefactos de confrontación reales:
  `seed.timelessPrinciple.verificationReport` (verificar el principio) + `seed.witnessReview`
  (completar la Validación de tres testigos). Mismatch copy↔mecánica: el pastor podía "considerar"
  una postura sin mover el puntaje. Fix: reword del nudge (es+en) para nombrar la ACCIÓN que registra
  D7 — *"verifica tu principio atemporal y completa la validación de testigos para registrarlo"* —
  manteniendo el goal pedagógico (P3, Hch 20:27). Solo copy; la mecánica (enriquecida con
  argumentative-engagement / contra-scan en Fase 4) no cambia.

- **2026-05-29 (cierre Fase 2.5 — protocolo PHASE_CLOSEOUT)** — Fase declarada `complete`. 19 PRs
  mergeados a main (#267–#285) + deployed. Smoke end-to-end confirmado por fundador en prod tras
  cadena de fix-PRs derivados del smoke. Tests verde 499/499 (web 62 + domain 325 + application 61
  + infra 51). CI + Deploy Production verde. Feature flag `study_depth` activo bajo
  `pastoral_fidelity_flow`, default off.
  - **PRs principales**: #267 (PR A Study Companion en wizard, ADR-025/026/027), #268 (PR B
    Faculty Socratic Sermon Agent, ADR-028), #269 (PR C Pre-gen gate + snapshot + modo experto),
    #270 (Tier 3 puzzle estructural), #271 (Faculty reroute under flag), #272 (Boy-Scout
    chat.tsx refactor), #273 (8-step copy migration), #276 (restore "Sermón en blanco" entry).
  - **PRs de smoke-derived bugs**: #274 (3 bugs Fase 2.5 first impression: sidebar 6→8, companion
    leak, puzzle stuck), #275 (Tier 3 UX pass 1: linked hint + progress + dynamic CTA + length
    guard), #277 (Tier 3 copy clarity: zonas 0..N cláusulas), #279 (Tier 3 guard tibio
    chapter:verse + whitelist libros cortos), #280 (bible parser flexible refs — WRONG file dead
    code), #281 (bible parser REAL fix en `@dosfilos/infrastructure`), #282 (doc warnings
    duplicación parser web vs infra), #283 (Bible panel Filemón empty + canonical book order),
    #284 (SBLGNT panel verseStart=0 sentinel), #285 (wizard exit nav `/dashboard/sermons` +
    Step 0 "Volver a Sermones").
  - **Pivot Option B respecto al plan original** (ADR-025 kickoff): se reformularon criterios
    `Faculty passive tracker`, `LLM classifier batch every 3 msgs` y `NudgeDispatcher 10min` —
    objetivo pedagógico cumplido vía diseño unificado (un Acompañante + 3 momentos + spine
    determinista per-step), no via pipeline paralelo en Faculty. Ver § Criterios de aceptación.
  - **Deferred intencional** (no pretendiendo done): DnD nativo HTML5 (fold-in a Tier 3 v2),
    cache de `orientStudy` + `buildStructuralPuzzle` (PR separado próximo), PD content ingest
    (fundador en paralelo), LLM provider abstraction (`tech_debt_llm_provider_abstraction`),
    cleanup duplicación Bible parser (`tech_debt_bible_parser_duplication`).
  - **Propuesta Sprint 2**: [tier3-v2-dependency-diagram.md](../proposals/tier3-v2-dependency-diagram.md)
    (PR #278) — esqueleto de dependencias per-pasaje en lugar de 3 buckets abstractos. 4
    decisiones abiertas para fundador antes de codear.
  - **Session log**: [sessions/2026-05-29-phase-2.5-closeout.md](../sessions/2026-05-29-phase-2.5-closeout.md).
  - **Handoff Fase 3**: [phase-3-claim-source-fidelity.md](./phase-3-claim-source-fidelity.md)
    actualizada con prereqs marcados + riesgos cross-fase.
- **2026-05-28 (smoke PR A — iteración del acompañante)** — Validado en local. Aparecieron dos
  mejoras durante el smoke: (1) Tier 2 "Explícamelo más sencillo" agregado a `StepCompanion` +
  `orientStudy` (parámetro `simplify` + campo `example` con ejemplo del método en otro pasaje;
  redeployado). (2) Tier 3 "Reconstruye la estructura tú mismo" (puzzle interactivo de cláusulas
  para paso 3) propuesto y **diferido post-PR A** — documentado en
  [proposals/structural-puzzle-tier3.md](../proposals/structural-puzzle-tier3.md). Otros ajustes:
  re-rutado popover anclado (Radix) + placeholder de Análisis Estructural corregido (separación
  léxico ↔ estructura). Smoke continúa.
- **2026-05-27 (`/iniciar-fase 2.5` — kickoff + decisiones)** — Modelados los casos de uso del flujo
  completo (entrada → 8 pasos → tres testigos → homilética → redacción) con el fundador. Rechazada la
  lectura "dos motores" (medición Faculty + tutor wizard) → **un Acompañante de Estudio unificado**
  (ADR-025/026/027). Decisiones del fundador: (1) ambos threads en 2.5; (2) **Opción B** — Faculty =
  exploración, sermón = pipeline único vía seed (re-ruteo de PR #214 confirmado, "decisión basada en
  visión"); (3) modelo de cobertura cuelga del `pastoralSeed`, no del proyecto (proyectos existen hoy
  como etiqueta floja; project-as-container es Fase 5, no construida); (4) modo experto self-service
  ganado + override super-admin, suaviza no silencia; (5) Q7 **abstracción de proveedor LLM** →
  deuda técnica separada (memoria `tech_debt_llm_provider_abstraction`); callables nuevos de 2.5
  contra interfaz `LlmClient` fina; (6) cableado completo `AiAssistLog` (structural/wordStudies/
  crossRef) entra en 2.5; (7) trasfondo PD sigue sin ingestar (degradación elegante, OK). **Plan: 3
  PRs** — PR A (acompañante en wizard: cimiento + cobertura estructurada + orientación Momento 1 +
  AiAssistLog completo), PR B (Faculty alimenta seed + clasificador + nudges), PR C (gate
  pre-generación + snapshot + modo experto). Estim ~4.5 sem. **PR A en curso** (branch
  `feat/pastoral-fidelity-phase-2-5-study-companion`). Estado fase: `planning` → `in-progress`.
- **2026-05-27 (prereqs actualizados al cerrar Fase 1.6)** — Fase 1.6 (8-step spine) cerrada +
  merged + deployed (PR #265). Prereqs duros de 2.5 ahora apuntan al **eight-step spine** (no
  six-step): las 7 dimensiones se re-derivan de los 8 pasos; el pre-gen gate se unifica con el
  two-tier de ADR-023; `AiAssistLog` + `verifyTimelessPrinciple` disponibles como insumos/patrón.
  Deuda heredada documentada en § Prerequisitos (contenido PD, AiAssistLog parcial, outline LLM).
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
