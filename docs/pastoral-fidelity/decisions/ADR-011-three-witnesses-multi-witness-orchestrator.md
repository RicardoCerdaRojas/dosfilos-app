# ADR-011 — Orchestrator de tres testigos (multi-witness) + escalado formal por nivel de doctrina

## Estado

`accepted`

## Fecha

2026-05-27

## Contexto

[ADR-010](./ADR-010-confessional-witnesses-default-on.md) retiró el modelo de anchor confesional único (ADR-001) y lo reemplazó por **multi-witness default-on**: el Testigo 3 consume **todas las tradiciones del catálogo CORE** como testimonio histórico plural. En su sección "ADRs futuros derivados", ADR-010 nombró explícitamente este ADR-011 para cerrar el diseño del orchestrator de Fase 2.

El [phase doc de Fase 2](../phases/phase-2-three-witnesses.md) dejó abiertas seis decisiones (lista de claims con bloqueo absoluto, modelo LLM por testigo, thresholds de confianza, UX de Faculty en 3/3, caching, y "ADR de escalado formal sobre el sistema de tres niveles"). Este ADR las cierra.

La tabla de escalado original de [ADR-001](./ADR-001-confession-anchored-correction.md) y de [01-architecture § Componente 3](../01-architecture.md) escalaba **por conteo de testigos** (1/2/3 disienten). El bridge [06-pedagogy-applied § 4](../06-pedagogy-applied.md#4-sistema-de-tres-niveles-de-doctrina-operacionalización) y [ADR-007 § Q4](./ADR-007-phase-0-policy-resolutions.md) reformularon el modelo **por nivel de doctrina** (`core` / `distinctive` / `open-evangelical`). Este ADR los combina en una única función de escalado determinística.

### Discrepancias codebase detectadas al iniciar Fase 2 (drift)

- **D1 — cobertura T3 parcial**: solo los 4 credos ecuménicos tienen `sections` con contenido + `doctrineLevel`. Las 7 confesiones grandes son stubs (`ingestStatus: pending`). T3 lanza con cobertura parcial: `core` (credos) funciona full; `distinctive` es delgado hasta el content-fill. **Decisión del fundador 2026-05-27: lanzar parcial ahora** con copy honesto.
- **D2 — sin embeddings**: la arquitectura mencionaba "embedding search" para T3; el repo no tiene embeddings. El matching claim→sección es **por `doctrineLevel` + LLM**, no embeddings.
- **D3 — no existe "Faculty doctrinal mode"**: los `ResponseMode` son largo/estilo, no corrección. La invocación en bloqueo duro es un **launcher de Faculty pre-sembrado** con prompt doctrinal (fold-simple, decisión del fundador), no un modo nuevo.
- **D4 — escalado por nivel, no por conteo**: este ADR formaliza nivel×conteo y deja obsoleta la tabla por-conteo de ADR-001/arquitectura.
- **D5 — firma del orchestrator**: sin confesión única. `validateSeed(seed, { confessionalWitnessesEnabled })`.

## Decisión

### 1. Claims validados

El orchestrator extrae del `pastoralSeed.insight` los claims doctrinales del pastor:

- `centralIdea` (1) — clave `centralIdea`
- cada `observations[i]` — clave `observation:{i}`
- `doxologicalApplication` (1) — clave `doxologicalApplication`

`openQuestion` y `pastoralAnecdote` **no** se validan (pregunta abierta y anécdota no son afirmaciones doctrinales).

### 2. Tres testigos

| Testigo | id | Insumo | Pregunta interna |
|---|---|---|---|
| T1 contexto inmediato | `context` | claim + `pastoralSeed` (sintaxis/morfología/función) | ¿el claim ignora un elemento estructural mayor del texto? |
| T2 paralelos canónicos | `parallels` | claim + cross-refs (`bibleCrossReferences`) + `recognition.parallels` | ¿la Escritura trata el tema distinto en otros pasajes? |
| T3 testigo confesional plural | `confession` | claim + secciones `doctrineLevel` ∈ {core, distinctive} de **todas** las tradiciones | ¿el claim tensiona la lectura histórica de la iglesia? + clasifica `detectedLevel` |

- **Modelo LLM**: `gemini-2.5-flash` con `responseMimeType: 'application/json'`, precedente Fase 1.5 (`analyzeWordPastorally`). Una llamada por testigo. T3 **batchea** todas las tradiciones en un solo prompt (no 14 llamadas) — mitiga el costo que ADR-010 advirtió.
- **Threshold de confianza**: un verdict cuenta como disenso solo si `dissents === true` **y** `confidence ≥ 0.6`. Bajo ese umbral se degrada a no-disenso (evita falsos bloqueos por alucinación de baja confianza).
- **detectedLevel**: lo asigna T3. Si T3 no corre (toggle off para distinctive/open) o no matchea, `detectedLevel = null`.

### 3. Toggle `useConfessionalWitnesses` (ADR-010)

- `core` (credos ecuménicos): T3 evalúa **siempre**, independiente del toggle. Universal, no negociable.
- `distinctive` / `open-evangelical`: T3 evalúa **solo si** `confessionalWitnessesEnabled === true`. Con toggle off, T3 no aporta disenso en estos niveles (T1/T2 sí siguen corriendo).

### 4. Escalado formal (nivel × conteo) — reemplaza la tabla por-conteo

`dissentCount` = nº de testigos (0–3) con disenso de confianza ≥0.6 sobre ese claim.

```
escalateClaim(detectedLevel, dissentCount):
  si detectedLevel === 'core' Y dissentCount ≥ 1  → 'absolute-block'   // sin override
  si no:
    byCount = { 0:'pass', 1:'note', 2:'soft-block', 3:'hard-block' }[dissentCount]
    cap = detectedLevel === 'open-evangelical' ? 'note'
        : /* 'distinctive' | null */              'hard-block'
    → min(byCount, cap)        // severidad capada por nivel
```

| Escalado | Override | Acción del pastor |
|---|---|---|
| `pass` | — | ninguna |
| `note` | — | nota informativa, sin bloqueo |
| `soft-block` | sí | respuesta escrita ≥50 chars por claim |
| `hard-block` | sí | respuesta escrita ≥100 chars + Faculty doctrinal invocado |
| `absolute-block` | **no** | debe **revisar el claim** (volver a Insight); ninguna respuesta lo desbloquea |

`overallEscalation` del seed = la severidad máxima entre sus claims. `requiresFaculty = true` si algún claim es `hard-block` o `absolute-block`.

### 5. Override `distinctive` (cierra Q6 del kickoff)

Se mantiene [ADR-007 § Q4](./ADR-007-phase-0-policy-resolutions.md): `distinctive` en disenso permite override con **justificación escrita ≥100 chars** (hard-block) o ≥50 (soft-block). El override es **por-claim** (no global). El opt-out global (`useConfessionalWitnesses=false`) silencia distinctive/open por completo y es decisión aparte, audit-logged en `confessionChangeAudit/` (ADR-010). No hay doble barrera: si el toggle está on y un distinctive dispara, el override per-claim aplica.

### 6. Caching

`witnessResults/{cacheId}` (admin-written, read auth) replica el patrón `pastoralWordAnalyses/`. Key determinística:

```
buildWitnessCacheId = [sermonId, seedContentHash, confessionalWitnessesEnabled, witnessPromptVersion].join('__')
```

`seedContentHash` = hash de los claims validados (centralIdea + observations + doxologicalApplication). Editar un claim invalida el cache; bump de `WITNESS_PROMPT_VERSION` invalida todo. Cache miss = 3 llamadas Flash; hit = 1 read.

### 7. Persistencia de la revisión del pastor (audit P3)

Las respuestas del pastor a soft/hard blocks se persisten en el propio seed: campo opcional `pastoralSeed.witnessReview` (owner-writable, no afecta el evaluador de `completed`). Esto preserva el rastro de confrontación (Hechos 20:27) sin colección nueva ni callable extra.

### 8. UX del gate

El gate vive como **7º paso "Validación"** del `PastoralSeedWizard` (decisión del fundador), gateado por el sub-flag `three_witnesses` (requiere `pastoral_fidelity_flow`, patrón Fase 1.5). Con el sub-flag off, "Continuar al borrador" se comporta como hoy. La máquina de 6 pasos del seed queda intacta; el gate es una fase posterior dentro del orquestador, no un `PastoralSeedStepKey` nuevo.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Escalado por conteo crudo (ADR-001) | No distingue negar la Trinidad (absoluto) de tensionar paedobautismo (override). El nivel de doctrina es la variable correcta. |
| 14 llamadas LLM (una por tradición) en T3 | Costo lineal innecesario. Batch en un prompt con las secciones taggeadas resuelve igual. |
| Esperar content-fill de las 7 confesiones antes de lanzar T3 | Bloquea Fase 2 indefinidamente. `core` (lo que importa para bloqueo absoluto) ya funciona con los 4 credos. Parcial + honesto. |
| Faculty como modo nuevo del chat | No existe "modo doctrinal"; construirlo infla Fase 2. Launcher pre-sembrado da el valor con scope acotado. |
| Colección `witnessResolutions/` + callable | Sobre-ingeniería v1. El seed (owner-writable) ya es el lugar natural del rastro. |

## Consecuencias

### Positivas

- Escalado determinístico y testeable (función pura sin LLM).
- Costo LLM acotado: ≤3 llamadas Flash por seed, cacheadas.
- `core` protege límites cristianos clásicos sin partisanship denominacional.
- Lanza con cobertura parcial sin deuda invisible (copy honesto sobre tradiciones no cargadas).

### Negativas

- T3 `distinctive` delgado hasta content-fill de las 7 confesiones grandes (deuda explícita, no invisible).
- `detectedLevel` depende de la calidad del tagging `doctrineLevel` (hoy `pending-pastoral-review` en varias secciones).
- Falsos negativos posibles si la clasificación LLM marca `core` como `distinctive`. Mitigación: lista curada `CORE_DOCTRINE_CLAIMS` inyectada en el prompt T3 + threshold de confianza.

### Neutrales

- Nuevo sub-flag `three_witnesses`. Default off → blast radius 0 hasta toggle.
- Catálogo de confesiones, cross-ref engine, citation schema: sin cambios.

## Impacto

- **Domain**: `WitnessValidation.ts` (tipos + escalado puro + `collectSeedClaims` + `CORE_DOCTRINE_CLAIMS`); `PastoralSeed.witnessReview?` aditivo.
- **Functions**: `validateSeedWitnesses` callable + prompts + cache `witnessResults/`. `collectionGroup('sections')` con índice nuevo.
- **Web**: `useWitnessValidation` hook + `WitnessGate` (7º paso) + `three_witnesses` sub-flag gate + persistencia `witnessReview`.
- **Rules/indexes**: `witnessResults/` read-auth/write-false; índice collectionGroup `sections.doctrineLevel`.
- **Reversibilidad**: alta — sub-flag controla todo.

## Referencias

- Supersede (modelo de escalado): tabla por-conteo de [ADR-001](./ADR-001-confession-anchored-correction.md) + [01-architecture § Componente 3](../01-architecture.md)
- Deriva de: [ADR-010](./ADR-010-confessional-witnesses-default-on.md) § "ADRs futuros derivados"
- Formaliza: [06-pedagogy-applied § 4](../06-pedagogy-applied.md), [ADR-007 § Q4](./ADR-007-phase-0-policy-resolutions.md)
- Phase doc: [phase-2-three-witnesses.md](../phases/phase-2-three-witnesses.md)
