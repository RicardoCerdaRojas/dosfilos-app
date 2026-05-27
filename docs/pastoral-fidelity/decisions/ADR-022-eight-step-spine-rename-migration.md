# ADR-022 — 8-step spine: añadir Contexto/Género + Principio atemporal, renombrar, migración

## Estado

`proposed` — se acepta al arrancar `/iniciar-fase 1.6`.

## Fecha

2026-05-27

## Contexto

El six-step spine (Fase 1, ADR-002) tiene dos pasos mal nombrados y le faltan dos pasos
no-opcionales de la hermenéutica histórico-gramatical (análisis externo del flujo, validado
contra el manifesto):

- `syntax` ("Sintaxis") en realidad hace **análisis estructural/del discurso** (Kaiser
  *syntactical display*, Schreiner *tracing the argument*), no sintaxis en sentido estricto.
- `morphology` ("Morfología") hace **semántica léxica** (estudios de palabras). La morfología
  real (parsing) es prerrequisito, no un paso.
- Falta **Contexto + Género** (el género gobierna las reglas de lectura → antes de la estructura;
  guardrail §8 #3 del spec).
- Falta el **Principio teológico atemporal** (puente Kaiser/Robinson exégesis→homilética). Hoy se
  colapsa en `insight.centralIdea`, mezclando "verdad teológica" (qué significa) con "idea
  homilética" (voz del predicador para su congregación) — distinción de Robinson.

El fundador decidió **rename completo (keys + labels)**, no labels-only: keys de código que
divergen de los labels son trampa de mantenimiento (`seed.syntax` leería "sintaxis" cuando el
dominio es "análisis estructural").

## Decisión

**8-step spine**, extensión aditiva-con-rename del `PastoralSeed` (mantiene `pastoralSeeds/{seedId}`,
ADR-015; sub-steps tipados como discriminated union — NO el `Record<string,unknown>` polimórfico
del spec, que perdería type-safety).

`PASTORAL_SEED_STEP_ORDER`:

| pos | key | antes |
|---|---|---|
| 1 | `reading` | = |
| 2 | `contextGenre` | **NUEVO** |
| 3 | `structuralAnalysis` | rename de `syntax` |
| 4 | `wordStudies` | rename de `morphology` |
| 5 | `recognition` | = |
| 6 | `function` | = |
| 7 | `timelessPrinciple` | **NUEVO** |
| 8 | `insight` | = |

- **Rename** `syntax`→`structuralAnalysis`, `morphology`→`wordStudies` en: domain entity +
  validators + `PASTORAL_SEED_THRESHOLDS` + `PASTORAL_SEED_AI_FORBIDDEN_FIELDS` + web steps +
  breadcrumb + prompt builder (`buildPastoralSeedBlock`) + tests + Firestore.
- **Nuevos sub-steps** con validators propios:
  - `contextGenre`: `{ genre, genreImplication (humano, ≥X chars), bookLocationNote, historicalContextConsulted }`.
  - `timelessPrinciple`: `{ principle (humano, ≥X chars, AI-forbidden), verificationReport? }`.
- `insight.centralIdea` se mantiene pero el copy aclara la distinción con `timelessPrinciple`
  (principio = verdad teológica; idea central = idea homilética en la voz del predicador).
- **Orden no invertible**: género (paso 2) antes que estructura (paso 3). El wizard no permite
  saltar a 3 sin 2.

### Migración

Idempotente, una corrida (flag-gated + volumen bajo hoy → barato ahora, caro después):
- Copiar `seed.syntax`→`seed.structuralAnalysis`, `seed.morphology`→`seed.wordStudies`.
- Crear `contextGenre` + `timelessPrinciple` vacíos como "pendientes" en seeds legacy.
- Recomputar `completed` con los 8 validators (seeds legacy quedan incompletos → el pastor
  completa los 2 pasos nuevos al retomar; aceptable, son seeds dogfooding).

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Rename labels-only (no keys) | Divergencia label↔código = trampa de mantenimiento (decisión del fundador). |
| Migrar a modelo polimórfico del spec (`StudySession`+`StudyStep[]` con `content: Record`) | Pierde type-safety. Extensibilidad se logra con discriminated union sin sacrificar tipos. ADR-015 (flat tipado) se mantiene. |
| No agregar los pasos / dejarlos opcionales | El género y el principio son no-opcionales en hermenéutica histórico-gramatical. Es valor de calidad para predicadores/académicos. |
| Diferir rename a "después" | Cuanto más seeds en prod, más cara la migración. Ahora es el momento barato. |

## Consecuencias

### Positivas
- Nomenclatura fiel a la metodología (Kaiser/Schreiner/Robinson) — credibilidad académica.
- Género antes de estructura = orden hermenéutico correcto.
- El puente del principio cierra el salto exégesis→homilética (anti-eiségesis).
- Schema sigue tipado (discriminated union).

### Negativas
- Refactor de Fase 1 (shipped): touch amplio (domain/web/infra/tests) + migración Firestore.
- Seeds legacy quedan "incompletos" hasta que el pastor llene los 2 pasos nuevos.

### Neutrales
- Coste LLM sube por 2 pasos más (mitigado por cache per-libro del panorama).

## Impacto

- **Domain**: `PastoralSeed` (rename + 2 sub-steps + validators + thresholds + AI-forbidden); `PASTORAL_SEED_STEP_ORDER`.
- **Web**: 2 step components nuevos (`ContextGenreStep`, `TimelessPrincipleStep`) + rename de `SyntaxStep`/`MorphologyStep` + breadcrumb (8) + wizard.
- **Infra**: `buildPastoralSeedBlock` (prompt) refleja los 8 pasos.
- **Migración**: callable idempotente de backfill de seeds.
- **Reversibilidad**: media — rename es reversible; los 2 pasos nuevos son aditivos.

## Referencias

- Extiende: [ADR-002](./ADR-002-six-step-as-step1-spine.md), [ADR-015](./ADR-015-pastoral-seed-top-level-collection.md)
- Relacionado: [ADR-023](./ADR-023-two-tier-proactive-verification.md), [ADR-024](./ADR-024-genre-context-rag-ruta-c.md)
- Bridge: [06-pedagogy-applied.md](../06-pedagogy-applied.md) (extensión género + principio/idea-central)
- Phase doc: [phase-1-6-context-genre-principle.md](../phases/phase-1-6-context-genre-principle.md)
