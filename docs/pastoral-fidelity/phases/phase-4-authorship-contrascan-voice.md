# Phase 4 — Indicador de autoría + contra-scan + voice fingerprint

## Estado

`in-progress` — **las tres sub-features tienen ya su respuesta** (2026-08-27):

- **1 (autoría)** — re-scopeada por [ADR-037](../decisions/ADR-037-socratic-drafting-idea-provenance.md): deja de medirse por palabras y pasa a medirse por PROCEDENCIA DE IDEAS sobre un flujo socrático por elementos. En producción, incluido el estado `sin-medir` para sermones anteriores a la medición (PR #488).
- **2 (contra-scan)** — EN PRODUCCIÓN desde 2026-06-04, [ADR-033](../decisions/ADR-033-contra-scan-independent-confrontation-step.md).
- **3 (voice fingerprint)** — **ETAPA 1 EN PRODUCCIÓN** (PR #496, [ADR-038](../decisions/ADR-038-preacher-voice-learns-only-from-workshop-prose.md)), flag `voice_fingerprint` default off. La etapa 2 (perfil destilado) es CONDICIONAL: sólo se construye si la etapa 1 no resulta estable, y eso se decide leyendo un borrador en voz alta, no con una métrica.

Cierra las tres preguntas que este doc dejaba abiertas: técnica (few-shot, luego perfil si hace falta), corpus mínimo (dos sermones del taller, de pasajes distintos) y privacidad (nada sale de su cuenta, nada entrena a ningún modelo).

## Objetivo

Tres sub-features que cierran el modelo de autoría pastoral:

1. ~~**Autoría verbatim tracker**: diff entre draft AI y final del pastor por sección; badge visible; gate publish ≥50% verbatim.~~ **SUPERADO por ADR-037.** Medir palabras mide DESARROLLO, no origen — y P2 dice que la IA desarrolla. Un sermón construido sobre el estudio de ocho pasos marcaba 18% incluso rastreando el material del pastor, y el piso de 50% resultó inalcanzable. Ahora: redacción socrática por elementos + autoría por procedencia de ideas.
2. **Contra-scan obligatorio**: surface chunks de la biblioteca que disienten del claim central; pastor marca uno como "considerado" con nota ≥100 chars. Implementa Hch 20:27.
3. **Voice fingerprint** (tardía): adapter de estilo desde sermones previos del pastor para que output suene a ÉL. Resuelve homogeneización + autenticidad. **Etapa 1 en producción — ADR-038.** Aprende SÓLO de sermones armados en el taller (discriminador: `authorshipSnapshot`, porque `assembledFrom` no sobrevive a la publicación); aprender de uno generado enseñaría NUESTRA voz de vuelta.

## Prerequisitos

- [x] **Fase 3 completa** (fidelity pass establece quality floor) — cerrada 2026-06-03, 5 PRs en main (#287/#289/#290/#298/#300), ADR-029. Ver [phase-3 doc](./phase-3-claim-source-fidelity.md).
- Corpus de sermones previos del pastor (para voice fingerprint) — opcional, pastor sin corpus usa default

### Dependencias satisfechas que Fase 4 consume (snapshot al cierre Fase 3, 2026-06-03)

| Dependencia | De dónde viene | Cómo la usa Fase 4 |
|---|---|---|
| `FidelityReport` schema con sub-reports opt-in (verdicts + plurality + authority + attribution) | Fase 3 PR 1-5 (`packages/domain/src/entities/FidelityReport.ts`) | Base para extender con `authorshipReport?` / `contraScanReport?` (mismo patrón composable, no monolítico) |
| Publish gate puro `evaluatePublishGate` + `GateOverride` audit pattern | Fase 3 PR 2 (#289) | **Extender** el mismo gate con el floor de verbatim ≥50% (sub-feature 1) y el contra-scan obligatorio (sub-feature 2). NO crear gate paralelo. |
| `PrePublishFidelityModal` + `FidelityReviewPanel` (UI de confrontación pre-publish) | Fase 3 PR 1-4 | Surface canónico donde inyectar badge de autoría + panel de contra-scan |
| Fidelity pass per-marker (Flash batched + Sonnet escalation, cache key estructural) | Fase 3 PR 1 (ADR-029 Q1/Q6) | Patrón LLM batcheado reusable para contra-scan (`findDissentingChunks`) |
| `ILlmClient` port + mirror local `LlmClient.ts` en functions | Fase 2.5 PR A + usado en Fase 3 | **Usar este port** para el LLM de contra-scan; NO `GoogleGenerativeAI` directo |
| Library + recommendations (cross-ref engine Fase 0, `useCrossReferences`) | Fase 0 + reusado Fase 3 PR 3 | Base de `findDissentingChunks` (contra-scan surface chunks que disienten) |
| Modo experto self-service (Fase 2.5 ADR-027) + sub-flag pattern | Fase 2.5 + Fase 3 Q5/Q10 | Skip del gate de autoría reusa el mismo modo experto; sub-flag nuevo bajo `pastoral_fidelity_flow` |

### Dependencias NO satisfechas (deuda heredada / intencional)

- **Smoke manual Fase 3 pendiente** — el flag `fidelity_pass` sigue default off; el smoke end-to-end (export SBLGNT → "Atribuciones", gate hard/soft en vivo) se ejecuta al flip con 1-2 usuarios reales. Fase 4 NO depende, pero el flip debería preceder al rollout de Fase 4 para no apilar dos confrontaciones sin validar la primera.
- **SBLGNT hardcoded** (`tech_debt_sblgnt_hardcoded`, Q8) — no afecta Fase 4 salvo que toque atribución; mover a catálogo CORE en próxima ingesta Fase 0.
- **LLM provider abstraction** (`tech_debt_llm_provider_abstraction`) — Fase 4 debe seguir usando `ILlmClient` para todo callable LLM nuevo (contra-scan, voice fingerprint).
- **`detail.tsx` god component** (607 líneas, soft-warning compliance) — Fase 4 inyecta badge de autoría + panel contra-scan ahí. Considerar decomposición como Boy-Scout de Fase 4 (extraer sub-componentes/hooks) antes de agregar más superficie.
- **Voice fingerprint: corpus + privacidad** — sin decisión de técnica (fine-tune vs few-shot vs RAG) ni de mínimo de corpus; sermones del pastor NO entran a entrenamiento general (decisión de privacidad pendiente de ADR).

## Decisiones tomadas

Ninguna ADR específica aún. Basadas en [01-architecture.md §§ 6, 7, 8](../01-architecture.md).

## Decisiones pendientes (TBD al iniciar fase)

- Algoritmo de diff (word-level vs sentence-level vs semantic)
- Default verbatim threshold (¿50%? configurable por confesión?)
- Cuántos chunks contra-posición surface (¿exactamente 3, o "hasta 5"?)
- Mínimo de chunks contra-scan disponibles para activar el gate (qué pasa si la biblioteca es pequeña)
- Voice fingerprint: técnica (fine-tune vs few-shot vs RAG con sermones previos)
- Voice fingerprint: corpus mínimo (¿5 sermones? ¿10?)
- Voice fingerprint: privacidad — sermones del pastor no entran a entrenamiento general

### Preguntas nuevas que surgieron en Fase 3 (decidir al iniciar Fase 4)

1. **¿El verbatim tracker (sub-feature 1) y el fidelity pass comparten gate o son secuenciales?** Fase 3 ya
   tiene gate pre-publish (`evaluatePublishGate`). El floor de autoría ≥50% verbatim debería **extender** ese
   gate (un solo `evaluatePublishGate` con más inputs), no agregar un tercer modal. Decidir el orden de
   confrontación: fidelity → plurality → authority → verbatim → contra-scan, todo en `PrePublishFidelityModal`.
2. **¿El contra-scan (sub-feature 2) reusa el `FidelityEvaluator` batcheado o es callable nuevo?** El patrón
   per-marker de Fase 3 (Flash batched + cache estructural) aplica a `findDissentingChunks`. Evaluar si cabe en
   el mismo callable `evaluateClaimSourceFidelity` (como plurality en Q4) o callable separado por costo/latencia.
3. **¿El `studyDepthSnapshot` (Fase 2.5) modula el threshold de verbatim?** Pastor con cobertura `profundo` que
   parafrasea mucho NO debería penalizarse igual que uno que copió el draft sin estudiar. Considerar el snapshot
   como input al cálculo de autoría (no como gate, como contexto), igual que se propuso para el fidelity pass.
4. **¿Voice fingerprint colisiona con el `PRIMARY VOICE` prompt block (Fase 1)?** El sermón ya tiene un bloque de
   voz primaria del pastor en el prompt. Voice fingerprint (sub-feature 3) lo refina con corpus real — decidir si
   reemplaza o compone con el bloque existente para no duplicar instrucción de estilo contradictoria.

## Arquitectura propuesta (alto nivel)

### Sub-feature 1: Autoría verbatim tracker

```typescript
interface AuthorshipTracker {
  computeVerbatim(originalDraft: string, finalText: string): VerbatimReport;
}

interface VerbatimReport {
  bySection: SectionVerbatim[];
  overall: number;          // 0-1
  gateStatus: 'pass' | 'block';
}
```

### Sub-feature 2: Contra-scan

```typescript
interface ContraScan {
  findDissentingChunks(centralIdea: string, library: LibraryRef): Promise<DissentingChunk[]>;
  recordConsideration(chunkId: string, note: string): void;
}
```

### Sub-feature 3: Voice fingerprint

TBD — técnica abierta. Posibles:
- Fine-tune adapter (costoso, calidad alta, privacidad complicada)
- Few-shot prompting con 3-5 sermones previos (barato, calidad media, fácil)
- RAG: chunks de estilo del pastor + instrucción "imita esta voz" (barato, calidad media-alta)

Recomendación tentativa: empezar con few-shot, evaluar.

## Reuso identificado

- Library + recommendations (PR #93) → contra-scan base
- Editor del sermón → surface de autoría
- Sermones existentes del pastor → corpus de voice fingerprint
- Wizard publish gate (extender)

## Detalle TBD

- Diff algorithm choice
- Voice fingerprint technique decision
- UX del badge de autoría
- UX del contra-scan panel

## Bitácora

- **2026-06-04 (PR 1 contra-scan CERRADO + MERGED + DEPLOYED + SMOKE OK)** — Sub-feature 2 (contra-scan)
  entregada y validada en vivo. **3 PRs en main** (deploy prod verde): **#315** (core: domain `ContraScanReport` +
  `evaluateContraScanGate` puro + 12 tests, callable `findDissentingChunks`, persistencia repo/service, modal +
  hook + flag en sermón detail, i18n, admin label), **#316** (gap del wizard: contra-scan como 1er gate en
  `StepDraft` + `enforceContraScanGate` en `publishSermonAsCopy` — el wizard es el surface real de publicación),
  **#317** (claridad del modal por smoke: muestra la idea central + etiqueta "tu biblioteca" vs "en qué tensiona"
  + cita textual apartada + hint de los dos caminos). **Smoke en prod confirmado por el fundador**: publicó "Anclados
  en la Verdad" (2 Pedro 1:16-21) → contra-scan surface 2 fragmentos reales de Kistemaker (Comentario 1-2 Pedro y
  Judas, p.224) que tensionan βεβαιότερον ("hecha más segura" vs "más confiable") + dirección de confirmación
  AT↔apostólico. Funciona end-to-end: retrieve real + clasificación de disenso real + nunca inventa. Tests al cierre:
  domain 430 + app 77 + infra 55 + web 96 verde, tsc limpio. Flag `contra_scan` default off, on en cuenta del fundador.
  **Fase 4 sigue `in-progress`**: sub-feature 1 (autoría verbatim ≥50%) y 3 (voice fingerprint) NO empezadas
  (`planning`). Gotcha del smoke: contra-scan no estaba en el wizard inicialmente (#315 solo detalle) — el fundador
  publica desde el wizard, no el detalle; #316 lo cerró. Aprendizaje: el surface canónico de publish del wizard es
  `publishSermonAsCopy`, no `publishSermon` — gatear AMBOS.
- **2026-06-04 (PR 1 contra-scan — ADR-033, decoupled del gate dormido)** — Arranque de Fase 4 por la
  sub-feature 2 (contra-scan, P3 Hch 20:27). **Tensión resuelta vía ADR-033**: el prereq del 2026-06-03
  mandaba "extender `evaluatePublishGate`, no duplicar" — pero ADR-030/031/032 (emitidos esta sesión, post-cierre
  Fase 3) dejaron el fidelity pass **dormido en el sermón** (se reubica al paper, Fase 7). Extenderlo despertaría
  maquinaria recién apagada. Decisión: contra-scan es **paso de confrontación independiente** con reporte/gate/modal/hook
  propios (`ContraScanReport`, `evaluateContraScanGate`, `ContraScanModal`, `useContraScanGate`), reusando el **patrón**
  (gate puro + override audit `GateOverride`) y la **infra de recuperación de ADR-031** (`retrieveChunks` core extraído,
  prioridad personal→CORE), NO la instancia de fidelidad. Sub-flag propio `contra_scan` (bajo `pastoral_fidelity_flow`),
  default off. **3 decisiones de producto del fundador (2026-06-04)**: (1) step propio pre-publish vivo siempre, no
  atado a `fidelity_pass`; (2) soft con nota obligatoria ≥100 chars + override audit-logged (no hard-block); (3)
  biblioteca sin disenso → pasa + invita a sumar fuentes (NO cae a CORE para no traer disenso ajeno al marco). Cierra
  las preguntas Q1 (gate compartido vs secuencial → independiente) y Q2 (reusa evaluator batcheado → callable propio
  `findDissentingChunks` con `ILlmClient`). Q3 (studyDepthSnapshot modula threshold) y verbatim/voice quedan para PRs
  siguientes. La fila "extender `evaluatePublishGate`" de la tabla de dependencias queda matizada: se extiende el
  **patrón**, no la instancia.
- **2026-06-03 (prereqs actualizados al cerrar Fase 3)** — Fase 3 cerrada (5 PRs #287/#289/#290/#298/#300,
  ADR-029). Prereq duro "Fase 3 completa" satisfecho. Dependencias satisfechas que Fase 4 consume: `FidelityReport`
  schema composable (extender con `authorshipReport?`/`contraScanReport?`), publish gate puro `evaluatePublishGate`
  + `GateOverride` audit (extender, no duplicar), `PrePublishFidelityModal`/`FidelityReviewPanel` (surface de
  confrontación), patrón LLM batcheado + cache estructural, `ILlmClient` port, cross-ref engine para contra-scan,
  modo experto + sub-flag pattern. Deuda heredada: smoke Fase 3 pendiente al flip de `fidelity_pass`, SBLGNT
  hardcoded, LLM provider abstraction, `detail.tsx` god component (607 líneas — candidato Boy-Scout antes de
  inyectar autoría+contra-scan), voice fingerprint sin decisión de técnica/corpus/privacidad. 4 preguntas nuevas
  documentadas arriba. Ver [sessions/2026-06-03-phase-3-closeout.md](../sessions/2026-06-03-phase-3-closeout.md).
- **2026-05-22** — Placeholder creado.
