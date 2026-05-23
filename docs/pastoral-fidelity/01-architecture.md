# 01 — Arquitectura

## Vista de alto nivel

```
                 ┌─────────────────────────────────────┐
                 │           PROYECTO PASTORAL          │
                 │  (unidad raíz: texto/tema + pastor)  │
                 └──────────────┬──────────────────────┘
                                │
                 ┌──────────────▼──────────────────────┐
                 │   ESTUDIO (semilla pastoral)         │
                 │   6 pasos del tutor griego/hebreo    │
                 │   + audit trail                      │
                 └──────────────┬──────────────────────┘
                                │
                 ┌──────────────▼──────────────────────┐
                 │   VALIDACIÓN POR TRES TESTIGOS       │
                 │   T1: contexto inmediato             │
                 │   T2: paralelos canónicos            │
                 │   T3: confesión declarada            │
                 └──────────────┬──────────────────────┘
                                │
                 ┌──────────────▼──────────────────────┐
                 │   DESARROLLO ASISTIDO                │
                 │   AI cultiva sobre la semilla        │
                 │   + fidelity pass (claim↔source)     │
                 │   + contra-scan obligatorio          │
                 └──────────────┬──────────────────────┘
                                │
       ┌────────────────────────┼────────────────────────┐
       │                        │                        │
       ▼                        ▼                        ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   SERMÓN     │        │   ESTUDIO    │        │  NEWSLETTER  │
│              │        │   BÍBLICO    │        │  / POST /    │
│              │        │              │        │  LECCIÓN     │
└──────────────┘        └──────────────┘        └──────────────┘
                 (artefactos derivados de un mismo proyecto)
```

Tres principios estructurales aterrizados en arquitectura:

| Principio | Manifestación arquitectónica |
|---|---|
| P1 — Labor antes que output | Wizard gated en Step 1 hasta `pastoralSeed` completo |
| P2 — AI desarrolla, no origina | Prompt incluye `pastoralSeed` como `PRIMARY VOICE`; cada sección del borrador linkea a su semilla origen |
| P3 — Confrontación obligatoria | Contra-scan + tres testigos como pre-publish gates |

Adicionalmente, toda decisión arquitectónica debe alinearse con el **modelo pedagógico operacional** adoptado en [ADR-005](./decisions/ADR-005-exegetical-confessional-pedagogy.md): el [Manifiesto Pedagógico](./05-pedagogy-manifesto.md) del fundador. El bridge operacional manifiesto↔componentes está en [06-pedagogy-applied.md](./06-pedagogy-applied.md). Si un componente arquitectónico no es trazable al manifiesto, debe ser reformulado o el bridge debe extenderse.

## Componente 1: Proyecto como unidad raíz

Hoy: sermón, exégesis, faculty son colecciones siblings sin relación canónica.

Después: `Project` es la raíz. Contiene:

```typescript
interface Project {
  id: string;
  ownerUid: string;
  passage: PassageRef;           // pericope o tema
  title: string;
  declaredConfession: ConfessionId;
  study: PastoralStudy;          // semilla + 6 pasos + audit
  artifacts: ArtifactRef[];      // sermon, study, newsletter, post, etc.
  series?: SeriesRef;            // opcional, si es parte de serie
  createdAt, updatedAt, status;
}
```

Esto honra Brooks: **un pastor, una lucha con el texto, múltiples distribuciones**. Resuelve simultáneamente:

- Homogeneización (una voz por proyecto)
- Convergencia (un solo `pastoralSeed` alimenta N artefactos)
- Métricas (proyectos completados, no piezas producidas)
- Pricing (cobras por proyecto, no por output)

Reuso: el patrón paper→artefactos de PR #211 (`feature_exegesis_paper_artifacts_convergence`) escalado un nivel arriba.

## Componente 2: Six-step spine como Step 1 del wizard

Step 1 del wizard de sermón NO es campo de texto libre. **Es la metodología de 6 pasos del tutor de griego/hebreo aplicada al pasaje del sermón**.

Los 6 pasos (preservados en `feature_greek_tutor_methodology_narrative`):

| # | Paso | Lo que produce el pastor | Tooling asistido |
|---|------|--------------------------|------------------|
| 1 | **Lectura** | Primera impresión escrita del texto | Texto + interlineal + audio opcional |
| 2 | **Sintaxis** | Identifica oración principal de la perícopa | Canonical analyzer muestra cláusulas |
| 3 | **Morfología** | Anota 2-3 palabras clave + descubrimientos | Tutor griego/hebreo on-demand por palabra |
| 4 | **Reconocimiento** | Marca 1-3 paralelos canónicos que iluminan | Cross-reference engine |
| 5 | **Función** | Formula: ¿qué hace el texto a su lector original? | Faculty modo histórico-cultural opcional |
| 6 | **Insight** | Idea central + 3 observaciones + pregunta abierta + anécdota + **aplicación doxológica** (Paso 8 manifiesto) | Sin asistencia AI directa (semilla pura del pastor) |

Salida del Step 1:

```typescript
interface PastoralSeed {
  passageRef: PassageRef;
  firstImpression: string;
  mainClause: { ref: string; analysis: string };
  wordStudies: WordStudy[];
  parallels: ParallelRef[];
  originalAudienceFunction: string;
  centralIdea: string;             // 1 oración, sin AI
  observations: string[];           // mínimo 3, sin AI
  openQuestion: string;             // 1, sin AI
  pastoralAnecdote: string;         // 1, sin AI
  doxologicalApplication: string;   // 1, sin AI — Paso 8 manifiesto

  audit: {
    toolsConsulted: ToolUsage[];
    timeSpentSeconds: number;
    completedAt: timestamp;
  };
}
```

Esta semilla se inyecta como **`PRIMARY VOICE` block** del prompt del LLM en Step 3+. El sistema desarrolla AMPLIANDO esa semilla, no creando desde cero.

## Componente 3: Tres testigos para validación

Cuando el pastor declara `centralIdea` u `observations`, el sistema NO afirma ni niega. Ejecuta tres testigos en paralelo:

### Testigo 1 — Contexto inmediato

- Input: claim del pastor + canonical analyzer del pasaje completo + perícopa
- Pregunta interna: ¿el claim ignora un elemento estructural mayor del texto?
- Output: "Tu idea central es X. Verso 7 introduce concepto Y. ¿Cómo se relaciona en tu lectura?"
- Implementación: prompt LLM con cláusulas analizadas + claim

### Testigo 2 — Paralelos canónicos

- Input: claim del pastor + cross-reference engine
- Pregunta interna: ¿cómo trata la Escritura el mismo tema en otros pasajes?
- Output: "Pablo trata X en Rom 3:21-26 con énfasis Z. ¿Tu lectura lo armoniza?"
- Implementación: cross-ref engine — **verificar si ya existe en el repo o si necesita build** (pregunta pendiente Fase 0)

### Testigo 3 — Confesión declarada del pastor

- Input: claim del pastor + texto de la confesión que él mismo declaró al onboarding
- Pregunta interna: ¿el claim tensiona la propia confesión declarada?
- Output: "Tu observación parece tensionar 1689 cap. X que declaraste. ¿Intencional o quieres revisar?"
- Implementación: catálogo de confesiones con secciones taggeadas por tema, embedding search

### Escalado de disenso

| # testigos disienten | Acción |
|---|---|
| 0 | Sin fricción, pasa al Step 2 |
| 1 | Nota informativa visible, sin bloqueo |
| 2 | **Bloqueo blando**: pastor debe escribir respuesta breve (≥50 chars) reconociendo o reformulando |
| 3 | **Bloqueo duro**: invocación obligatoria de Faculty doctrinal antes de continuar; pastor debe declarar "consideré y mantengo / reformulo" con texto |

### Excepción: credos ecuménicos clásicos

Si el claim niega Nicea o Calcedonia (Trinidad, dos naturalezas de Cristo, resurrección corporal, etc.), **bloqueo absoluto sin override**. No es partisanship denominacional — son límites cristianos clásicos compartidos.

Lista exacta de claims bloqueados absolutos: TBD en ADR específico de Fase 2.

## Componente 4: Pedagogía — Socratismo bíblico + andamiaje

El sistema enseña preguntando, pero también sirviendo recursos. Niveles escalados (Vygotsky aplicado a teología):

1. **Pregunta abierta** — "¿qué ves en el texto?"
2. **Pregunta dirigida** — "¿notaste el verbo en v.7? ¿Qué tiempo gramatical es?"
3. **Recurso ofrecido** — "tutor de griego puede mostrarte el aoristo aquí" (botón inline)
4. **Exposición** — última opción, formato consenso: "tradición histórica sugiere Z, ¿cómo lo lees tú?"

**Diferencia crítica con Socratismo griego**: el Socratismo de Jesús (Luc 10:26, Mt 22:42, Mr 8:29) siempre termina en revelación: "¿qué dice la Escritura?", no "¿qué piensas tú?". El producto debe ser anclado en Palabra, no en interioridad del pastor.

Sistema nunca dice "esto es así". Siempre "texto + paralelos + tradición sugieren Z — tú decides".

## Componente 5: Pass de fidelidad claim↔source

Después del borrador, segundo LLM evalúa cada marcador `[N]`:

```typescript
interface FidelityCheck {
  marker: number;
  claim: string;                 // oración a la izquierda del marcador
  sourceChunk: string;           // chunk al que apunta [N]
  verdict: 'supports' | 'partial' | 'unrelated' | 'contradicts';
  reasoning: string;
}
```

Gate publish:

- `unrelated + contradicts` > 20% del total → bloqueo duro
- `partial` > 40% → bloqueo blando (revisar)
- Todo `supports` → pasa

Este es el **gap más grande del motor de citas actual**: hoy validamos identidad de fuente (existe en biblioteca), no contenido. Esta fase cierra la brecha.

## Componente 6: Contra-scan obligatorio

Antes de publish, panel "Tensiones del corpus":

- Sistema busca en la biblioteca del usuario chunks que **disientan** del claim central
- Surface al menos 3 chunks de contra-posición
- Pastor debe marcar uno como "considerado" con nota breve (≥100 chars)
- No skip

Esto implementa Hechos 20:27 en producto. Sin esto el sermón siempre será cómodo.

## Componente 7: Indicador de autoría visible

Diff verbatim vs reescrito por sección del borrador final:

- Badge inline: "Tu voz en esta sección: 38%"
- Gate publish: <50% verbatim mandatorio (configurable por confesión)
- Lo que se visibiliza, se presiona

## Componente 8: Voice fingerprint (Fase 4 tardía)

Adapter de estilo desde sermones previos del pastor. Output suena a ÉL, no a "voz Preach genérica". Resuelve homogeneización + autenticidad simultáneamente. Costoso, va tarde.

## Componente 9: Planner como runway

Hoy: planner asigna fechas a perícopas y permite pre-generar contenido.

Después: planner es **calendario inverso de formación**:

| Días antes | Hito |
|---|---|
| D-14 | Lectura + primera impresión (Paso 1) |
| D-10 | Análisis griego/hebreo (Pasos 2-3) |
| D-7 | Idea central declarada + tres testigos (Paso 6 + validación) |
| D-3 | Borrador con AI + fidelity pass |
| D-1 | Oración final + revisión personal |

Planner se vuelve **disciplina espiritual asistida**. Pre-generación automática se elimina.

## Componente 10: Desacople sermón ↔ exégesis

El paper exegético sigue existiendo. Pero el sermón **no lo requiere como prerequisito**. Cada proyecto tiene su propio Step 1 (6 pasos). Si existe paper en el proyecto, es **recurso consultable**, no precursor obligatorio.

Esto libera reforma de exégesis para Fase 7 sin bloquear el avance del sermón. Ver [ADR-004](./decisions/ADR-004-defer-exegesis-reform-decouple-sermon-from-paper.md).

## Stack reutilizado vs nuevo

Detalle completo en [03-reuse-map.md](./03-reuse-map.md). Resumen:

| Componente | Estado |
|---|---|
| Tutor griego + 6 pasos | **Reuso** (memoria `feature_greek_tutor_methodology_narrative`) |
| SBL GNT canonical analyzer | **Reuso** (Testigo 1 + Step 1 sintaxis) |
| Hebrew analyzer | **Reuso** (paralelo) |
| Faculty doctrinal modes | **Reuso** (invocación en 3/3 disent) |
| Library + recommendations PR #93 | **Reuso** (Testigo 2 + contra-scan) |
| Citation engine actual (B+C) | **Reuso** (input al fidelity pass) |
| PR #211 paper→artifacts | **Reuso** (patrón para proyecto→artifacts) |
| Sermon series planner | **Reuso** (base del runway) |
| Cross-reference engine canónico | **Verificar** (existe? build? API externa?) |
| Confession catalog + tagging | **Nuevo** (Fase 0/2) |
| Fidelity pass LLM (claim↔source) | **Nuevo** (Fase 3) |
| Autoría diff tracker | **Nuevo** (Fase 4) |
| Voice fingerprint adapter | **Nuevo** (Fase 4 tardía) |

~70% del trabajo es orquestación de infraestructura existente. ~30% código realmente nuevo.
