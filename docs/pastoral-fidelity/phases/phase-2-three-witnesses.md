# Phase 2 — Tres testigos para validar la semilla pastoral

## Estado

`planning` — placeholder. Detalle se completa al cierre de Fase 1.

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

- [ADR-001](../decisions/ADR-001-confession-anchored-correction.md) — Confesión como Testigo 3 + escalado de disenso

## Decisiones pendientes (TBD al iniciar fase)

- Lista exacta de claims con "bloqueo absoluto" (credos ecuménicos)
- Modelo LLM a usar por testigo (costo vs calidad) — precedente: Fase 1.5 usa `gemini-2.5-flash` con JSON output para identify/analyze
- Threshold de confianza por testigo
- UX del Faculty doctrinal invocado en 3/3
- Caching de resultados (mismo seed no se re-valida) — precedente arquitectónico: cache transversal `pastoralWordAnalyses/` por key determinística (Fase 1.5)
- ADR de escalado formal sobre el sistema de tres niveles (core/distinctive/open) — `06-pedagogy-applied.md` §4 lo especifica; falta ADR que lo formalice como gate

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
- **2026-05-27** — Prereqs actualizados al cerrar Fase 1.5. Fase 0/1/1.5 completas + deployadas. `lookupCrossReferences` (Testigo 2), confession catalog + doctrineLevel (Testigo 3), `pastoralSeed` schema (input) y cache pattern (`pastoralWordAnalyses/`) disponibles. Testigo 1 ahora puede consumir el análisis pastoral estructurado de `morphology.wordStudies[]` (Fase 1.5) como evidencia de contexto. Pendiente: ADR de escalado formal sobre niveles core/distinctive/open antes de codear el orchestrator.
