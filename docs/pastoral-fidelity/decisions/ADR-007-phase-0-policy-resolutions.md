# ADR-007 — Phase 0 policy resolutions (Q2 migration + Q3 visibility + Q4 override)

## Estado

`accepted`

## Fecha

2026-05-22

## Contexto

[Phase 0](../phases/phase-0-foundations.md) inició con 5 preguntas bloqueadoras. Tres son decisiones de política (no técnica) que pueden resolverse en un solo ADR:

- **Q2** — Migración de users existentes (cómo obtener `declaredConfession`)
- **Q3** — Visibilidad de la confesión declarada
- **Q4** — Política de override en bloqueo duro 3/3 testigos

Q1 (cross-reference engine) se cierra en [ADR-008](./ADR-008-cross-reference-engine-tsk-based.md). Q5 (confesiones v1) se cierra en [ADR-006](./ADR-006-rights-aware-citation-system.md) via adopción del JSON.

Las tres preguntas restantes fueron discutidas con el fundador y resueltas con su input directo.

## Decisión

### Q2 — Migración: backfill opcional (no bloqueante)

Para users existentes al momento del rollout del `pastoral_fidelity_flow`:

- **NO modal bloqueante al login**
- **Banner persistente** en dashboard hasta que declaren confesión
- **Bloqueo de uso del flow nuevo** hasta declarar — pero pueden seguir usando el flow legacy (wizard standalone hasta que se degrade en Fase 5)
- **Setting editable** después: `/settings/confession` accesible en cualquier momento
- Para users nuevos post-rollout: confesión es **obligatoria en onboarding** (modal en signup flow)

Razón: priorizar avance del trabajo de fidelidad sin disrumpir users existentes que están a media tarea. Coherente con la elección del fundador de "no entiendo bien las implicancias de no migrarlos, pero lo dejaría como algo opcional si eso facilita el avance".

### Q3 — Visibilidad: default privada, configurable

```typescript
interface UserProfile {
  declaredConfession: ConfessionId;
  confessionVisibility: 'private' | 'public-in-profile';  // default 'private'
}
```

- **Default `private`** — solo el sistema y los tres testigos la usan internamente
- **Toggle a `public-in-profile`** si el pastor tiene perfil pastoral público (cuando exista) — útil para transparencia confesional
- Editable en cualquier momento
- Audit log de cambios

Razón: algunos pastores valoran transparencia confesional pública; otros operan en contextos donde declarar denominación crea fricción social/eclesial. Default conservador respeta ambos.

### Q4 — Override policy: sistema de tres niveles (resuelto por ADR-005)

Esta decisión ya fue establecida por [ADR-005](./ADR-005-exegetical-confessional-pedagogy.md) y su bridge [06-pedagogy-applied § Sistema de tres niveles](../06-pedagogy-applied.md#4-sistema-de-tres-niveles-de-doctrina-operacionalización). Aquí solo se formaliza:

| Nivel del claim en disenso | Política | Override |
|---|---|---|
| `core` (credos ecuménicos: Nicea, Calcedonia) | Bloqueo absoluto | **No** |
| `distinctive` (posiciones de la confesión declarada del pastor) | Bloqueo duro con escalado normal | **Sí** (justificación escrita ≥100 chars + audit log + Faculty doctrinal invoke) |
| `open-evangelical` (disentimientos legítimos) | Nota informativa | N/A (sin bloqueo) |

Implementación operacional en [06-pedagogy-applied.md](../06-pedagogy-applied.md). Tagging del catálogo de confesiones por nivel: [ADR-006 § Tagging doctrineLevel](./ADR-006-rights-aware-citation-system.md#tagging-doctrinelevel-para-v1).

## Alternativas consideradas

### Para Q2

| Alternativa | Por qué descartada |
|---|---|
| **Modal bloqueante al login** | Fricción mayor para users existentes sin entregar valor inmediato. Posible churn. |
| **Backfill auto desde patterns observados** | Inferencia teológica sin consentimiento. Riesgo de mismatch. |
| **No pedir confesión a users existentes — solo nuevos** | Crea dos clases de users. Diluye el mecanismo de tres testigos para half de la base. |

### Para Q3

| Alternativa | Por qué descartada |
|---|---|
| **Siempre pública** | Algunos pastores no pueden declarar confesión públicamente por contexto (iglesia transición, pastor en formación). |
| **Siempre privada** | Pierde la opción de transparencia confesional para pastores que la valoran. |
| **Visible solo a admins** | Caso de uso no claro. Privacy default mejor. |

### Para Q4

Ver [ADR-005](./ADR-005-exegetical-confessional-pedagogy.md) y [ADR-001](./ADR-001-confession-anchored-correction.md).

## Consecuencias

### Positivas

- **Phase 0 destrabada**: solo Q1 (cross-ref engine) queda y se cierra en ADR-008.
- **Backwards compatibility para users existentes**: sin disrupción al onboarding actual.
- **Flexibilidad de transparencia**: pastor decide qué hacer público.
- **Override policy defendible**: ni autoritarismo del sistema ni anarquía doctrinal — solo respeta el marco que el propio pastor declaró.

### Negativas

- **Subset de users sin `declaredConfession` durante período de transición**: hasta que declaren, no pueden usar flow nuevo. Métrica a monitorear post-rollout.
- **Visibilidad pública requiere existencia de perfil pastoral público** como feature — TBD si/cuándo se construye.
- **Audit log de cambios de confesión**: añade carga de almacenamiento mínima.

### Neutrales

- Configuración accesible en settings → adds 1 page más al menú de settings.

## Impacto

- **Código afectado**:
  - Onboarding flow: modal de confesión para users nuevos
  - Dashboard: banner persistente para users existentes sin confesión declarada
  - `/settings/confession`: nueva page editable
  - `UserProfile` schema: agregar `declaredConfession`, `confessionVisibility`
  - `confessionChangeAudit/` colección Firestore
  - Wizard de sermón: gate "must declare confession before entering pastoral_fidelity_flow"
- **Fases impactadas**:
  - **Fase 0**: implementación completa de estos tres items
  - **Fase 2**: consumer de `declaredConfession` para Testigo 3
- **Migraciones requeridas**:
  - Schema extension `users/{uid}` aditivo
  - No backfill obligatorio
- **Reversibilidad**: alta — feature flag controla rollout; configuración eliminable sin pérdida de datos críticos

## Referencias

- Phase doc: [phase-0-foundations.md](../phases/phase-0-foundations.md)
- ADRs relacionados: [ADR-001](./ADR-001-confession-anchored-correction.md), [ADR-005](./ADR-005-exegetical-confessional-pedagogy.md), [ADR-006](./ADR-006-rights-aware-citation-system.md), [ADR-008](./ADR-008-cross-reference-engine-tsk-based.md)
