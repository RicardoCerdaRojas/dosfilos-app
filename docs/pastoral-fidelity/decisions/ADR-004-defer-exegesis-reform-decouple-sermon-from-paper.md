# ADR-004 — Diferir reforma del módulo de exégesis a Fase 7; desacoplar sermón de paper como prerequisito

## Estado

`accepted`

## Fecha

2026-05-22

## Contexto

El módulo de exégesis (paper académico) sufre del mismo problema fundamental que el módulo de sermones: contenido generado mayoritariamente por LLM con aporte pastoral marginal. Lógicamente debería pasar por la misma reforma (Esdras + Brooks + tres testigos).

Sin embargo, hay diferencias importantes:

1. **Audiencia distinta**: exégesis es producto académico (seminarista, estudiante de teología). La tolerancia a asistencia AI es legítimamente más alta que en predicación pastoral.
2. **Madurez del módulo**: exégesis tuvo inversión reciente significativa (Phase 2A PR #144, Phase 2B PR #148, structuralExpectations top-level). Refactor mid-flight es costoso.
3. **Acoplamiento actual con sermón**: en la arquitectura convergente (PR #211, PR #213), el paper exegético es input al sermón. Si paper sigue siendo AI-generado y alimenta sermón, **contamina downstream** incluso con todas las puertas de fidelidad del sermón.

Decisión a tomar:

- Opción A: reformar exégesis primero, sermón segundo
- Opción B: reformar ambos en paralelo
- Opción C: reformar sermón primero, diferir exégesis, **pero desacoplar**

## Decisión

**Opción C**. Reformar el módulo de sermones primero (Fases 0-6). Diferir reforma de exégesis a Fase 7. Para evitar contaminación cross-module:

**Desacoplar el sermón del paper como prerequisito**. En la arquitectura reformada, cada `Project` corre su propio Step 1 (six-step spine) independiente. Si el proyecto incluye un paper exegético existente, ese paper es **recurso consultable** dentro del proyecto, NO un precursor obligatorio.

Concretamente:

- Sermón ya no requiere `paperContext` como input mandatorio.
- `derivedContext` para sermón pasa a ser `{ kind: 'project', projectId, sectionId? }`, no `{ kind: 'paper', paperId }`.
- Paper existente en el proyecto se ofrece como recurso opcional al pastor en el Step 1 (similar a otros recursos de biblioteca).
- Pastor que NO escribió paper hace su sermón con su own six-step + tres testigos. Pastor que SÍ escribió paper lo usa como recurso adicional.

Cuando Fase 7 llegue (estimado +6 meses post-launch), aplicar mismo marco al paper:

- Step 1 del paper también con six-step
- Tres testigos para validar tesis del paper
- Fidelity pass para citas del paper
- Esto eleva la calidad del paper sin bloquear el avance del sermón

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Opción A — exégesis primero** | Bloquea avance del sermón (que es prioridad superior dada la visión de fidelity). Exégesis tuvo inversión reciente; refactor inmediato es desperdicio. |
| **Opción B — ambos en paralelo** | Splits attention. La iniciativa de fidelity necesita foco. Dos módulos en reforma simultánea = dos refactors a medio terminar. |
| **Opción C-variante: desacoplar pero NO diferir paper** | Misma carga de trabajo que opción B, sin la ganancia de focus. |
| **No desacoplar; aceptar contaminación temporal** | Inaceptable. Si Fase 3 fidelity pass corre sobre borrador que vino de paper AI-generado, los veredictos están sesgados por arrastre. |
| **Cancelar exégesis (módulo completo)** | Pérdida de mercado académico. No alineado con `feature_exegesis_module` ya shipped. |

## Consecuencias

### Positivas

- **Foco**: la iniciativa de fidelity tiene un solo módulo en reforma a la vez. Más probable terminarlo bien.
- **Sin contaminación cross-module**: sermón corre su propia pipeline limpia, independiente de calidad del paper.
- **Paper sigue funcional**: usuarios académicos no pierden funcionalidad durante el período intermedio.
- **Reuso de aprendizajes**: las decisiones, ADRs y código de Fases 0-6 (sermón) se aplican directamente a Fase 7 (paper). Menos trabajo el segundo round.

### Negativas

- **Pastores que ya usan paper como precursor pierden el atajo**. Mitigación: paper se ofrece como recurso opcional consultable en el Step 1; no se elimina del flujo.
- **Período de inconsistencia**: durante meses, sermón tendrá fidelity gates pero paper no. Usuarios sofisticados notarán.
- **Riesgo de que Fase 7 nunca llegue**: si la iniciativa se distrae con otras prioridades, paper queda permanentemente en estado AI-generado. Mitigación: ADR-004 establece compromiso explícito a Fase 7 + memoria pointer.

### Neutrales

- Métricas del paper siguen con modelo antiguo durante el período. Aceptable — no es el módulo en foco.

## Impacto

- **Código afectado**:
  - `derivedContext` discriminated union: agregar `project` como caso primario para sermón
  - Wizard de sermón: dejar de requerir `paperId` como input
  - UI de Step 1: si proyecto tiene paper, ofrecerlo como recurso lateral
  - Backwards compat: sermones existentes con `paperContext` siguen funcionando
- **Fases impactadas**:
  - Fase 5 (project as container): introduce `Project` que reemplaza `Paper` como raíz cuando aplica
  - Fase 7 (exegesis reform): aplica mismo marco al paper
- **Migraciones requeridas**: sermones que apuntan a paper se migran a apuntar a project (auto-crear project si no existe)
- **Reversibilidad**: alta — el acoplamiento puede re-instaurarse con feature flag si se descubre que el desacople rompe casos de uso académicos críticos

## Referencias

- Phase doc: [phase-7-exegesis-reform.md](../phases/phase-7-exegesis-reform.md), [phase-5-project-as-container.md](../phases/phase-5-project-as-container.md)
- Memorias: `feature_exegesis_module`, `feature_exegesis_paper_artifacts_convergence`, `feature_exegesis_strategy_rubric_separation`, `feature_sermon_pipeline_convergence`
- PRs base: #211, #213, #214
- ADR relacionado: ADR-003 (Project como raíz)
