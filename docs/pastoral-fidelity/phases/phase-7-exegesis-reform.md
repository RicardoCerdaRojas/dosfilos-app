# Phase 7 — Exégesis reform

## Estado

`planning` — placeholder. Esta fase activa solo después de Fases 0-6 completas y estabilizadas en producción (~6 meses post-launch del flow nuevo de sermón).

## Objetivo

Aplicar el marco completo de pastoral fidelity (Esdras + Brooks + tres testigos + fidelity pass) al módulo de exégesis (paper académico). Esto cierra la última puerta de generación AI-mayoritaria del sistema.

Diferencia con el sermón: el paper exegético tiene audiencia académica con tolerancia distinta a asistencia AI. La reforma respeta eso pero mantiene los gates fundamentales.

## Prerequisitos

- Fases 0-6 completas y estables en producción (mínimo 2-3 meses de operación)
- Aprendizajes de la implementación de Fases 1-4 aplicados (qué funcionó, qué no, qué ajustar)
- Buy-in pastoral confirmado (telemetría positiva de formación pastoral medible)

## Decisiones tomadas

- [ADR-004](../decisions/ADR-004-defer-exegesis-reform-decouple-sermon-from-paper.md) — diferir esta fase con desacople sermón↔paper

## Decisiones pendientes (TBD al iniciar fase)

- ¿Six-step spine también para paper, o paper tiene su propio spine académico distinto?
- Tres testigos aplican igual, o paper requiere testigo adicional (ej. peer-review simulado)?
- Fidelity pass más estricto en paper (audiencia académica menos perdona)?
- Voice fingerprint aplicable a paper? (más controversial — el paper se evalúa por estándares académicos, no por personalidad)
- Migración de papers existentes con flow AI-generated

## Arquitectura propuesta (alto nivel)

Reuso de todo el stack construido para sermón. Diferencias:

- `Paper` schema ya existe; extender con `pastoralSeed` (o equivalente académico)
- `paper.derivedContext: { kind: 'project', projectId }` (alineado con ADR-003)
- Step 1 del paper editor: six-step (o equivalente más académico — TBD)
- Tres testigos con énfasis adicional en consenso académico (BDAG, Wallace, comentarios canonizados)
- Fidelity pass más granular (por afirmación, no por marcador)

## Reuso identificado

Esencialmente todo el stack de Fases 0-6 se reusa. Lo nuevo es:

- Adaptación de los gates al contexto académico
- Posiblemente un Testigo 4 (consenso académico) para papers
- Pricing model puede diferir (paper típicamente premium)

## Detalle TBD

Completa al activar.

## Bitácora

- **2026-05-22** — Placeholder creado. Fase explícitamente diferida.
