# ADR-002 — Six-step methodology del tutor griego como spine obligatorio del Step 1 del wizard

## Estado

`accepted`

## Fecha

2026-05-22

## Contexto

Step 1 actual del wizard de sermón presenta un campo de texto libre para "observación del pasaje" (o equivalentes). Esto produce dos fallos crónicos:

1. **Input shallow**: pastor escribe 1-2 oraciones sin haber hecho estudio real. El sistema desarrolla sobre semilla pobre y produce sermón sintético con apariencia de fundamento.
2. **No verificable**: imposible saber si el pastor hizo estudio o solo digitó. Sin estructura, no hay audit ni gate.

Paralelamente, el repo tiene la metodología de 6 pasos del tutor griego (`feature_greek_tutor_methodology_narrative`) que fue removida del UI del tutor durante el rediseño Faculty (mayo 2026) pero **preservada explícitamente para reuso**. Los 6 pasos son:

1. Lectura
2. Sintaxis
3. Morfología
4. Reconocimiento
5. Función
6. Insight

Esta metodología es exegéticamente sólida (rigor académico básico), pedagógicamente progresiva (cada paso construye sobre el anterior), y ya tiene infraestructura de tooling (canonical analyzer, tutor griego/hebreo, paralelos).

## Decisión

El Step 1 del wizard de sermón **deja de ser un campo de texto libre** y se reemplaza por una secuencia obligatoria de los 6 pasos de la metodología del tutor griego/hebreo, aplicados al pasaje del proyecto.

Cada paso produce un output específico persistido en la `pastoralSeed` del proyecto:

| # | Paso | Output del pastor | Asistencia disponible |
|---|------|-------------------|------------------------|
| 1 | Lectura | Primera impresión escrita (≥50 chars) | Texto + interlineal + audio opcional |
| 2 | Sintaxis | Oración principal identificada de la perícopa | Canonical analyzer surface clauses |
| 3 | Morfología | 2-3 word studies con descubrimiento personal (≥30 chars cada uno) | Tutor griego/hebreo on-demand |
| 4 | Reconocimiento | 1-3 paralelos canónicos marcados con relevancia anotada | Cross-reference engine |
| 5 | Función | Respuesta libre: "¿qué hace este texto a su lector original?" (≥100 chars) | Faculty modo histórico opcional |
| 6 | Insight | Idea central + 3 observaciones + 1 pregunta abierta + 1 anécdota pastoral | **SIN asistencia AI** — semilla pura |

El wizard **bloquea avance al Step 3+** hasta que los 6 pasos estén completos. No skip. No "soy avanzado, paso esto". El gate es teológico (P1), no UX.

El Step 6 (Insight) explícitamente **no tiene asistencia generativa**. Si el LLM sugiere idea central, contamina toda la generación posterior. La idea central debe nacer del pastor.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Mantener free-text con sugerencias AI** | No resuelve el problema raíz. Pastor sigue produciendo input shallow asistido por LLM. Viola P2. |
| **Custom 4-step format (más corto)** | Re-invention. El six-step ya existe, está probado, tiene tooling. Custom = más mantenimiento + menos rigor. |
| **Spine opcional, free-text default** | Power users skippean. El gate teológico no admite bypass por preferencia. |
| **Estructura propia del wizard (no reusar tutor)** | Duplicación. Tutor griego ya hace esto. La memoria `feature_greek_tutor_methodology_narrative` documenta que fue removido para reuso — este ES el reuso planificado. |
| **Spine después del borrador (validación post-hoc)** | Backwards. Estudio post-hoc es lo que ya hace el flow actual. No resuelve nada. |
| **Tres pasos en vez de seis** | Pierde rigor. Sintaxis + morfología + paralelos son la columna del análisis exegético. Eliminar pasos diluye la formación. |

## Consecuencias

### Positivas

- **Reuso ~95%** de la infraestructura del tutor griego/hebreo. Código nuevo solo en orquestador wrapper + persistencia de outputs.
- **Honra P1** explícitamente: pastor no ve borrador hasta haber estudiado.
- **Audit verificable**: cada paso persiste output + timing + tools consultados. Visible al propio pastor.
- **Diferenciador de mercado**: ningún competidor genera sermones forzando análisis sintáctico previo. Refuerza positioning de formación.
- **Resuelve la memoria `feature_greek_tutor_methodology_narrative`**: explica explícitamente dónde se reusan los 6 pasos preservados.

### Negativas

- **Time-to-first-draft sube** de ~5 min a ~30-45 min (pastor experimentado) o ~90 min (principiante). Costo real de la formación.
- **Conversión inicial al flow nuevo bajará**. Algunos pastores buscarán alternativas más rápidas. Aceptable — coherente con la visión.
- **Pastores que no manejan griego/hebreo** necesitan tutorial onboarding del propio tutor. Mitigación: modo "guíame paso a paso" del tutor existente.
- **Costo LLM por proyecto sube** (tutor consultas + analyzer + paralelos). Estimar y ajustar pricing si necesario.

### Neutrales

- UI del wizard requiere rediseño significativo (de 4-5 steps lineales a Step 1 con 6 sub-steps).
- Métricas cambian: progreso ahora se mide en paso completado del six-step, no en step del wizard agregado.

## Impacto

- **Código afectado**:
  - Wizard Step 1 component (rediseño)
  - Wrapper orchestrator nuevo
  - `PastoralSeed` schema en Firestore
  - Prompt builder del Step 3+ (consume seed como `PRIMARY VOICE`)
  - Gates de wizard (bloqueo hasta seed completo)
- **Fases impactadas**: 1 (implementación), 2 (los testigos validan el seed producido aquí)
- **Migraciones requeridas**: feature flag por usuario inicialmente; eventually default. Wizards en progreso al momento del switch se completan en flow viejo.
- **Reversibilidad**: alta — feature flag permite rollback rápido. Datos del seed persisten aunque feature se apague.

## Referencias

- Phase doc: [phase-1-six-step-spine.md](../phases/phase-1-six-step-spine.md)
- Architecture: [01-architecture.md § Six-step spine](../01-architecture.md#componente-2-six-step-spine-como-step-1-del-wizard)
- Memoria: `feature_greek_tutor_methodology_narrative` (justificación del reuso)
- ADR relacionado: ADR-001 (confesión declarada — usada en validación del seed via Testigo 3)
