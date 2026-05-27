# 06 — Pedagogía aplicada (manifiesto → componentes Preach)

Documento puente. Convierte el manifiesto pedagógico ([05-pedagogy-manifesto.md](./05-pedagogy-manifesto.md)) en spec operacional para implementación. Toda decisión de prompt, schema, gate o UI en la iniciativa Pastoral Fidelity debe ser trazable a este mapeo.

Si una decisión de implementación no encaja en este documento, una de dos: (a) el documento está incompleto y debe extenderse, o (b) la decisión está mal y debe reformularse.

---

## 1. Los 9 pasos del patrón exegético → componentes Preach

Mapeo paso-por-paso del patrón central del manifiesto a la implementación.

| # | Paso del manifiesto | Componente Preach | Schema field / gate | Fase |
|---|---|---|---|---|
| 1 | **Pregunta abierta** | Pre-llenado obligatorio antes de generar | `pastoralSeed.openQuestion` | 1 |
| 2 | **Texto bíblico ancla** | `passageRef` del proyecto | `Project.passage` | 0 |
| 3 | **Observaciones exegéticas** (afirma / exige / descarta / gramática / contexto) | Six-step spine Pasos 1-3 (Lectura, Sintaxis, Morfología) | `pastoralSeed.reading`, `pastoralSeed.syntax`, `pastoralSeed.morphology` | 1 |
| 4 | **Convergencia exegética** (paralelos + teología bíblica + sistemática) | Six-step spine Paso 4 (Reconocimiento) + Testigo 2 (paralelos) + sección obligatoria del borrador "Convergencia canónica" | `pastoralSeed.recognition.parallels`, `WitnessResult.testigo2_parallels`, prompt template requiere sección | 1, 2 |
| 5 | **Síntesis doctrinal** | `pastoralSeed.insight.centralIdea` — sin AI, emerge del trabajo | gate "sin AI suggestion en Step 6" + audit `pasteEvents` | 1 |
| 6 | **Diálogo con teología histórica** | Testigo 3 (confesión declarada) — proactivo, no solo reactivo | `WitnessResult.testigo3_confession` siempre se computa + prompt incluye "tu confesión declara sobre este tema: ..." | 2 |
| 7 | **Exégesis confrontativa** (a→e: enuncia → pasaje → exégesis → falla → conclusión) | Contra-scan estructurado por sub-pasos a-e | `ContraScan` produce 5 outputs por chunk disonante: `bestVersion`, `keyPassage`, `exegeticalAnalysis`, `whereItFails`, `whyOrthodoxStands` | 4 |
| 8 | **Aplicación pastoral / doxológica** | Campo nuevo en seed + sección obligatoria del borrador final | `pastoralSeed.doxologicalApplication` (≥80 chars, sin AI) + prompt template requiere sección "Aplicación doxológica" | 1 (campo), 5 (sección artefacto) |
| 9 | **Transición** | Aplicable a series: link al siguiente sermón de la serie | metadata del proyecto si pertenece a `series` | 6 (planner) |

### Mapeo inverso (six-step → manifiesto)

| Six-step Preach | Pasos manifiesto cubiertos |
|---|---|
| 1. Lectura | Paso 2 (texto ancla) + parte del 3 (afirma / exige) |
| 2. Sintaxis | Paso 3 (gramática / sintáctico) |
| 3. Morfología | Paso 3 (lexical) |
| 4. Reconocimiento | Paso 4 (paralelos, teología bíblica inicial) |
| 5. Función | Paso 3 (contexto inmediato + canónico) + parte de 4 (síntesis canónica) |
| 6. Insight | Pasos 1 + 5 + 8 (pregunta abierta + síntesis doctrinal + aplicación doxológica) |

**Gap identificado**: el six-step actual NO instancia explícitamente los Pasos 6 (diálogo histórico), 7 (confrontativa), 8 (doxológica), 9 (transición). Por eso esos pasos viven en:

- Paso 6 manifiesto → Testigo 3 (Fase 2)
- Paso 7 manifiesto → Contra-scan (Fase 4)
- Paso 8 manifiesto → **campo nuevo del seed `doxologicalApplication`** (Fase 1)
- Paso 9 manifiesto → planner inverso (Fase 6)

**Refinamiento Fase 1.6 (8-step spine, ADR-022/024)**: el análisis externo del flujo expuso dos
omisiones del mapeo original:

- **Género literario como paso explícito antes de la estructura.** El manifiesto lo daba por
  supuesto dentro del Paso 3 ("observaciones exegéticas… contexto"), pero en hermenéutica
  histórico-gramatical el género *gobierna las reglas de lectura* y debe determinarse **antes** del
  análisis estructural. Fase 1.6 lo instancia como `contextGenre` (paso 2), reusando `BookPanorama`
  del módulo de exégesis. Ver [ADR-024](./decisions/ADR-024-genre-context-rag-ruta-c.md).
- **Distinción principio atemporal vs. idea central (Robinson).** El Paso 5 del manifiesto
  ("síntesis doctrinal") se colapsaba en `insight.centralIdea`. Robinson distingue la *idea
  exegética* (verdad teológica transcultural — "qué significa") de la *idea homilética* (lo que el
  sermón proclama, en la voz del predicador para su congregación). Fase 1.6 separa el **principio
  teológico atemporal** (`timelessPrinciple`, paso 7 — el puente Kaiser *principlizing bridge*) de
  la **idea central** (`insight.centralIdea`, paso 8). El verificador del principio reusa el
  mecanismo de tres testigos (verificador, no generador). Ver
  [ADR-022](./decisions/ADR-022-eight-step-spine-rename-migration.md) +
  [ADR-023](./decisions/ADR-023-two-tier-proactive-verification.md).

---

## 2. Los 4 patrones → tipos de artefacto derivado

Cada tipo de artefacto del proyecto tiene un `pedagogyPattern` asociado. El prompt template y la estructura del output dependen del patrón.

| `ArtifactType` | `pedagogyPattern` | Justificación |
|---|---|---|
| `sermon` | `exegetical` | Doctrina anclada en texto. Patrón 1 íntegro. |
| `bible-study` | `exegetical` | Misma lógica, formato grupal con preguntas. |
| `sunday-school-lesson` | `exegetical` | Adapta vocabulario a edad pero sigue patrón 1. |
| `pastoral-letter` | `synthetic` | Cierre integrador a la congregación. Patrón 4. |
| `newsletter` | `synthetic` o `methodological` | Si recap mensual → sintético. Si "por qué estudiamos X" → metodológico. |
| `blog-post` | `panoramic` o `methodological` | Intro a doctrina → panorámico. "Cómo leer Romanos" → metodológico. |
| `devotional` | `synthetic` | Aplicación culminante condensada. |
| `series-introduction` | `panoramic` | Mapa del territorio. Patrón 3. |
| `series-closing` | `synthetic` | Recapitulación + comisión. Patrón 4. |
| `methodology-talk` | `methodological` | Hermenéutica, exégesis, principios. Patrón 2. |

### Schema implicado

```typescript
type PedagogyPattern = 'exegetical' | 'methodological' | 'panoramic' | 'synthetic';

interface ArtifactTypeConfig {
  type: ArtifactType;
  defaultPattern: PedagogyPattern;
  allowedPatterns: PedagogyPattern[];   // user can override default within allowed set
  promptTemplate: PromptTemplate;        // per pattern
  requiredSections: SectionRequirement[];
}
```

### Prompt template por patrón (esqueleto)

**Patrón Exegético** (sermon, bible-study, etc.):
```
[PRIMARY VOICE block with pastoralSeed]

Develop the sermon following the 9-step exegetical pattern:
1. Open with the question the text answers (use pastoralSeed.openQuestion)
2. Read the anchor text completely
3. Surface the exegetical observations (use pastoralSeed.reading/syntax/morphology)
4. Show canonical convergence with parallels (use pastoralSeed.recognition.parallels — primary; you may add more)
5. Synthesize the doctrine the text demands (anchor on pastoralSeed.insight.centralIdea verbatim)
6. Dialogue with historical theology (use declaredConfession excerpts that bear on this passage)
7. If there are significant contrary positions, dismantle them exegetically (do NOT appeal to authority — appeal to text)
8. Close with doxological application (use pastoralSeed.doxologicalApplication as seed)
9. If part of a series, end with transition to next sermon
```

**Patrón Metodológico** (intro talks, "how to study X"):
```
Develop following:
1. Provocation: a concrete question/problem
2. Tension: best version of the problem, unresolved
3. Orienting biblical work: 1-2 passages framing (NOT exhaustive)
4. Reasoned argumentation (biblical + practical + historical considerations)
5. Resolution: the position held and why
6. Immediate application: what changes for the listener
7. Transition
```

**Patrón Panorámico** (introductions, doctrine maps):
```
Develop following:
1. The full landscape — the topic as territory
2. Questions the doctrine answers
3. Connections with other doctrines
4. Panoramic biblical witness — many passages, none in depth
5. Live questions / faithful disagreements
6. Roadmap of subsequent sermons/posts
7. Preliminary pastoral application
8. Transition to first specific block
```

**Patrón Sintético** (closures, integrations):
```
Develop following:
1. Condensed recap
2. The unifying thread
3. The culminating question
4. Integrative case or extended application
5. Explicit doxology
6. Commission / sending
```

---

## 3. Compromisos del manifiesto → features/gates de Preach

### Sobre traducciones bíblicas

- **Default RV1960**: configuración global del prompt + display. Hard-default; alternative versions opt-in en project settings.
- **Otras versiones cuando amerite**: `Project.allowedVersions: BibleVersion[]` configurable; default `['RV1960']`.

### Pluralidad de pasajes / no proof-texting

- **Gate de no-proof-texting**: en Fase 3 (fidelity pass) o Fase 4 (contra-scan), validador adicional:
  - Para cada claim que el manifiesto categoriza como `sustantiva` (idea central, doctrina mayor): verificar que esté respaldado por ≥2 chunks de distintos pasajes (no del mismo verso).
  - Si claim mayor con solo 1 cita → flag bloqueo blando "esta afirmación necesita testimonio plural; añade al menos 1 paralelo canónico."
- Implementación: extender `FidelityVerdict` con `pluralityCheck: { passages: number; sufficient: boolean }`.

### Texto ancla leído completo

- **Gate**: prompt builder incluye texto ancla completo (no fragmentos). Verificable mecánicamente — `passageRef` se renderiza full en `PRIMARY VOICE`.

### Teología bíblica integrada (AT→NT)

- Testigo 2 (paralelos) debe incluir explícitamente paralelos cross-testamentariales cuando aplique.
- Prompt template del patrón exegético requiere sección que mencione "trayectoria canónica" si el tema lo amerita.

### Teología sistemática al servicio del texto

- Prompt template incluye instrucción: "Doctrine emerges from the text, not imposed on it. If you find yourself ordering categories that the text doesn't suggest, stop and re-read."
- Audit: contra-scan también busca chunks que muestren cómo OTRAS tradiciones ordenan el mismo texto distinto (útil para humildad sistemática).

### Teología histórica como testimonio

- Testigo 3 (confesión) usado proactivamente: el prompt SIEMPRE incluye "your declared confession says about this topic: ..." aunque no haya disenso. Educa al pastor en su propia tradición.
- Faculty doctrinal en bloqueo duro: explícitamente framea su intervención como "la iglesia fiel ha leído esto así porque..." no "esto es lo correcto."

### Reconocimiento honesto del tiempo

- El audit del seed expone explícitamente al pastor: "Hiciste 4 de 6 pasos completos." Si pastor publica con seed parcial:
  - Sermón se etiqueta internamente `studyDepth: 'partial' | 'full'`
  - El pastor puede ver en su dashboard cuántos sermones publica con qué profundidad de estudio
  - No bloqueo absoluto; transparencia.

### Privilegiar pasajes con peso teológico claro

- Cross-reference engine (Testigo 2): ranking de paralelos considera no solo similitud semántica sino "claridad doctrinal" del paralelo (peso teológico). TBD cómo computar — probablemente curado en el dataset inicial.

### Original griego/hebreo con transliteración + traducción

- Tutor griego/hebreo en Pasos 2-3 del six-step renderiza siempre: `<original> (<translit>) — "<gloss español>"`. Ya soportado, formalizado aquí como standard.

### Herejías nombradas con términos técnicos

- Contra-scan output incluye `historicalLabel?: string` si la postura disonante coincide con una herejía histórica (arrianismo, docetismo, etc.). Catálogo de herejías curado.

### Mejor versión de la postura contraria

- Contra-scan prompt incluye explícitamente: "State the contrary position in its strongest version. Steelman, do not strawman."

### Desmantelamiento exegético, no por autoridad

- Contra-scan prompt: "Critique the contrary position from the text, not from creedal condemnation. The creed's condemnation is testimony; the text is the ground."

### Distinción herejías históricas vs errores contemporáneos

- Catálogo de posturas dissonantes etiqueta cada una con `category: 'historical-heresy' | 'contemporary-error'`. Tratamiento similar pero contexto distinto.

### Credos como buenos resúmenes

- Faculty doctrinal: nunca dice "el credo lo enseña, por tanto verdadero". Siempre dice "el credo lo enseña porque la iglesia leyó el texto así; veamos por qué."

### Grandes teólogos como ejemplos del método

- Library recommendations + corpus excerpts privilegian autores que **modelan el método** (exégesis seria que produce doctrina). Owen, Edwards, Carson, Schreiner, Murray, Vos, etc.

### Disentimientos legítimos modelados con respeto

- Ver sección 4 abajo (sistema de tres niveles).

---

## 4. Sistema de tres niveles de doctrina (operacionalización)

Refinación crítica de ADR-001 y resolución de Q4 (override policy de Fase 0). El manifiesto distingue tres tipos de afirmaciones doctrinales que requieren tratamiento distinto del sistema:

### Nivel A — `core` (sin ambigüedad exegética)

**Definición**: doctrinas que el peso conjunto del texto no permite negar y que toda confesión evangélica histórica afirma.

**Ejemplos no exhaustivos**:
- Trinidad (Padre, Hijo y Espíritu Santo, un solo Dios)
- Deidad de Cristo
- Encarnación verdadera (dos naturalezas en una persona) — Calcedonia
- Resurrección corporal de Cristo
- Salvación por gracia mediante la fe
- Suficiencia y autoridad de la Escritura

**Tratamiento del sistema**:
- Si claim del pastor niega un `core` → **bloqueo absoluto, sin override**
- Faculty doctrinal aparece pero no como mediador — como advertencia
- Audit log permanente

**Fuente de la lista**: intersección de los credos ecuménicos clásicos (Apóstoles, Nicea-Constantinopla, Calcedonia, Atanasiano) + afirmaciones compartidas por todas las confesiones evangélicas mayores soportadas. Curado por nosotros, reviewed con consejo pastoral consultivo si existe.

### Nivel B — `distinctive` (distintivo confesional)

**Definición**: posiciones que distinguen tradiciones fieles entre sí pero que cada confesión sostiene con seriedad exegética.

**Ejemplos no exhaustivos**:
- Paedo vs. credo-bautismo
- Predestinación incondicional vs. condicional
- Continuidad vs. cesacionismo de dones milagrosos
- Posturas milenales (a-mil, post-mil, pre-mil)
- Eclesiología (presbiteriana, episcopal, congregacionalista)
- Modo del bautismo (inmersión, aspersión, afusión)
- Cena del Señor (presencia real, memorial, espiritual)

**Tratamiento del sistema**:
- Si claim del pastor tensiona un `distinctive` de **su propia confesión declarada** → bloqueo blando / duro escalado normal
- Si claim del pastor sostiene un `distinctive` de **otra confesión** → Testigo 3 marca disenso, pastor responde, sistema deja pasar
- Override permitido con justificación escrita ≥100 chars
- Pastor puede declarar formalmente cambio de confesión (audit log) si la deriva es sostenida

### Nivel C — `open-evangelical` (disentimientos legítimos)

**Definición**: temas donde cristianos fieles dentro del mismo marco confesional disienten sin que ninguno sea heterodoxo.

**Ejemplos no exhaustivos**:
- Detalles del orden del culto
- Posturas sobre conciencia cristiana en cuestiones modernas no abordadas directamente por la Escritura (entretenimiento, ciertas prácticas culturales)
- Énfasis pastorales (oración matutina vs. nocturna, etc.)
- Interpretaciones específicas de pasajes apocalípticos no centrales

**Tratamiento del sistema**:
- Nota informativa, jamás bloqueo
- Sistema puede surface "otros pastores fieles han leído esto distinto" si los testigos detectan divergencia
- Ningún audit punitivo

### Implementación del tagging

```typescript
interface ConfessionSection {
  reference: string;
  title: string;
  text: string;
  topics: TopicTag[];
  doctrineLevel: 'core' | 'distinctive' | 'open-evangelical';  // NUEVO
  // ...
}

interface DoctrineClaim {
  text: string;
  detectedLevel: 'core' | 'distinctive' | 'open-evangelical';
  matchedSections: ConfessionSectionRef[];
}
```

Trabajo de Fase 0: tagging inicial del catálogo de confesiones soportadas con los tres niveles. Curado por equipo + reviewed pastoralmente.

---

## 5. Aplicación al diseño de materiales — paralelo Preach

El manifiesto describe cómo se traduce a diapositivas, notas docentes, hojas de trabajo, evaluaciones. Paralelo en Preach:

| Material del manifiesto | Análogo en Preach |
|---|---|
| Presentación proyectada con texto ancla destacado | Sermón export con `passageRef` rendered en estilo destacado (ya implementado en Phase C.1 export con citations) |
| Pasajes en cursiva dorada visibles desde fondo del aula | Estilo de citación verbal del sermón export |
| Cada bloque expone un texto ancla | Cada sección del sermón debe linkear a su pasaje raíz |
| Síntesis después de exégesis | Prompt template enforce: sección "doctrina" no antes de sección "convergencia" |
| Notas docentes con observaciones explícitas | Audit del seed visible al pastor — lo que el sistema observó vs lo que el pastor observó |
| Hojas de trabajo NO pre-llenadas | `pastoralSeed` campos críticos sin AI suggestion (Step 6) |
| Alumno escribe síntesis con sus propias palabras | `centralIdea` verbatim del pastor en el output final |
| Mapas conceptuales parcialmente llenos | Contra-scan: surface chunks, pastor anota "considerado" — no pre-relleno |
| Evaluaciones privilegian preguntas exegéticas sobre memoria | Métricas del producto: % seed completo, tres-testigos pass rate, contra-scan engagement — NO sermones generados, time-to-publish |

---

## 6. Lo que el manifiesto refina en ADRs ya aceptados

### ADR-001 — Confession-anchored correction

Manifiesto refina:
- **Escalado de disenso** se reformula sobre el sistema de tres niveles (core / distinctive / open) en vez de solo "1/2/3 testigos disienten."
- **Confesión declarada usada proactivamente**, no solo reactivamente. Cambia el prompt builder.
- **Faculty doctrinal framing**: nunca "esto es lo correcto"; siempre "la iglesia fiel ha leído así porque..."

Acción: cuando se cierre ADR-008 (override policy), incorporar el sistema de tres niveles explícitamente. ADR-008 referenciar a ADR-005 + este documento.

### ADR-002 — Six-step como spine del Step 1

Manifiesto extiende:
- Agrega Paso 7 al seed: `doxologicalApplication`
- Paso 6 del manifiesto (diálogo histórico) ahora se integra al spine via prompt enriquecido, no solo reactivo
- Step 6 del spine (Insight) ahora incluye explícitamente: idea central + observaciones + pregunta + anécdota + **aplicación doxológica**

Acción: update del schema `PastoralSeed` en `phase-1-six-step-spine.md`.

### ADR-003 — Project como unidad raíz

Manifiesto añade:
- Cada `ArtifactType` tiene `pedagogyPattern` asociado
- Cuatro patrones (no uno) determinan estructura de cada artefacto
- Prompt templates por patrón

Acción: en Fase 5, schema de `ArtifactType` debe incluir `defaultPattern: PedagogyPattern` y prompt template asociado.

### ADR-004 — Defer exégesis, desacoplar sermón de paper

Sin cambio. Manifiesto no altera esta decisión.

---

## 7. Lo que el manifiesto sugiere agregar (nuevos componentes/ADRs)

> **Nota de numeración (2026-05-27)**: los números ADR-010…014 listados abajo eran *ilustrativos*
> al redactar este bridge; los ADRs reales se numeran **al escribirlos** (lección del retrospective
> de Fase 2). Mapeo real a la fecha: el sistema de tres niveles vive en ADR-007/ADR-005 + este §4;
> el orchestrator de tres testigos es ADR-011; el 8-step spine + género + principio son
> ADR-022/023/024. No tratar los números de abajo como definitivos.

### Nuevo ADR-010 propuesto — "Three doctrine levels (core/distinctive/open) como base del escalado"

Define formalmente los tres niveles con criterios de tagging del catálogo de confesiones. Cierra dependencia para ADRs 001 y 008.

### Nuevo ADR-011 propuesto — "Pedagogy pattern per artifact type"

Define el mapeo `ArtifactType → PedagogyPattern` y las plantillas de prompt asociadas. Pre-requisito de Fase 5.

### Nuevo ADR-012 propuesto — "No proof-texting gate"

Define la validación de pluralidad de pasajes para claims sustantivos. Pre-requisito de Fase 3.

### Nuevo ADR-013 propuesto — "Contra-scan estructurado a-e"

Define la estructura de 5 sub-outputs del contra-scan (mejor versión, pasaje clave, análisis exegético, dónde falla, por qué la ortodoxia se sostiene). Pre-requisito de Fase 4.

### Nuevo ADR-014 propuesto — "Catálogo de herejías y errores contemporáneos"

Define la curación + tagging del catálogo de posturas dissonantes con su `category` y `historicalLabel`. Pre-requisito de contra-scan calidad alta.

---

## 8. Preguntas abiertas que el manifiesto genera

1. **¿Quién decide el tagging de doctrina (core/distinctive/open)?** ¿Equipo Preach solo, consejo pastoral consultivo, votación inter-confesional?
2. **¿El pastor puede tagger localmente?** Ej. pastor reformado podría marcar paedo-bautismo como `core` para él; ¿lo permitimos o no?
3. **¿Pedagogy pattern fija o user-overridable?** ¿El pastor puede generar un sermón con patrón sintético cuando default sería exegético?
4. **¿Patrón mixto?** ¿Permitimos sermones híbridos (ej. introducción panorámica + cuerpo exegético + cierre sintético)?
5. **¿Cómo opera el manifiesto en hebreo (AT)?** El manifiesto usa ejemplos del NT (Juan 1:1). Mapeo idéntico al tutor hebreo?
6. **¿Aplica a todos los artefactos o solo a sermones?** Newsletter pastoral semanal ¿también debe pasar tres testigos?

Cerrar cada una con ADR específico al momento de implementación.

---

## Cierre

Este documento es la traducción del manifiesto al producto. Cada commit que toque módulos cubiertos por la iniciativa Pastoral Fidelity debe poder responder a la pregunta: **"¿qué parte del manifiesto está aterrizando este código?"**.

Si la respuesta es "ninguna" o "no aplica", probablemente el código no pertenece a esta iniciativa.

Si la respuesta es ambigua, el documento está incompleto — extenderlo es parte del trabajo.
