# Phase 2 — Tres testigos para validar la semilla pastoral

## Estado

`planning` — placeholder. Detalle se completa al cierre de Fase 1.

## Objetivo

Implementar el mecanismo de tres testigos (Testigo 1 contexto, Testigo 2 paralelos, Testigo 3 confesión) para validar el `pastoralSeed` antes de permitir avanzar al Step 3+ del wizard. Implementar escalado de disenso (1/3 nota, 2/3 bloqueo blando, 3/3 bloqueo duro + Faculty doctrinal).

## Prerequisitos

- Fase 0 completa (catálogo de confesiones, declaredConfession persistido)
- Fase 1 completa (pastoralSeed schema en producción)
- ADR-005 (cross-reference engine resuelto)
- ADR-008 (override policy resuelto)

## Decisiones tomadas

- [ADR-001](../decisions/ADR-001-confession-anchored-correction.md) — Confesión como Testigo 3 + escalado de disenso

## Decisiones pendientes (TBD al iniciar fase)

- Lista exacta de claims con "bloqueo absoluto" (credos ecuménicos)
- Modelo LLM a usar por testigo (costo vs calidad)
- Threshold de confianza por testigo
- UX del Faculty doctrinal invocado en 3/3
- Caching de resultados (mismo seed no se re-valida)

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
