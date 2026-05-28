# ADR-027 — Política de override + modo experto (self-service ganado + override super-admin, suaviza no silencia)

## Estado

`accepted` — aceptado 2026-05-27 al arrancar `/iniciar-fase 2.5`.

## Fecha

2026-05-27

## Contexto

El Momento 3 del acompañante (ADR-025) confronta la cobertura antes de generar el sermón. Dos
preguntas de política quedaron abiertas en el phase doc:

1. **Override** — qué exige el sistema cuando el pastor decide generar con cobertura insuficiente.
2. **Modo experto** — cómo aliviar la confrontación para pastores experimentados sin convertir el
   gate en teatro opt-out.

El doc proponía desbloqueo automático tras "N sermones con SDS≥80". Problema **chicken-egg**: al
lanzar nadie tiene historial, el auto-desbloqueo nunca dispara. El fundador prefiere que el usuario
lo active desde su configuración (autonomía, sin cuello de botella de super-admin), pero advirtiendo
que activarlo libremente derrota el propósito (P1 labor antes que output; **P3 confrontación
obligatoria** — Hechos 20:27).

## Decisión

### Override en el gate

Si el pastor decide generar con dimensiones en rojo:
- Aparece textarea pidiendo **justificación ≥100 caracteres** ("explica por qué consideras
  suficiente el estudio actual").
- Se registra `bypassedConfrontation: true` + `justification` en `AiAssistLog` + en el
  `studyDepthSnapshot` embebido en el sermón (consumible por Fase 4).
- El override **no se bloquea** — el sistema confronta, no impide (el motor "confronta sin bloquear"
  del phase doc). La transparencia, no la prohibición, es el mecanismo.

### Modo experto — self-service ganado + override super-admin

- **Vive en la configuración del usuario** (no requiere super-admin para el caso normal) → cero
  cuello de botella futuro.
- **Bloqueado hasta demostrar profundidad**: el toggle está visible pero deshabilitado hasta que el
  pastor acumula **N sermones con cobertura alta** (umbral configurable; resuelve el chicken-egg sin
  grant manual). Antes del umbral: copy "se desbloquea tras estudio profundo sostenido".
- **Override super-admin siempre disponible**: un admin puede forzar enable/disable del modo experto
  por usuario, independiente del umbral (escape hatch para casos legítimos: profesor, evaluación,
  soporte). Vive en el panel admin de feature flags / settings por-usuario.

### Modo experto SUAVIZA, no silencia (P3)

Activar modo experto **no apaga la confrontación**:
- El gate deja de ser modal forzado y queda **colapsado** (menos ceremonia).
- Pero si hay **dimensiones en rojo reales**, sigue confrontando + exigiendo la misma justificación
  ≥100 chars. Nadie —experto o no— genera sobre un gap sin reconocerlo.
- Esto honra **P3 (Hechos 20:27, "no rehuí anunciar todo el consejo")**: la confrontación es
  obligatoria; el modo experto solo reduce fricción cuando la cobertura ya es buena.

### Override manual por-dimensión

Independiente del modo experto: el pastor puede marcar manualmente una dimensión como "cubierta"
(`pastorMarkedComplete`) cuando el tracker no la detectó pero el trabajo se hizo fuera del sistema.
Se registra (audit) y se refleja en la cobertura. No es bypass del gate — es corrección de evidencia.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Auto-desbloqueo puro (doc original) | Chicken-egg: nadie tiene historial al lanzar. |
| Solo grant super-admin | Cuello de botella futuro (lo señaló el fundador). |
| Self-service libre desde día 1 | Derrota el propósito; cualquier pastor apurado lo prende → gate decorativo (viola P1/P3). |
| Modo experto silencia el gate del todo | Viola P3 (confrontación obligatoria). Un experto con gap real debe ser confrontado igual. |
| Override sin justificación | Sin fricción → el bypass se vuelve default; no alimenta el audit de Fase 4. |

## Consecuencias

### Positivas
- Autonomía del usuario sin cuello de botella; escape hatch admin para casos legítimos.
- Preserva la formación: el umbral protege P1; el "suaviza no silencia" protege P3.
- Override audit-logged alimenta métricas (override rate target <30%) + Fase 4.

### Negativas
- Definir el umbral (N sermones + qué cuenta como "cobertura alta") es opinionado; ajustable post-launch con telemetría.
- Override por-dim manual es vector de auto-engaño (marcar cubierto sin trabajo). Mitigado: auditado + Fase 4 contra-scan refuerza.

### Neutrales
- El score numérico que alimenta el umbral es interno (no pastor-facing), consistente con la regla anti-gamificación de ADR-025.

## Impacto

- **Código afectado**: `packages/web` `StudyDepthPreGenerationGate` + config usuario (modo experto toggle); `packages/domain` `studyDepthSnapshot` en `Sermon` + `pastorMarkedComplete` en `DimensionScore`; `packages/web/src/pages/admin` (override super-admin del modo experto); `AiAssistLog` writes. La mayor parte aterriza en **PR C**; el override por-dim manual aterriza en **PR A** (badge).
- **Fases impactadas**: Fase 4 consume `studyDepthSnapshot` + override logs.
- **Migraciones requeridas**: ninguna.
- **Reversibilidad**: alta — detrás del sub-flag `study_depth`.

## Referencias

- Modelo: [ADR-025](./ADR-025-study-companion-unified-model.md)
- Honra: P1 + P3 del manifesto [05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md); §"Reconocimiento honesto del tiempo" de [06-pedagogy-applied.md](../06-pedagogy-applied.md)
- Phase doc (gate + métricas + riesgos): [phase-2-5-study-depth-copilot.md](../phases/phase-2-5-study-depth-copilot.md)
