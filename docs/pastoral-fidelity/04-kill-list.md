# 04 — Kill list

Inventario explícito de features, métricas, copy y comportamientos que deben **deprecarse o degradarse** porque son incompatibles con los tres principios no negociables ([00-vision.md § Principios](./00-vision.md#los-tres-principios-no-negociables)).

Cada item incluye: razón, severidad, fase en la que se ejecuta, plan de migración.

## Features a matar o degradar

### Wizard standalone "generar sermón completo desde cero"

- **Estado actual**: Wizard accesible desde CTA principal genera sermón full sin requerir study previo.
- **Conflicto**: Violación directa de P1 (Labor antes que output) y P2 (AI desarrolla, no origina).
- **Severidad**: ALTA — es el principal canal de uso del producto hoy.
- **Plan**:
  - Fase 0/1: agregar feature flag `pastoral_fidelity_flow` para A/B.
  - Fase 1: el flow nuevo es el default; el flow viejo queda accesible solo con `?legacy=1` para QA.
  - Fase 5: degradar a "modo demo" accesible desde `/admin` y con marca "modo legacy — no recomendado".
  - Eventualmente: remover del codebase.
- **Coherencia con memoria**: `priorities_repositioning` ya marcaba esto como pendiente.

### Pre-generación automática de bosquejos en el planner

- **Estado actual**: Al asignar fecha a una perícopa en el series planner, el sistema puede pre-generar contenido.
- **Conflicto**: P1 directa — produce output antes que el pastor estudie.
- **Severidad**: MEDIA — no es el flujo principal pero es contaminante.
- **Plan**:
  - Fase 6: eliminar pre-generación. Reemplazar por runway inverso de formación (calendario que recuerda al pastor cuándo empezar cada paso).
  - Mensaje migratorio al usuario explicando el cambio.

### Free-text observation field en Step 1 (donde exista)

- **Estado actual**: Algunos paths permiten observaciones libres en una caja de texto.
- **Conflicto**: Invita a input shallow que no constituye semilla pastoral verificable.
- **Severidad**: BAJA — reemplazado naturalmente por el six-step spine.
- **Plan**:
  - Fase 1: el six-step reemplaza cualquier caja libre como gate.

### "Regenerar borrador completo" botón

- **Estado actual**: Wizard permite regenerar completo descartando edits.
- **Conflicto**: Anula la métrica de autoría verbatim. Pastor puede usar como escape de fricción.
- **Severidad**: MEDIA.
- **Plan**:
  - Fase 4: cambiar a "regenerar sección" granular. Cada regenerate impacta el `verbatimRatio` de esa sección y queda en audit.

### Atajos para "saltar análisis griego/hebreo"

- **Estado actual**: Si existen botones tipo "no soy seminarista, saltar" o equivalentes, contradicen el spine.
- **Conflicto**: P1 + P3 — debilita estudio personal.
- **Severidad**: VARIABLE — auditar UI antes de matar.
- **Plan**:
  - Fase 1: auditoría UI. Reemplazar "saltar" por "no manejo griego — guíame paso a paso" (que invoca tutor en modo principiante, no skip).

## Métricas a dejar de medir

| Métrica antigua | Por qué muere | Reemplazo |
|---|---|---|
| Time-to-publish | Refuerza velocidad sobre fidelidad | Time-in-study (pre-captura pastoral) |
| Sermones generados / mes | Cuenta output sintético | Proyectos completados con publish |
| Steps wizard completados | Cuenta clicks, no engagement | % verbatim del pastor + tres-testigos pass rate |
| Conversión a publish (funnel) | Asume publish es el goal | Tasa de re-escritura del borrador |
| Streak de uso diario | Promueve dependencia, no formación | Auto-reporte trimestral de crecimiento teológico |

**Importante**: las métricas viejas siguen siendo útiles para diagnóstico operativo del sistema (perf, errores, costo LLM). Lo que muere es su uso como **métrica de éxito de producto**.

## Copy / mensajes UI a eliminar

| Copy actual (anti-patrón) | Reemplazo coherente |
|---|---|
| "Genera tu sermón en minutos" | "Tu estudio, expandido. Predica tu propia voz." |
| "IA escribe tu sermón" | "Desarrolla tu estudio con asistencia" |
| "Sermón listo en 1 click" | "5 días desde el pasaje al púlpito, sin perder tu voz" |
| Botón "Generar sermón" | Botón "Desarrollar mi estudio" |
| "Bosquejo automático" | "Bosquejo a partir de tu observación" |
| Cualquier mención de "IA/GPT/Gemini/modelo" en UI | Coherente con `feedback_copy_no_ai_exposure` — usar "el asistente" o describir el output |
| "TMS" en marketing | Coherente con `feedback_copy_no_proprietary_tms` |

## CTAs a re-rutear

Coherente con `priorities_repositioning`:

- Home hero: NO debe apuntar a "generar sermón standalone"
- Dashboard primary CTA: "Comenzar nuevo proyecto pastoral" (no "Nuevo sermón")
- Onboarding wizard: terminal en proyecto, no en sermón solo
- Email nurture sequences: ajustar copy para no prometer velocidad pura

## Patrones de diseño a abandonar

### "Power user shortcut" en flujos formativos

Tentación de agregar "saltar onboarding del pastoral seed para usuarios avanzados" porque ralentiza la conversión. **No.** El gate es teológico, no UX. Pastor experimentado debería poder completar los 6 pasos en 15 min — eso es el goal, no el bypass.

### "Smart defaults" para central idea

Tentación de pre-llenar `centralIdea` con sugerencia del LLM. **No.** Viola P2 explícitamente. La idea central es la piedra de toque de toda la generación posterior. Si la sugiere AI, contamina todo lo demás.

### Onboarding "lite" que difiere la declaración de confesión

Tentación de hacer la confesión un setting opcional editable después. **No.** La confesión es Testigo 3. Sin ella, no hay validación completa. Hacerla obligatoria al onboarding es el costo correcto.

## Hardcoded doctrinal positions

NO debe existir ningún hardcoded "esto es correcto teológicamente" en el código, EXCEPTO:
- Credos ecuménicos clásicos (Nicea, Calcedonia, Apostólico) — base cristiana mínima
- Validación de identidad bibliográfica (Owen existe, Spurgeon existe)

Toda otra posición teológica vive en las **confesiones declaradas** que el usuario eligió. Sistema no impone — refleja la confesión del propio pastor.

## Plan de aplicación del kill-list

| Fase | Items aplicados |
|---|---|
| 0 | Feature flag `pastoral_fidelity_flow`. Auditoría UI completa. |
| 1 | Free-text Step 1 reemplazado por six-step. Copy "Genera sermón" → "Desarrolla estudio". |
| 2 | Métricas viejas marcadas como diagnóstico, no éxito. |
| 4 | Regenerate full → granular. Autoría diff publicado en UI. |
| 5 | Wizard standalone degradado a `/admin`. CTAs re-ruteados. |
| 6 | Pre-gen del planner eliminado. Runway inverso live. |
| 7 | Cleanup final del codebase. Remover legacy. |

## Lo que NO está en el kill-list (y por qué)

- Motor de citas actual (Fases B+C): es prerequisito del fidelity pass. Conservar y extender, no matar.
- Sistema de extracción de biblioteca: ortogonal al cambio. Intocable.
- Faculty chat: se extiende, no se mata.
- Pricing model actual: estable. Ajuste de plan/precio es decisión de negocio paralela.
- Exégesis paper: se difiere reforma a Fase 7. NO se mata.
