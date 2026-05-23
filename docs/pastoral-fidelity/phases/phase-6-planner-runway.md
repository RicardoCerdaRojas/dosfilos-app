# Phase 6 — Planner como runway de formación

## Estado

`planning` — placeholder. Detalle se completa al cierre de Fase 5.

## Objetivo

Refactor del series planner: eliminar pre-generación automática de contenido. Reemplazar por calendario inverso de formación que recuerda al pastor cuándo empezar cada paso del estudio según la fecha de predicación asignada.

Planner se vuelve **disciplina espiritual asistida**, no fábrica programada.

## Prerequisitos

- Fase 5 completa (`Project` como raíz; series son colección de proyectos)
- Notificaciones operativas (email + push si disponible)

## Decisiones tomadas

Ninguna ADR específica. Basado en [01-architecture.md § Componente 9](../01-architecture.md#componente-9-planner-como-runway).

## Decisiones pendientes (TBD al iniciar fase)

- Días por hito (¿D-14 / D-10 / D-7 / D-3 / D-1 son correctos? Pastor-configurable?)
- Notificaciones: email obligatorio, push opcional? In-app banner?
- Snooze/skip de hitos individuales — ¿permitido o gate?
- Visualización: timeline calendar vs Gantt vs list

## Arquitectura propuesta (alto nivel)

```typescript
interface FormationRunway {
  projectId: string;
  preachDate: Date;
  milestones: RunwayMilestone[];
}

interface RunwayMilestone {
  daysBeforePreach: number;
  task: 'reading' | 'syntax-morphology' | 'central-idea' | 'draft' | 'final-review';
  notificationsSent: NotificationLog[];
  completed: boolean;
  completedAt?: timestamp;
}
```

Default runway:

| D- | Hito | Pasos del seed cubiertos |
|---|---|---|
| 14 | Lectura + primera impresión | Paso 1 |
| 10 | Análisis griego/hebreo + paralelos | Pasos 2, 3, 4 |
| 7 | Idea central + tres testigos | Pasos 5, 6 + validación |
| 3 | Borrador + fidelity pass | Generación + Fase 3 |
| 1 | Oración final + revisión personal | Pre-publish + contra-scan |

## Reuso identificado

- Series planner existente (`feature_sermon_series_pericope_pipeline`)
- Notification infrastructure (a verificar)
- Calendar UI components

## Detalle TBD

- Notification copy
- UX de visualización
- Snooze logic
- Integration con series planner

## Bitácora

- **2026-05-22** — Placeholder creado.
