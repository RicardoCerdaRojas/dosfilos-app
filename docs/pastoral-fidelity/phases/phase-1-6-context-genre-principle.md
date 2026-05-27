# Phase 1.6 — Contexto/Género + Principio atemporal + verificación proactiva (8-step spine)

## Estado

`proposed` — propuesta formal 2026-05-27, derivada del análisis del spec metodológico externo
(`preach-methodology-upgrade-spec.md`) contra el código real. Se acepta (y sus ADRs pasan a
`accepted`) al arrancar `/iniciar-fase 1.6`. **Inserta entre Fase 1.5 (cerrada) y Fase 2.5**, y
**refactoriza Fase 1** (el seed de 6 pasos pasa a 8).

## Por qué existe (origen)

Un análisis externo del flujo de Estudio (6 pasos) confirmó que la **filosofía es correcta**
(predicador hace el juicio, IA no es la voz = P2) pero detectó tres brechas estructurales que
son **valor hermenéutico-exegético**, no cosmética:

1. **IA fuera del flujo** — tutores/Faculty en pestañas; motor de paralelos servía solo un sample.
2. **Dos pasos mal nombrados** — "Sintaxis" en realidad es *análisis estructural/del discurso*
   (Kaiser *syntactical display*, Schreiner *tracing the argument*); "Morfología" es *semántica
   léxica* (estudios de palabras). La morfología real (parsing) es prerrequisito, no un paso.
3. **Faltan dos pasos no-opcionales** en hermenéutica histórico-gramatical:
   - **Contexto + Género** (el género gobierna las reglas de lectura → va *antes* de la estructura).
   - **Principio teológico atemporal** — el puente Kaiser (*principlizing bridge*) / Robinson
     (idea exegética → idea homilética) entre exégesis ("qué significó") y homilética ("qué
     significa hoy"). Hoy se colapsa en `insight.centralIdea`, abriendo la puerta a la eiségesis.

Análisis completo: ver bitácora + ADRs 022/023/024.

## Objetivo

Llevar el six-step spine a un **8-step spine** con la IA reubicada **dentro** de cada paso como
acelerador-insumo (nunca voz), **verificación proactiva de dos niveles** (no solo gate final), y
un paso-puente con guardrail anti-eiségesis. Sin violar P1/P2/P3 ni el manifesto.

### Flujo objetivo (6 → 8 pasos)

| # | Paso | Cambio | IA |
|---|---|---|---|
| 1 | **Lectura** (+ parsing on-demand) | Subir parsing/panel original al paso 1 | parsing/gloss = insumo; impresión SIN IA |
| 2 | **Contexto + Género** (NUEVO) | Reuse `BookPanorama`; Faculty inline | IA propone género + outline (confirmable); trasfondo vía RAG (ruta C) |
| 3 | **Análisis estructural** (rename `syntax`) | Display de cláusulas + verificador | IA propone display editable; **avisa** si la cláusula "principal" es subordinada |
| 4 | **Estudios de palabras** (rename `morphology`) | Ya implementado en Fase 1.5 | candidatos rankeados (ADR-018) + tutor inline (ADR-016) + discovery humano (ADR-021) |
| 5 | **Reconocimiento canónico** (`recognition`) | TSK full + rationale por cross-ref | recuperación = insumo; por-qué-importa humano |
| 6 | **Función original** (`function`) | Reusar contexto del paso 2 | surfacea situación de audiencia; juicio humano |
| 7 | **Principio teológico atemporal** (NUEVO) | El puente | IA **verificadora, nunca generadora** (reuse three-witnesses) |
| 8 | **Insight pastoral** (`insight`, SIN IA) | PRESERVAR | cero IA (test: ningún `AiAssistLog`) |

## Prerequisitos

| Prereq | De dónde | Estado |
|---|---|---|
| Six-step spine + `pastoralSeed` schema | Fase 1 (PR #257) | ✅ (se refactoriza aquí) |
| Pastoral Word Study (paso 4) | Fase 1.5 (PR #258) | ✅ (valida el diseño del spec) |
| `WitnessOrchestrator` + escalado puro | Fase 2 (PR #262, ADR-011) | ✅ (lo reusa el two-tier + paso 7) |
| `BookPanorama` + `GeminiExpositoryAssistant` (género + outline) | Exégesis (existente) | ✅ reuse |
| RAG infra (`retrieveChunks`, `document_chunks`, CORE stores) | Library (existente) | ✅ infra; **falta contenido** |
| Contenido de trasfondo histórico-cultural por libro | — | ❌ **gap — ver § Contenido** |

## Decisiones tomadas (ADRs de esta fase, `proposed`)

- [ADR-022](../decisions/ADR-022-eight-step-spine-rename-migration.md) — 8-step spine: insertar
  `ContextGenre` (pos 2) + `TimelessPrinciple` (pos 7); rename `syntax`→`structuralAnalysis` y
  `morphology`→`wordStudies` (keys + labels); migración idempotente de seeds existentes.
- [ADR-023](../decisions/ADR-023-two-tier-proactive-verification.md) — verificación proactiva de
  dos niveles: tripwire inline `core`-only (productive-struggle guardrail) + gate completo
  (three-witnesses + check de generalización). Reusa `WitnessOrchestrator`.
- [ADR-024](../decisions/ADR-024-genre-context-rag-ruta-c.md) — Contexto/Género: reuse
  `BookPanorama` (LLM, género+outline) + trasfondo histórico-cultural vía RAG ruta C (piso PD +
  curación progresiva por telemetría). `AiAssistLog` como audit de primera clase.

## Diseño técnico (alto nivel)

### Schema — extensión aditiva del `PastoralSeed` (no migrar a modelo polimórfico del spec)

Mantenemos `pastoralSeeds/{seedId}` (ADR-015) con **sub-steps tipados** (discriminated union),
NO el `content: Record<string,unknown>` del spec (preserva type-safety). Cambios:
- Rename keys: `syntax`→`structuralAnalysis`, `morphology`→`wordStudies`.
- Nuevos sub-steps: `contextGenre` (pos 2), `timelessPrinciple` (pos 7).
- `PASTORAL_SEED_STEP_ORDER` pasa a 8 entradas; validators per-step nuevos.
- `witnessReview` (ya existe, Fase 2) se generaliza para incluir el tripwire inline.

### Verificación de dos niveles (ADR-023)

- **Tier 1 — tripwire inline `core`-only**: al completar campos doctrinalmente cargados
  (`insight.centralIdea`, `insight.observations`, `timelessPrinciple`) corre T3-core debounced.
  Solo dispara aviso si hay riesgo de negar un credo ecuménico. **Silencio en distinctive/open**
  (productive struggle — no hand-holding sobre interpretación legítima). Verificador, no generador.
- **Tier 2 — gate completo (paso 7 + pre-borrador)**: three-witnesses completos + check de
  generalización del principio. Como el `core` ya se atajó inline, es refuerzo + capa distinctive/open.

### Contexto + Género (ADR-024)

- **Género + outline**: reuse `BookPanorama`/`GeminiExpositoryAssistant`, cacheado per-libro
  (`cache.ts`). IA propone (`aiProposed` → `userConfirmed`); el pastor escribe ≥1 implicancia.
- **Trasfondo histórico-cultural**: RAG sobre CORE library, ruta C:
  - Piso: comentarios/diccionarios PD (ISBE, Keil&Delitzsch, JFB) ingestados como `isSystemSource`.
  - Curación progresiva: dataset propio por libro (estilo `lexicon-curated-v1`), priorizado por
    telemetría de libros más predicados.
- Faculty consumible **inline** (panel), fallback a pestaña.

### AiAssistLog (ADR-024)

Colección de audit de primera clase con `assistType` + `outputWasEditedByUser`. Reemplaza el
audit disperso (`toolsConsulted`/`pasteEvents`) y alimenta el "% tuyo". Pasos 1 (impresión) y 8
(insight) NO generan `AiAssistLog` (test).

## Contenido a curar/conseguir (TAREA DEL FUNDADOR — ruta C)

Para el trasfondo histórico-cultural del paso 2 (rights-aware, ADR-006 / 07-citation-policy):

**Piso PD (ingestable ya, mayor ROI)**:
- **ISBE** (International Standard Bible Encyclopedia, 1915) — introducciones por libro.
- **Keil & Delitzsch** (AT) — trasfondo histórico fuerte.
- **Jamieson-Fausset-Brown (JFB)** — cobertura completa AT+NT.
- (opcionales) Matthew Henry, Barnes, Pulpit Commentary, Cambridge Bible.
- Fuentes: CCEL, StudyLight, archive.org. Todos dominio público.

**NO ingestar sin derechos**: intros de study bibles modernas (ESV/NIV), Carson/Beale, Longman,
NICOT/NICNT, WBC.

**Idioma**: PD de calidad es mayormente inglés → RAG inglés + output español (ya lo hacemos);
curación propia en español encima, progresiva.

## Criterios de aceptación (borrador — se afinan al kickoff)

- [ ] `PASTORAL_SEED_STEP_ORDER` = 8 pasos; seeds legacy migrados sin pérdida de datos.
- [ ] Labels + keys renombrados consistentemente (UI + dominio + prompt builder + tests).
- [ ] Paso 2 propone género (confirmable) + outline del libro; pastor escribe implicancia.
- [ ] Trasfondo histórico-cultural responde con **cita a fuente real** (no alucinación) cuando hay contenido.
- [ ] Tripwire inline dispara en `core` (test: "no existe la Trinidad" → aviso al escribir idea central) y **calla** en distinctive/open.
- [ ] Paso 7: el pastor escribe el principio; NO hay botón "generar principio"; verificador produce fundamento/riesgo-eiségesis/generalización referido a pasos 1-6.
- [ ] Paso 8 sigue SIN IA (test: cero `AiAssistLog`).
- [ ] Motor de paralelos (paso 5): Jn 1:1 → Gn 1:1 (regresión) + rationale por candidato.
- [ ] `AiAssistLog` registra cada asistencia con `outputWasEditedByUser`.
- [ ] Paridad AT: un pasaje hebreo (Gn 1:1) recorre pasos 1/3/4 con parsing, sin "solo NT".

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Migración de schema rompe seeds en prod | Flag-gated + volumen bajo hoy; migración idempotente, una corrida; hacerlo ya |
| Tripwire inline rompe productive struggle | Solo `core`; silencio en distinctive/open; verificador no generador (ADR-023) |
| Trasfondo RAG sin contenido = paso vacío | Ruta C: piso PD primero; el paso degrada elegante si no hay match |
| Costo LLM sube (más pasos + inline checks) | Cache per-libro (panorama) + tripwire debounced + cache `witnessResults/` |
| Overlap con Fase 2.5 dimensiones | 2.5 re-deriva sus dimensiones desde los 8 pasos (handoff) |

## Relación con otras fases

- **Refactoriza Fase 1** (seed 6→8) y **Fase 2** (gate-only → two-tier).
- **Bloquea/reordena Fase 2.5**: sus 7 dimensiones se re-derivan de los 8 pasos; su
  pre-generation gate se unifica con el two-tier. **2.5 no arranca hasta cerrar 1.6.**
- **Valida Fase 3/4**: el §4 del spec (trazabilidad token-a-fuente + "% tuyo en borrador") = Fase 3
  (claim↔source) + Fase 4 (autoría/voz). `AiAssistLog` (1.6) alimenta el "% tuyo".
- **Reuse de Fase 7 (exégesis)**: `BookPanorama` viene de ahí.

## Bitácora

- **2026-05-27** — Phase doc creado como propuesta. Análisis del spec metodológico externo vs.
  código real. Hallazgos: género+outline ya existen (`BookPanorama`, reuse); trasfondo
  histórico-cultural = gap total de contenido (CORE library solo tiene confesiones/texto/lexicons);
  estudios de palabras ya cumplen el spec (Fase 1.5); el verificador del paso 7 = patrón
  three-witnesses ya construido (Fase 2). Decisiones del fundador: rename completo (no labels-only),
  two-tier proactivo (su idea — atajar eiségesis `core` inline antes que contamine), ruta C de
  contenido (piso PD + curación progresiva), agregar los 2 pasos por valor hermenéutico. ADRs
  022/023/024 emitidos `proposed`. Números asignados al escribir (lección del retrospective de
  Fase 2: no pre-reservar números ADR).
