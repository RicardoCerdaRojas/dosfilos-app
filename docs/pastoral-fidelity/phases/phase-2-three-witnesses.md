# Phase 2 — Tres testigos para validar la semilla pastoral

## Estado

`in-progress` — implementación funcional en curso (2026-05-27). Engine + 3 testigos + escalado + gate UI + cache shippeados detrás del sub-flag `three_witnesses`. Ver bitácora + ADR-011.

## Objetivo

Implementar el mecanismo de tres testigos (Testigo 1 contexto, Testigo 2 paralelos, Testigo 3 confesión) para validar el `pastoralSeed` antes de permitir avanzar al Step 3+ del wizard. Implementar escalado de disenso (1/3 nota, 2/3 bloqueo blando, 3/3 bloqueo duro + Faculty doctrinal).

## Prerequisitos

- [x] Fase 0 completa (catálogo de confesiones + `declaredConfession`/`useConfessionalWitnesses` persistido) — PRs #252-#256
- [x] Fase 1 completa (`pastoralSeed` schema en producción) — PR #257 (ADR-015, `pastoralSeeds/{seedId}` top-level)
- [x] Fase 1.5 completa (Pastoral Word Study) — PR #258 + #259 + #260. **Relevante para Testigo 1**: el `morphology.wordStudies[]` ahora se llena vía análisis pastoral estructurado (gloss + función gramatical en verso + resonancias), no solo texto libre del tutor. Testigo 1 (contexto inmediato) puede consumir ese análisis como evidencia.
- [x] ADR-008 (cross-reference engine TSK-based) operativo — `lookupCrossReferences` callable live, reusado por Fase 1.5 (ADR-019). Testigo 2 consume el mismo engine.
- [x] ADR-010 (confessional witnesses default-on) — `useConfessionalWitnesses` en profile, default true. Testigo 3 lo lee.
- [ ] Override policy formal para escalado (el ADR-008 original referido aquí era placeholder; la política de tres niveles core/distinctive/open vive en `06-pedagogy-applied.md` §4 + ADR-007). Cerrar ADR específico de escalado al iniciar Fase 2.

### Dependencias satisfechas que Fase 2 consume directamente

- **`PastoralSeed` schema** (`pastoralSeeds/{seedId}`) — input del `WitnessOrchestrator`.
- **`lookupCrossReferences`** callable — Testigo 2 (paralelos). Mismo patrón que `useCrossReferences` (RecognitionStep) y `analyzeWordPastorally`.
- **Confession catalog + `doctrineLevel` tagging** — Testigo 3. Tagging vía `tagConfessionDoctrineLevels` (Fase 0).
- **Cache transversal pattern** — `pastoralWordAnalyses/` (Fase 1.5) es el modelo a replicar para cachear `WitnessResult` por seed (decisión pendiente "caching de resultados" ya tiene precedente arquitectónico).
- **`useUserProfile` realtime** (#259) — cualquier gate de Fase 2 que dependa de flags/confesión refleja cambios sin reload.

### Dependencias NO satisfechas / deuda intencional heredada

- **LSJ/BDB lexicon datasets** — stubs en Fase 1.5 (`LsjLexiconAdapter`/`BdbLexiconAdapter` retornan null). No bloquea Fase 2 (Testigo 1 no depende del lexicon de cola larga). Wire-up post-launch.
- **Smoke manual hebreo + save + cache-hit de Fase 1.5** — opcional, no ejecutado. Si Fase 2 toca el mismo flujo, validar de paso.

## Decisiones tomadas

- [ADR-011](../decisions/ADR-011-three-witnesses-multi-witness-orchestrator.md) — **orchestrator multi-witness + escalado formal nivel×conteo** (cierra todas las pendientes de abajo). Supersede la tabla por-conteo de ADR-001.
- [ADR-010](../decisions/ADR-010-confessional-witnesses-default-on.md) — Testigo 3 = testimonio plural default-on (superó el anchor único de ADR-001).
- [ADR-001](../decisions/ADR-001-confession-anchored-correction.md) — origen del mecanismo de tres testigos (modelo de escalado superado por ADR-011).

## Decisiones cerradas en ADR-011 (antes pendientes)

- ✅ Claims con bloqueo absoluto → `CORE_DOCTRINE_CLAIMS` (lista curada ecuménica, inyectada en prompt T3).
- ✅ Modelo LLM → `gemini-2.5-flash` JSON, 1 llamada por testigo (T3 batchea tradiciones).
- ✅ Threshold de confianza → disenso cuenta solo si `confidence ≥ 0.6`.
- ✅ UX Faculty en hard-block → launcher pre-sembrado (fold-simple), `facultyConsulted` audit.
- ✅ Caching → `witnessResults/{cacheId}` admin-written (patrón `pastoralWordAnalyses/`).
- ✅ Escalado formal → función pura `escalateClaim(level, dissentCount)`.
- ✅ Override `distinctive` → ≥100 chars (hard) / ≥50 (soft), per-claim (mantiene ADR-007 Q4).

## Arquitectura propuesta (alto nivel)

```typescript
interface WitnessOrchestrator {
  validateSeed(seed: PastoralSeed, confession: Confession): Promise<WitnessResult>;
}

interface WitnessResult {
  testigo1_context: WitnessVerdict;
  testigo2_parallels: WitnessVerdict;
  testigo3_confession: WitnessVerdict;
  dissentCount: 0 | 1 | 2 | 3;
  escalation: 'pass' | 'note' | 'soft-block' | 'hard-block' | 'absolute-block';
  facultyRequired: boolean;
}

interface WitnessVerdict {
  dissents: boolean;
  reasoning: string;
  evidence: string[];
  confidence: number;
}
```

## Reuso identificado

- Canonical analyzer → Testigo 1
- Cross-reference engine (Fase 0 Q1) → Testigo 2
- Confession catalog → Testigo 3
- Faculty modes → invocación en 3/3

## Detalle TBD

Cuando esta fase active, completar:
- Schema persistido
- Prompts de cada testigo
- UI de escalado en wizard
- Tests E2E

## Bitácora

- **2026-05-22** — Placeholder creado.
- **2026-05-27 (kickoff + implementación funcional)** — `/iniciar-fase 2`. Decisiones del fundador: (1) T3 lanza con **cobertura parcial** ahora; (2) gate como **7º paso "Validación"** del wizard; (3) claims validados = `centralIdea` + `observations` + `doxologicalApplication`; (4) Faculty **fold-simple**; (5) **single PR/merge**; (6) override per-claim por recomendación.
  - **ADR-011 emitido** (orchestrator multi-witness + escalado formal). Supersede tabla por-conteo de ADR-001.
  - **Discrepancias codebase detectadas (drift)**: **D1** solo 4 credos tienen sections con `doctrineLevel` → T3 distinctive delgado hasta content-fill (deuda explícita); **D2** sin embeddings → matching por `doctrineLevel` + LLM; **D3** no existe "Faculty doctrinal mode" → launcher pre-sembrado; **D4** escalado por nivel, no por conteo → ADR-011 lo formaliza; **D5** firma sin confesión única → `{ confessionalWitnessesEnabled }`.
  - **Entregables (funcional, type-check + tests verdes)**:
    - **Domain**: `WitnessValidation.ts` — tipos (`WitnessVerdict`/`WitnessedClaim`/`WitnessResult`/`WitnessReview`), escalado puro (`escalateClaim`, `escalateWitnessedClaim`, `aggregateWitnessResult`, `canProceedFromWitnesses`), `collectSeedClaims`, `CORE_DOCTRINE_CLAIMS`, `WITNESS_THRESHOLDS`. `PastoralSeed.witnessReview?` aditivo. 11 tests nuevos (280 domain total).
    - **Functions**: `validateSeedWitnesses` callable (thin — 3 llamadas Flash, devuelve verdicts crudos) + `prompts.ts` (T1/T2/T3, T3 batchea tradiciones vía `collectionGroup('sections')`) + cache `witnessResults/`. Escalado corre client-side (decoupling functions↔domain, patrón Fase 1.5).
    - **Web**: `useWitnessValidation` (mapea verdicts crudos → `WitnessResult` vía domain) + `WitnessGate` (7º paso, verdicts por claim + escalado + respuestas + Faculty launcher + absolute-block revise) + sub-flag `useThreeWitnessesGate` + intercept en `PastoralSeedWizard.handleAdvance` (flag-on → fase witnesses; flag-off → Phase 1 directo) + `saveWitnessReview` persiste en seed. 3 gate tests.
    - **Infra**: `firestore.rules` `witnessResults/` (read-auth/write-false) + `firestore.indexes.json` fieldOverride collectionGroup `sections.doctrineLevel`.
    - **Flag**: `three_witnesses` agregado a `FEATURE_FLAG_NAMES` (default off, requiere `pastoral_fidelity_flow`).
  - **Pendiente para cierre**: deploy callable + rules + index; toggle `three_witnesses` en cuenta de prueba; smoke end-to-end (claim core → absolute-block; distinctive 2/3 → soft-block; pass). Faculty launcher es link simple a `/dashboard/faculty` (no pre-seed de prompt v1).
- **2026-05-27** — Prereqs actualizados al cerrar Fase 1.5. Fase 0/1/1.5 completas + deployadas. `lookupCrossReferences` (Testigo 2), confession catalog + doctrineLevel (Testigo 3), `pastoralSeed` schema (input) y cache pattern (`pastoralWordAnalyses/`) disponibles. Testigo 1 ahora puede consumir el análisis pastoral estructurado de `morphology.wordStudies[]` (Fase 1.5) como evidencia de contexto. Pendiente: ADR de escalado formal sobre niveles core/distinctive/open antes de codear el orchestrator.
