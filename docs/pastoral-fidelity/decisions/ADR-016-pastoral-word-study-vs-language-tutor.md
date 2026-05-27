# ADR-016 — Pastoral Word Study módulo separado de language tutors

## Estado

`accepted`

## Fecha

2026-05-26

## Contexto

Phase 1 (six-step spine) integró el `GreekTutorOverlay` existente en `MorphologyStep` (Paso 3) como herramienta de análisis de palabras clave. El tutor de griego (y su equivalente hebreo en `/dashboard/hebrew-tutor`) están construidos como **módulos de aprendizaje de idiomas**: currículo progresivo, unidades de estudio, quizzes de comprensión, refuerzo paradigmático, conceptos library, drills morfológicos.

Durante el smoke test de Phase 1 (2026-05-26) se identificó tensión arquitectónica:

> Esos modulos estan pensados para un estudiante que quiere aprender la gramatica y no para un pastor o maestro que quiere estudiar el texto con ayuda de un tutor profesional en exégesis griega o hebrea.

El **manifesto pedagógico** (`05-pedagogy-manifesto.md` § "Sobre los pasajes y las disciplinas teológicas") es explícito:

> Cuando un punto exegético depende del original (griego/hebreo), citarlo con transliteración y traducción, brevemente, **sin convertir la clase en lección de idiomas**.

El embed actual viola ese principio. El pastor preparando un sermón aterriza en una UI diseñada para un estudiante de seminario que cursa Griego I/II: sidebar de "Unidades de Estudio", "Quiz de Comprensión", "Refuerzo del Aprendizaje", "Conceptos Library". El pastor no necesita ese andamiaje — necesita **extracción exegética puntual** del pasaje específico para alimentar su sermón.

## Decisión

El módulo de **análisis de palabras para uso pastoral** se separa arquitectónicamente del **módulo de aprendizaje de idiomas**:

1. **`PastoralWordStudy`** (nuevo, Fase 1.5) — surface modal/sidebar enfocada en sermón:
   - Identificación de palabras clave teológicamente cargadas del pasaje (5-8, no todas)
   - Análisis exegético por palabra: forma + transliteración + lema + gloss + rango semántico + función gramatical EN ESTE verso + 2-3 resonancias canónicas + peso teológico
   - Campo de "descubrimiento pastoral" donde el pastor escribe en sus palabras (con AI suggestion como hint editable, no autocompletar)
   - **Sin quizzes, sin training units, sin drills, sin paradigmas**
   - Output alimenta directamente `PastoralSeed.morphology.wordStudies[]`

2. **Tutores de aprendizaje existentes** (`/dashboard/greek-tutor`, `/dashboard/hebrew-tutor`) — permanecen como herramientas de **formación lingüística** para usuarios que quieren aprender el idioma:
   - Naming clarification: copy del menú + landing diferencia "Aprende Griego" (módulo de aprendizaje) vs "Análisis Pastoral del Texto" (módulo de sermón)
   - No se modifican estructuralmente; siguen disponibles para el caso de uso original
   - Pastoral Fidelity flow NO los embed

3. **Fase 1 ship interim**: `MorphologyStep` mantiene el `GreekTutorOverlay` embed hasta que Fase 1.5 aterrice. El embed funciona (con fixes de morphology bug aplicados 2026-05-26) pero es **filosóficamente sub-óptimo** — documentado como deuda explícita en bitácora Phase 1.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Mantener embed del Greek/Hebrew tutor permanente** | Viola manifesto explícito ("sin convertir la clase en lección de idiomas"). Pastor entra esperando análisis pastoral; obtiene UI de estudiante de seminario. Carga cognitiva inapropiada para el caso de uso. |
| **Reformar Greek/Hebrew tutor in-place** (one module sirve ambos casos) | Imposible sin sacrificar uno de los dos casos. Estudiante necesita drills/quizzes; pastor necesita extracción focalizada. UI condicional bajo flag mezcla ambas audiencias y termina sirviendo a ninguna bien. |
| **Bloquear Phase 1 + insertar Pastoral Word Study antes de cerrar PR** | Phase 1 PR ya extenso (~3000-4500 LOC). Bundling pivot mayor diluye review + delay smoke test ya andando. Pastoral Word Study merece su propia conversación de diseño (catálogo curado vs LLM-extracted? lexicon source? cross-ref scope?). |
| **Quick pivot pequeño antes de cerrar PR** (mini-modal single LLM call) | Pretende cerrar el círculo pero introduce surface nueva sin diseño formal. Mejor abrir Fase 1.5 con phase doc + ADR explícitos antes de codear. |

## Consecuencias

### Positivas

- **Coherencia con manifesto**: el módulo que el pastor consume está alineado con "el original sirve a la exégesis, no se convierte en clase de idiomas".
- **Separation of concerns**: estudiante y pastor son audiencias distintas con jobs-to-be-done distintos. Cada uno recibe surface optimizada para su caso.
- **Reuse de infraestructura**: SBLGNT/MorphHB providers, cross-ref engine (Phase 0), Gemini service patterns — todo se reusa en el nuevo módulo. Lo nuevo es el orquestador + el prompt + la UI focalizada.
- **Diferenciador de producto**: ningún competidor expone "análisis pastoral del texto" como surface distinta del "aprende griego". Marketing puede invocarlo directamente.
- **Onboarding pastor más limpio**: pastor sin formación lingüística no se intimida con UI académica.
- **Tutores de aprendizaje siguen siendo valiosos** para usuarios que quieren formación lingüística — no se desperdicia infraestructura existente.

### Negativas

- **Interim degradado en Phase 1**: hasta que Fase 1.5 aterrice, `MorphologyStep` embed muestra UI académica al pastor. Mitigación: documentado explícitamente en bitácora + Fase 1.5 listada como next-up en roadmap.
- **Duplicación de prompts**: prompts pastorales + prompts de aprendizaje cohabitan separados. Mantenimiento ongoing.
- **Curación de palabras clave**: ¿quién decide cuáles palabras teológicamente cargadas surface en cada pericope? Opciones (a) LLM-extracted con ranking heurístico, (b) catálogo curado pre-canonicalizado, (c) híbrido. Decisión en Fase 1.5.
- **Lexicon source**: BDAG está bajo copyright. Necesitamos source open-access (LSJ, Strong, Thayer) o construir gloss curated. Decisión en Fase 1.5.

### Neutrales

- Tutores de aprendizaje pueden eventualmente migrar a una sección de producto separada (`/dashboard/seminario` o similar) que agrupa todas las herramientas de formación lingüística. Decisión futura, no bloquea esta.

## Impacto

- **Código afectado**:
  - **Nuevo módulo** `packages/web/src/pages/sermons/generator/pastoralSeed/wordStudy/PastoralWordStudyModal.tsx` (más subcomponentes)
  - **Nuevo use case** `packages/application/src/use-cases/pastoral-word-study/AnalyzeWordPastorallyUseCase.ts`
  - **Nuevo prompt** en `packages/infrastructure/src/gemini/pastoralWordStudyPrompts.ts`
  - **Modificar** `MorphologyStep.tsx` — reemplazar `GreekTutorOverlay` import por `PastoralWordStudyModal`
  - Hebrew tutor link-out se reemplaza por análisis pastoral hebreo (mismo modal, prompt diferente)
- **Fases impactadas**:
  - **Phase 1**: ship con embed actual (interim degradado documentado)
  - **Fase 1.5 (nueva)**: Pastoral Word Study module
  - **Fase 2** (tres testigos): Testigo 1 (contexto inmediato) puede consumir output del análisis pastoral
- **Migraciones requeridas**: ninguna en datos. Cambio de UI sólo.
- **Reversibilidad**: alta — feature flag o simple rollback del componente import en MorphologyStep.

## Referencias

- Phase doc Fase 1: `phases/phase-1-six-step-spine.md` (bitácora 2026-05-26)
- Phase doc Fase 1.5: `phases/phase-1-5-pastoral-word-study.md` (nuevo)
- ADR relacionado: ADR-002 (six-step spine — define MorphologyStep como consumidor)
- ADR relacionado: ADR-005 (manifesto adoption — citado en justificación)
- Memoria: `feature_greek_tutor_methodology_narrative` (preserva tutors de aprendizaje para reuse en learning surfaces)
- Manifesto: `05-pedagogy-manifesto.md` § "Sobre los pasajes y las disciplinas teológicas"
