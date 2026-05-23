# ADR-005 — Pedagogía exegético-confesional como modelo operacional del sistema

## Estado

`accepted`

## Fecha

2026-05-22

## Contexto

La iniciativa Pastoral Fidelity (ADR-001 a ADR-004) establece principios técnicos de fidelidad pastoral: seed-first (P1), AI desarrolla no origina (P2), confrontación obligatoria (P3), tres testigos para validación, six-step spine, project como raíz, exégesis diferida con desacople.

Estos principios responden al **qué** y al **cómo técnico**. Pero el sistema necesita además un **modelo pedagógico operacional** que dirija:

- La estructura de los prompts de generación
- Las decisiones de UI sobre andamiaje vs. exposición
- El balance entre exégesis, teología bíblica, sistemática e histórica
- El tratamiento de posturas contrarias
- La operacionalización de los disensos (core vs distinctive vs open)

Sin un modelo pedagógico explícito, las decisiones de implementación se hacen ad-hoc, y la voz del sistema deriva hacia patrones LLM genéricos en lugar de hacia un modelo pastoral coherente.

El fundador de Preach (Ricardo Cerda, profesor de seminario en teología sistemática) ha desarrollado un manifiesto pedagógico personal que articula el método con el cual enseña: **enseñar desde la exégesis para realzar la autoridad del texto siempre**, con repertorio de cuatro patrones (exegético central + metodológico + panorámico + sintético).

Este manifiesto es coherente con los principios ya establecidos en la iniciativa y los **extiende** en dimensiones críticas que la arquitectura técnica no había articulado.

## Decisión

Se adopta el **Manifiesto Pedagógico** del fundador ([05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md)) como **modelo operacional canónico** de la iniciativa Pastoral Fidelity.

Toda decisión de diseño de prompt, schema, gate, UI o métrica en los módulos afectados (wizard de sermón, exégesis, citation engine, faculty chat, onboarding, planner) debe ser trazable al manifiesto vía el documento puente [06-pedagogy-applied.md](../06-pedagogy-applied.md).

Implicaciones concretas adoptadas:

1. **Los 9 pasos del patrón exegético** del manifiesto guían la estructura del flow del sermón. El six-step spine es la instancia del Paso 3 (observaciones) y parte del 4 (convergencia). Los pasos restantes (6 diálogo histórico, 7 confrontativa, 8 doxológica, 9 transición) se instancian via Testigo 3 proactivo, contra-scan estructurado, campo nuevo `doxologicalApplication`, y planner runway respectivamente.

2. **Los 4 patrones** del manifiesto se mapean a tipos de artefacto derivado. Schema de `ArtifactType` incluye `defaultPattern: PedagogyPattern`. Prompts del LLM dependen del patrón.

3. **El sistema de tres niveles de doctrina** (core / distinctive / open-evangelical) reemplaza la formulación genérica de "credo ecuménico vs confesional" para el escalado de disensos. Catálogo de confesiones se tagger con este sistema en Fase 0.

4. **Compromisos del manifiesto** (no proof-texting, texto ancla completo, pluralidad de pasajes, teología bíblica integrada, herejías nombradas con términos técnicos y desmanteladas exegéticamente, credos como resúmenes no como autoridades, etc.) se traducen a gates, validators, prompt instructions y UI decisions según mapeo de [06-pedagogy-applied.md](../06-pedagogy-applied.md).

5. **Aplicación al diseño de materiales** del manifiesto guía las decisiones de UI/UX: hojas de trabajo no pre-llenadas (Step 6 sin AI), evaluaciones privilegian exégesis sobre memoria (métricas de éxito), síntesis después de exégesis (gate de orden en prompt).

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Operar sin modelo pedagógico explícito** | Decisiones ad-hoc, drift hacia patrones LLM genéricos, incoherencia entre módulos. |
| **Modelo pedagógico genérico (Bloom, Vygotsky, etc.)** | Falta especificidad teológica. Los modelos generales no abordan el problema central: cómo enseñar doctrina anclada en texto sin imponer autoridad externa. |
| **Adoptar un modelo de un teólogo externo** (ej. Stuart-Fee, Carson) | Apropiación de marco que no es del fundador. Riesgo de inconsistencia con la visión del producto. Externalidad teórica donde se necesita encarnación práctica. |
| **Diseñar un modelo pedagógico nuevo desde cero** | Re-invention. El fundador ya tiene un modelo probado en su propia enseñanza pastoral y de seminario. |
| **Adoptar parcialmente el manifiesto** (solo algunos elementos) | Pierde la coherencia del modelo completo. Los 4 patrones, los 9 pasos, los 3 niveles de doctrina son interdependientes. |

## Consecuencias

### Positivas

- **Coherencia total** entre visión del fundador, decisiones de producto, prompts del LLM, métricas de éxito, y experiencia del pastor usuario.
- **Diferenciador defendible**: ningún competidor genera sermones bajo un modelo pedagógico pastoral explícito y documentado. Marketing copy puede invocar el manifiesto directamente.
- **Onboarding O(1) para colaboradores**: humanos o IA, futuro o presente, leen el manifiesto + bridge doc + ADRs y conocen el modelo completo.
- **Bridge inverso para auditoría**: cualquier output del sistema puede ser cuestionado contra el manifiesto. "¿Por qué este prompt genera primero la síntesis y después la exégesis?" → respuesta inmediata: viola Paso 5/6 del manifiesto, debe reformularse.
- **Resuelve Q4 de Fase 0** (override policy) con framework de tres niveles claro y defendible.
- **Refina ADR-001, ADR-002, ADR-003** en dimensiones que la formulación original no había articulado, sin contradecirlas.
- **Habilita Fase 5** (multi-artefacto) con framework claro de patrón-por-tipo-de-artefacto.

### Negativas

- **Acopla el producto al modelo del fundador**. Si el fundador cambia su pedagogía, el producto debe actualizarse. Versionado del manifiesto (`Versión: 1.0`) ayuda — futuras versiones generan nuevo ADR.
- **Carga de tagging del catálogo de confesiones**: agregar los tres niveles (core / distinctive / open) por cada sección de cada confesión es trabajo significativo (~5-10 días iniciales).
- **Curación de herejías y errores contemporáneos**: catálogo nuevo que mantener.
- **Carga de prompt template por patrón**: 4 templates principales + variantes por artefacto. Mantenimiento ongoing.
- **Restringe libertad de algunos diseños futuros**: cualquier feature que viole el manifiesto necesita primero superseder este ADR. Costo correcto para mantener coherencia.

### Neutrales

- El manifiesto está escrito desde perspectiva evangélica reformada/protestante mayoritaria. Pastores de tradiciones muy distantes (ortodoxa, RCC tradicionalista) podrían encontrar tensiones. Mitigación: el manifiesto explícitamente respeta "credos resumen, no imponen" — esto es compatible con la mayoría de tradiciones cristianas clásicas.
- El manifiesto presupone capacidad exegética (griego/hebreo). Pastores sin formación lingüística siguen siendo soportados via tutor en modo principiante.

## Impacto

- **Código afectado**:
  - Prompt builders (cada artefacto, cada patrón)
  - Schema `Project` y `Artifact` (agregar `pedagogyPattern`)
  - Schema `PastoralSeed` (agregar `doxologicalApplication`)
  - Schema `Confession` y `ConfessionSection` (agregar `doctrineLevel`)
  - Validators: no-proof-texting, plurality check
  - Contra-scan structure (sub-pasos a-e)
  - UI: gates, badges, surface de tres niveles de doctrina
- **Fases impactadas**:
  - Fase 0: tagging de confesiones con tres niveles + resolución Q4
  - Fase 1: schema seed con `doxologicalApplication`
  - Fase 2: Testigo 3 proactivo + escalado por niveles
  - Fase 3: gate de no-proof-texting
  - Fase 4: contra-scan estructurado
  - Fase 5: artifact types con patrones pedagógicos
- **Migraciones requeridas**:
  - Catálogo de confesiones: tagging inicial
  - Catálogo de herejías: nuevo dataset
  - Sermones existentes (pre-iniciativa): sin patrón asignado, default `exegetical` lazy
- **Reversibilidad**: media — la adopción del manifiesto como modelo es central a la iniciativa; revertirla requiere redefinir el producto. Refinamientos del manifiesto (v2, v3) son fáciles vía nuevos ADRs.

## ADRs derivados (pendientes)

Esta decisión genera la necesidad de los siguientes ADRs futuros (a redactar cuando se aborde la fase correspondiente):

- ADR-010 — Three doctrine levels (core/distinctive/open) como base del escalado de disenso
- ADR-011 — Pedagogy pattern per artifact type
- ADR-012 — No proof-texting gate
- ADR-013 — Contra-scan estructurado a-e
- ADR-014 — Catálogo de herejías y errores contemporáneos

## Referencias

- Manifiesto canónico: [05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md)
- Bridge doc operacional: [06-pedagogy-applied.md](../06-pedagogy-applied.md)
- ADRs refinados: [ADR-001](./ADR-001-confession-anchored-correction.md), [ADR-002](./ADR-002-six-step-as-step1-spine.md), [ADR-003](./ADR-003-project-as-root-unit.md)
- Memorias relacionadas: `feature_pastoral_fidelity_roadmap`, `priorities_repositioning`, `feature_greek_tutor_methodology_narrative`
