# ADR-025 — Study Companion: modelo unificado (un acompañante, un modelo de cobertura ⊂ seed, tres momentos)

## Estado

`accepted` — aceptado 2026-05-27 al arrancar `/iniciar-fase 2.5`.

## Fecha

2026-05-27

## Contexto

El phase doc de Fase 2.5 ([phase-2-5-study-depth-copilot.md](../phases/phase-2-5-study-depth-copilot.md))
describía dos piezas que, leídas literalmente, se implementarían como **dos motores distintos**:

1. Un **motor de medición** que clasifica la profundidad de la sesión Faculty (`DimensionClassifier`
   + `DimensionTracker` + gate pre-generación), nacido del gap "sermón tras 1 Q&A" (PR #214,
   `derivedContext: 'faculty'`).
2. Un **tutor socrático por paso** dentro del wizard de 8 pasos (directiva del fundador, sesión 1.6):
   el sistema dejó pasar "como es profecía, todo se cumplirá" en el paso 2 (género) sin guía. El
   fundador pidió un asistente que conozca pasaje + paso y dé datos + preguntas en cada momento.

El fundador rechazó explícitamente la duplicación: *"la idea no es duplicar herramientas, es
complementar y mejorar el proceso… el foco está en cómo ayudamos al pastor, no en cuántas
herramientas implementamos."* Modelamos el flujo completo (entrada → 8 pasos → tres testigos →
homilética → redacción) y los casos de uso convergen en **un solo acompañante**.

Restricción dura del manifesto: el acompañante es **verificador-orientador, nunca generador**
(P1 labor antes que output; P2 AI desarrolla no origina; productive struggle / Kapur). Reusa el
patrón de `verifyTimelessPrinciple` (ADR-022) y el tripwire de [ADR-023](./ADR-023-two-tier-proactive-verification.md).

## Decisión

### Un acompañante, un modelo de cobertura, tres momentos

Fase 2.5 implementa **un** Acompañante de Estudio (no dos motores). Mantiene **un solo modelo de
cobertura** —`StudyDepthAssessment`, con 7 dimensiones— y se expresa en **tres momentos**:

| Momento | Qué hace | Superficie |
|---|---|---|
| **1 — Orientación en contexto** | Datos + preguntas socráticas + confronta errores. Nunca escribe la respuesta. | Por paso en el wizard; por mensaje en Faculty. |
| **2 — Modelo de cobertura** (background) | Mantiene las 7 dims. **Dos fuentes de evidencia, UN modelo**: estructurada (campos del wizard llenos) + inferida (clasificador LLM sobre mensajes Faculty). | Ambas. |
| **3 — Confrontación en el umbral** | Refleja la cobertura antes de generar el sermón; confronta gaps; override con justificación; snapshot en el sermón. | Entrada de generación. |

### El contenedor es el `pastoralSeed` (NO el proyecto)

`StudyDepthAssessment` vive **1:1 con el `pastoralSeed`** (el seed de 8 pasos ya es el artefacto de
estudio por-pasaje). **No** se keyea por `projectId`: el doc original asumía la reforma
"project-as-container" de **Fase 5, que no está construida** — hoy `Project`/`AIProject` es etiqueta
floja y `seriesId` es el contenedor real. Atar el modelo de cobertura al seed elimina esa dependencia.

### Opción B — Faculty alimenta el seed; pipeline único de sermón

Decisión del fundador: **Faculty es exploración**, no un segundo camino que pare sermones. El sermón
nace **solo** del `pastoralSeed` (pipeline único). El path Faculty→sermón actual (PR #214,
`BuildSermonFromFacultyOutlineUseCase`) se re-rutea: "Generar sermón" en Faculty alimenta/crea el
seed y aterriza al pastor en el estudio, en vez de construir un sermón directo. Esto cierra el bypass
que motivó la fase (P1) y da al acompañante una sola superficie de verdad.

### Las 7 dimensiones re-derivadas de los 8 pasos (Fase 1.6)

El doc derivaba las dims del six-step; el spine real es **8 pasos** (ADR-022). Mapeo canónico:

| Dim | Nombre | Evidencia estructurada (paso 8-step) | Evidencia inferida (Faculty) |
|---|---|---|---|
| D1 | Lectura ancla | `reading` completo | mensajes que citan/reflexionan el pasaje |
| D2 | Contexto + género | `contextGenre` (género confirmado + implicancia escrita) | clasificador detecta discusión de género/trasfondo |
| D3 | Estructura | `structuralAnalysis` | clasificador detecta análisis sintáctico |
| D4 | Palabras / lenguas | `wordStudies.studies` (≥2 substantivas) | lookups griego/hebreo + `PastoralWordStudyModal` |
| D5 | Reconocimiento canónico | `recognition.parallels` (relevancia marcada) | `lookupCrossReferences` + paralelos discutidos |
| D6 | Función + sistemática/histórica | `function` + Testigo 3 (confesión) + `timelessPrinciple` | clasificador detecta marco doctrinal/tradición |
| D7 | Confrontación / contraposturas | `witnessReview` (engagement con soft/hard blocks) | clasificador detecta engagement argumentativo |

Nota: el doc listaba D2=Lenguas y D3=Sintaxis+morfología colapsados; el 8-step separa
`structuralAnalysis` (D3) de `wordStudies` (D4), y mueve género a paso explícito (D2). El verificador
del principio (paso 7) y los tres testigos (Fase 2) alimentan D6/D7 directo. Score por dim 0-100;
agregado = promedio ponderado (pesos default uniformes, configurables en ADR futuro si hace falta).

### Sin gamificación

El badge muestra **cobertura cualitativa** ("Sin tocar" / "Iniciado" / "Cubierto" / "Profundo"),
nunca puntos/streaks/leaderboard visibles. El score numérico es interno (alimenta gate + métricas
+ Fase 4), no pastor-facing.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Dos motores (medir Faculty + tutorear wizard por separado) | Duplica herramientas; el fundador lo rechazó. El foco es el proceso del pastor, no el conteo de features. |
| Keyear cobertura en `projects/{projectId}` (como el doc original) | Asume project-as-container de Fase 5, no construida. El seed ya es el contenedor de estudio. |
| Opción A — Faculty paralelo que también pare sermones | Mantiene el bypass que viola P1; duplica "dónde se estudia"; dos superficies de verdad. |
| Derivar dims del six-step | El spine real es 8 pasos (ADR-022). Mapeo desactualizado. |

## Consecuencias

### Positivas
- Un solo acompañante coherente en todo el flujo; cero duplicación.
- Cobertura colgada del seed → cero dependencia de Fase 5.
- Cierra el bypass Faculty→sermón (P1) con pipeline único.
- Reusa patrón verificador-orientador (ADR-022/023), tres testigos (Fase 2), cross-ref (Fase 0).

### Negativas
- Re-rutear PR #214 es cambio de comportamiento (riesgo de regresión en el path Faculty). Mitigado: aislado en PR B + smoke dedicado.
- Dos fuentes de evidencia (estructurada + inferida) hacia un modelo → cuidado de no doble-contar; se reconcilia por dim con `evidenceCount` + `lastEvidenceAt`.

### Neutrales
- El modo experto + override viven en ADR-027; la política de orientación (silencio no-core) en ADR-026.

## Impacto

- **Código afectado**: `packages/domain` (`StudyDepthAssessment`, `LlmClient` interface, `IStudyDepthRepository`); `packages/infrastructure` (`FirestoreStudyDepthRepository`, `GeminiLlmClient`); `packages/functions` (`orientStudy`, luego `classifyDimensions`); `packages/application` (`StudyDepthService`); `packages/web` (`useStudyDepth`, `StudyDepthBadge`, `StepCompanion`, wizard 8 pasos). Firestore: `pastoralSeeds/{seedId}/studyDepth` (subdoc) + rules.
- **Fases impactadas**: Fase 4 consume `studyDepthSnapshot` (badge "Sello propio"). Fase 5/6 heredan el contenedor seed.
- **Migraciones requeridas**: ninguna (aditivo; seeds existentes computan cobertura on-demand).
- **Reversibilidad**: alta — todo detrás del sub-flag `study_depth` (default off).

## Referencias

- Phase doc: [phase-2-5-study-depth-copilot.md](../phases/phase-2-5-study-depth-copilot.md)
- Reusa: [ADR-022](./ADR-022-eight-step-spine-rename-migration.md), [ADR-023](./ADR-023-two-tier-proactive-verification.md), [ADR-011](./ADR-011-three-witnesses-multi-witness-orchestrator.md)
- Política orientación: [ADR-026](./ADR-026-step-orientation-supersede-silence.md)
- Override + modo experto: [ADR-027](./ADR-027-override-and-expert-mode-policy.md)
- Manifesto: [05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md), bridge [06-pedagogy-applied.md](../06-pedagogy-applied.md)
- Memoria: `feature_pastoral_fidelity_roadmap`, `tech_debt_llm_provider_abstraction`
