# Fase 0 — Reporte de gaps: redacción del sermón (fidelidad de tesis)

> Reporte, no plan. Sin código. Responde las 5 preguntas del fundador con evidencia
> de código. Encuadre aceptado: el borrador es el ÚNICO artefacto que se predica y
> el único lugar donde una fabricación nuestra llega a una congregación; la
> redacción no heredó la disciplina del estudio (testigos, fail-closed, 036).

## Q1 — La métrica de autoría, ¿mira el draft o solo el estudio?

**Solo el estudio. El draft NO está instrumentado para autoría.**

- `AiAssistLog` (ADR-024, la auditoría de asistencia/autoría) se emite en los pasos
  del ESTUDIO: `PastoralSeedWizard.tsx`, `StepCompanion.tsx`, `ReadingStep.tsx`
  (y los demás step components).
- En el path del BORRADOR — `StepDraft.tsx`, `SermonGeneratorService.ts`,
  `GeminiSermonGenerator.ts` — hay **cero** referencias a `AiAssistLog` / autoría.

**Consecuencia (confirma tu sospecha):** el lugar donde MÁS se pierde fidelidad —
el borrador re-inventando exégesis — es exactamente donde **no medimos autoría**.
La instrumentación de autoría es ciega al draft.

## Q2 — Para 1a: ¿el manifest está en el post-proceso con provenance estructurada?

**Sí, en mano. El patrón recover-then-adjudicate de 036 aplica TAL CUAL — no hay
que recuperar nada.**

- El `CitationManifest` se construye dentro de `generateSermonDraft`
  (`SermonGeneratorService.ts:265`) y vive durante todo el post-proceso.
- Cada entrada trae **provenance estructurada**: `resourceId` (libro), `chunkId`,
  `page`, `author`, `title`, `excerpt` (texto real del chunk). = la "fuente vetada"
  de ese sermón (retrieveChunks sobre biblioteca personal + CORE).
- Entonces una `authorityQuote` se puede **adjudicar contra el manifest** (autor en
  el set + cita anclada al excerpt) exactamente como 036 adjudica un ancla → o
  resuelve, o se cae (fail-closed).

**Gap actual:** hoy la `authorityQuote` NO se trata así. Solo pasa por el sanitizado
de B (`sanitizeDraftUntilClean`), que es **reescribir-y-esperar** — no el drop
fail-closed contra fuente vetada que pediste. La provenance para hacerlo bien YA
está disponible; falta el mecanismo 036-style.

## Q3 — Shadow: ¿qué emite telemetría hoy y qué habría que instrumentar?

**Hoy, en el draft, solo telemetría de CITAS. Nada de authorityQuote-fabricada,
cita-verso-equivocado ni FCF-ausente.**

Emite hoy (persistido en el doc del sermón):
- `citationValidation` (`SermonGeneratorService.ts:298`): markersDropped,
  droppedEntries — validador de marcadores `[Sn]`.
- `citationSanitization` (`:329`): {removed, residual} — el loop de B v2.

NO emite (los tres que querés medir):
- **authorityQuote-fabricada**: no se cuenta cuántas `authorityQuote` resuelven al
  manifest vs no.
- **cita-verso-equivocado**: no hay match verso-punto ↔ verso-chunk (además los
  chunks no tienen verso — ver Q de relevancia previa).
- **FCF-ausente / cristocentrismo-genérico**: cero detección.

El ESTUDIO sí tiene disciplina de shadow (`passageProfileShadow` de 035,
`AiAssistLog`, sombra doxológica). El DRAFT no tiene ninguna.

**Para medir sin bloquear** (inventario, no plan): un **recorder de sombra del
draft** (espejo de `recordPassageProfileShadow`) que por generación registre, sin
gatear nada: (a) nº de `authorityQuote` + cuántas resuelven al manifest
(reusa la lógica de `verifyDraftCitations`); (b) nº de citas + cuántas con
match de verso (requiere parsear verso del `point` + heurística de verso en el
excerpt); (c) FCF/cristocentrismo presente (heurística o juez LLM, shadow). Todo
como dato, cero enforcement.

## Q4 — seedToExegesis: inventario exacto de pérdida (sin fix)

`seedToExegesis.ts:21-58`. Campo del estudio → destino en el draft:

**Sobrevive** (vía PRIMARY VOICE + exegeticalProposition + canonicalParallels + pastoralInsights):
- `insight.centralIdea` → `exegeticalProposition` (verbatim en el draft). ✅
- `insight.observations[]` → `pastoralInsights`. ✅
- `insight.openQuestion` → `pastoralInsights`. ✅ (pero no se usa para conducir transiciones)
- `insight.pastoralAnecdote` → `pastoralInsights`. ✅
- `insight.doxologicalApplication` → `pastoralInsights`. ✅
- `recognition.parallels[]` → `canonicalParallels` (ADR-035 R3). ✅ (sin garantía de cita primaria)

**Aplastado (parcial):**
- `structuralAnalysis.mainClause` → `context.literary = mainClause.pastorNote`
  SOLO. Se pierde `mainClause.reference`; y es UNA línea, no análisis estructural.
- `wordStudies.studies[]` → `KeyWord{ original: word, lemma: word,
  significance: pastorDiscovery }`; `transliteration`, `literalTranslation`,
  `morphology`, `syntacticFunction` quedan **vacíos** (`''`). Se pierde
  `reference`, el `lemma` real, `language`, y — clave — el análisis morfológico
  completo (que existe en `PastoralWordAnalysis` vía `wordAnalysisId`, **pero
  seedToExegesis no lo dereferencia**).
- `function.originalAudienceFunction` → duplicado en `context.historical` Y
  `context.audience` (dos slots distintos rellenos con lo mismo).

**Perdido del todo (dropped):**
- `reading.firstImpression` — no se mapea.
- `contextGenre` completo: `genre`, `genreImplication`, `bookLocationNote` — no se
  mapean. (El género se usa en el passage_profile, pero no llega a la exégesis/draft aquí.)
- **`timelessPrinciple.principle` — DROPPED.** Es el puente principlizador
  (Kaiser/Robinson: "lo que significó" → "lo que significa hoy"), el corazón
  hermenéutico entre exégesis y aplicación. **No llega al borrador.**
- `timelessPrinciple.verificationReport` — dropped.

**Lectura:** el estudio captura profundidad (estructura, morfología, principio
atemporal); el draft hereda la VOZ (idea central, observaciones, anécdota,
paralelos) pero **NO la exégesis viva**. El principio atemporal — el puente mismo —
se pierde. Por eso el sermón re-inventa la exégesis.

## Q5 — El merge sigue siendo tuyo

**Confirmado.** Abro PRs; **nada se integra sin tu mano.** No mergeo sin tu OK
explícito, en esto y en adelante.

## Notas de encuadre (aceptadas)

- **Es fidelidad de tesis, no calidad.** El draft es el punto de fuga de la
  fidelidad; la disciplina de 036 tiene que llegar ahí.
- **1a antes que 1b.** authorityQuote fabricada = el modo "fabricamos" en el
  púlpito = catástrofe de confianza. Va primero, como 036 (presencia≠validez,
  resolver contra fuente vetada o caer, fail-closed — no reescribir-y-esperar).
- **1b = subir la vara + permitir punto-sin-cita** ahora. Retrieval por-punto es
  infra → va al ADR, no ahora.
- **Shadow antes de todo validador.** Ninguna afirmación de "Gemini hace X seguido"
  se convierte en enforcement sin tasa real medida en sombra primero.
- **ADR "Redacción v2"** (fases 2-4): schema completo de una vez, domain-pure
  first, nada de agregar campos a `SermonContent` de a uno. Profundidad (heredar
  exégesis viva) antes que oficio.
