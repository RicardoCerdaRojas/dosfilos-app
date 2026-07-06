# Fase 0 — Addendum: corrección Q4 + scope 1.5b + traza del enfoque + instrumentación

> Reporte, no plan. Sin código. Complementa `sermon-draft-fase0-gap-report.md`.

## Corrección a Q4 (el reporte original estaba parcialmente MAL)

El Q4 original trazó SOLO `seedToExegesis` (bloque de contexto secundario). Hay un
segundo camino — **PRIMARY VOICE** (`augmentRulesWithPastoralSeed` StepDraft:815-837
→ `buildPastoralSeedBlock`) — que es autoritativo y carga casi todo:

| Campo | ¿Llega al draft? |
|---|---|
| **timelessPrinciple** | ✅ SÍ (Q4 dijo "dropped" — MAL). StepDraft:836 → principleBlock:414 |
| genre + genreImplication + bookLocationNote | ✅ SÍ (833-835) |
| structuralAnalysis (clause + note) | ✅ SÍ (821-822) |
| word studies {word, reference, discovery} | ✅ SÍ (823-826) |
| parallels, observations, anécdota, doxológica | ✅ SÍ |

**El puente hermenéutico NO se droppea.** Reubica la causa raíz: si le damos el
principio y el modelo igual re-inventa, es **adherencia del modelo** (Gemini ignora
lo que hereda), no falta de datos. → la instrumentación de adherencia es central.

## Scope 1.5b — profundidad del word study (léxico)

**Hoy llega** `{word, reference, discovery(pastorDiscovery)}`. **NO llega** el
`PastoralWordAnalysis` que el pastor consultó, que tiene: `gloss.primary` +
`gloss.semanticRange`, **`grammaticalFunctionInVerse`**, `theologicalWeight`,
`resonances` (canónicas). Es profundidad exegética real (función gramatical + peso
teológico), NO un paradigma de parsing (tiempo/voz/modo — eso vive en SBLGNT/tutor,
no se captura en el seed).

**Costo: MODERADO-BAJO** (plomería, sin callable/LLM/re-index):
- Fetch barato: `wordAnalysisId` ES el doc id (`pastoralWordAnalyses/{id}`) →
  `getDoc` por id, N estudios (2-5), paralelizable.
- Dónde: `augmentRulesWithPastoralSeed` (ya async, cliente).
- Shape: extender `rules.pastoralSeed.wordStudies` (domain-pure) + render en
  `buildPastoralSeedBlock`.
- Cobertura: solo estudios con `wordAnalysisId` (modal); manuales quedan con
  `discovery` — degradación limpia.

## Traza del enfoque homilético (las 3 preguntas)

**Q1 — ¿el enfoque GOBIERNA el draft?** **Viaja, pero NO controla.**
- `HomileticalApproach.type` (`expositivo|pastoral|apologético|teológico|
  evangelístico|narrativo`) + su `outline` llegan al prompt
  (`buildSermonDraftPromptBody:514`: "Enfoque: … / Bosquejo: {outline}").
- PERO el prompt solo LISTA el enfoque — **no instruye** ("si expositivo, desglosa
  verso-por-verso"). Lo único teológico obligatorio es FCF + cristocentrismo (para
  todos). → el draft puede salir temático aunque se eligió expositivo.

**Q2 — secuencia outline↔elección.** **Two-phase, sana.** Fase 1: previews (~4-5,
`suggestedStructure` string, SIN outline detallado). El pastor elige. Fase 2
(`developSelectedApproach`): genera el outline completo CON el enfoque elegido. El
draft usa el outline de Fase 2. → **el outline se genera POST-elección** (no hay
problema de secuencia como con el seed). Lo que falta es que el draft cumpla el tipo.

**Q3 — ¿validador de cumplimiento post-gen?** **NO** (grep 0 matches).
`validateCitations` = citas; `ContentValidator` = estructura; `ApproachFactory.
validate` = campos pre-gen. **Nada verifica que el draft respete el `approachType`
elegido.**

**El enfoque es la VARA del validador de profundidad.** No se mide "rigor exegético"
en abstracto: un expositivo que prometió verso-por-verso y no cumplió = falla; un
pastoral no se mide con esa vara. Buena noticia: el `approachType` **YA viaja al
draft** → se puede validar contra él. Los gaps son (a) el prompt no lo instruye,
(b) no hay validador de cumplimiento.

## Diseño de la instrumentación de sombra del draft (Q1+Q3 juntos)

Un recorder de sombra del draft (espejo de `recordPassageProfileShadow`), disparado
por generación, **non-blocking, sin enforcement**, gated por flag. Captura, sin
gatear nada:

**Señales deterministas (baratas, siempre):**
- `authorityQuote`: total + cuántas resuelven al manifest → **tasa de fabricada**
  (reusa la lógica de `verifyDraftCitations`).
- Citas: total + heurística de **match de verso** (regex de verso en excerpt vs los
  versos del punto) → tasa de cita-verso-equivocado. *Heurística* porque el chunk no
  tiene metadata de verso.
- `approachType` elegido + `timelessPrinciple` presente (metadata para segmentar).

**Señales de juez LLM (caras → muestreadas/gated, shadow-only):**
- **FCF-presente**: ¿intro/punto-1 declara la condición caída?
- **Adherencia al principio**: ¿el draft refleja el `timelessPrinciple` heredado, o
  lo ignora? (la señal que reubica la causa raíz).
- **Cumplimiento del enfoque**: ¿el draft cumple el `approachType`? (expositivo →
  desglose verso-por-verso; pastoral → consuelo/aplicación). Juzgado CONTRA el tipo
  elegido — la vara del validador de profundidad.

**Dónde**: hook en `generateSermonDraft` (o post en StepDraft), fire-and-forget a
`sermonDraftShadow/`. **Costo**: deterministas gratis; juez muestreado (no cada
generación) para controlar tokens. Retención TTL como el resto.

**Esto es prerrequisito de TODO validador**: sin la tasa real medida, no sabemos si
un fix sirvió, ni contra qué vara (el enfoque) validar la profundidad.
