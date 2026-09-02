# Camino guiado — enseñar el método en vez de entregar el trabajo (Design Doc)

**Estado:** Borrador para discusión. No aprobado, no planificado.
**Origen:** sesión de pruebas del 2026-09-02, al usar la plataforma contra un
trabajo práctico real de seminario sobre Santiago 1:1-5.
**Depende de:** `docs/exegesis/METODOLOGIA.md` (Etapa 1, análisis canónico).

---

## 1 · La oportunidad

Hoy la plataforma produce el análisis y lo entrega terminado. Para un pastor
que prepara su predicación, eso es exactamente lo correcto: el trabajo es
suyo, la herramienta le ahorra el andamiaje.

Para un **alumno de seminario** el mismo comportamiento tiene un problema
serio: entrega un trabajo que no pensó. Y el caso de uso existe, no es
hipotético — la sesión que originó este documento fue un trabajo práctico
semanal con consigna, rúbrica y calificación.

La propuesta no es restringir la herramienta. Es **agregar un modo que
recorra el método con el alumno**, mostrándole cada decisión antes de
resolverla, para que la resuelva él y después compare.

Es la misma distinción que el proyecto ya sostiene para el sermón:
`PASTOR_VOICE_STEPS` marca los pasos donde el texto es voz del pastor y el
agente nunca escribe. **Prohibir GENERAR no es prohibir ACOMPAÑAR.** Este
documento aplica esa distinción al trabajo académico.

---

## 2 · Lo que hace esto barato: el artefacto ya es el ejercicio

La observación central no es pedagógica, es arquitectónica.

`CanonicalVerseAnalysis` no guarda prosa: guarda **decisiones con su
fundamento y sus alternativas descartadas**. Esa forma es, literalmente, un
ejercicio con la respuesta adjunta. Enseñar consiste en retener el
compromiso y revelarlo después.

El caso más claro es `translationCruxes`:

```ts
{
  phrase: "Πᾶσαν χαρὰν",
  description: "…si se refiere a la cantidad, a la variedad o a la calidad",
  options: [
    { translation: "pura alegría",        characterization: "Cualitativa…" },
    { translation: "completa alegría",    characterization: "Adverbial…" },
    { translation: "toda clase de alegría", characterization: "Distributiva…" },
  ],
  commentatorPositions: [ { sourceKey, page, summary, supports } ],
  commitment: { chosen: "pura alegría", rationale: "…πᾶς anartro con…" },
}
```

Todo lo que hay antes de `commitment` es el planteo. `commitment` es la
respuesta. **Separarlos no requiere generar nada nuevo.**

### Mapeo campo por campo

| Campo del análisis | Se muestra | Se retiene | Pregunta al alumno |
|---|---|---|---|
| `greekText` | ✅ | — | — |
| `syntacticAnalysis.mainVerb` | morfología | `interpretiveSignificance` | ¿qué aporta esta forma al sentido? |
| `syntacticAnalysis.keyConstructions` | texto + morfología | `syntacticFunction`, significado | ¿qué función cumple esta construcción? |
| `syntacticAnalysis.discourseParticles` | la partícula | `function`, `note` | ¿qué hace esta partícula en el argumento? |
| `lexicalAnalyses.generalSemanticRange` | ✅ el rango completo | — | — |
| `lexicalAnalyses.verseSpecificLoading` | — | ✅ | del rango, ¿cuál aplica acá y por qué? |
| `textualCriticism.variants` | las lecturas | `adoptedReading`, `rationale` | ¿cuál adoptás y con qué criterio? |
| `commentatorEngagement` | ✅ posturas con página | — | (material para contrastar) |
| `translationCruxes.options` | ✅ | `commitment` | elegí y fundamentá |
| `verseThesis` | — | ✅ | enunciá qué establece el verso |

Dos observaciones sobre el mapeo:

- **`generalSemanticRange` se muestra y `verseSpecificLoading` se retiene.**
  Esa es exactamente la distinción que el Diferenciador 1 de la metodología
  declara como el aporte del sistema: el rango lo da cualquier léxico; la
  carga en *este* verso es el trabajo exegético. Es también la distinción
  que un alumno tiene que aprender a hacer.
- **`commentatorEngagement` se muestra entero.** Consultar fuentes no es
  hacer trampa: es el oficio. Lo que no se muestra es la síntesis.

---

## 3 · El recorrido

Cuatro momentos por decisión, no por versículo. La unidad pedagógica es la
**decisión discutible**, que es como el profesor formula sus preguntas.

**1. Planteo.** Se presenta el texto griego, la morfología de las formas en
juego, y la descripción del problema. Sin insinuar la salida.

**2. Exploración.** El alumno puede consultar el corpus: las posturas de los
comentaristas con su página, el rango semántico, el aparato. Acá el sistema
es una biblioteca con buscador, no un oráculo.

**3. Compromiso del alumno.** Elige entre las opciones y **escribe su
fundamento**. El texto es suyo; el sistema no lo redacta ni lo autocompleta.

**4. Contraste.** Recién ahí se revela el `commitment` del análisis, con su
`rationale`. No como corrección —el alumno puede tener razón— sino como
segunda voz.

El orden importa: revelar antes de que el alumno se comprometa convierte el
ejercicio en lectura.

---

## 4 · Cómo se evalúa la respuesta

Acá está la decisión de diseño más delicada, y conviene ser conservador.

**Lo que se puede evaluar mecánicamente y sin riesgo:**
- Si la opción elegida coincide con la del análisis (dato, no juicio).
- Si el fundamento del alumno **menciona el dato decisivo** — la ausencia de
  artículo en `πᾶσαν`, el artículo único en los participios de 1:5, la
  retoma léxica `λειπόμενοι → λείπεται`. Ese dato está en el análisis y es
  verificable por presencia.
- Si el alumno citó alguna fuente del corpus y si la página existe. El
  verificador de citas ya hace exactamente eso.

**Lo que NO se debe evaluar:** la calidad del razonamiento con una nota.
Un alumno puede elegir la opción minoritaria y argumentarla mejor que el
sistema. Poner un número ahí convierte una herramienta de formación en un
juez que no está calificado para serlo, y contradice el límite declarado
«no reemplaza la formación de seminario».

**Lo que sí conviene**: devolver el contraste y **las preguntas que el
fundamento del alumno deja abiertas**, que es la forma socrática que el
proyecto ya adoptó en ADR-034 para el sermón.

---

## 5 · Encaje arquitectónico

Ninguna pieza nueva en la Etapa 1. El camino guiado es **otro consumidor del
mismo artefacto**, junto al compositor académico y al de sermón:

```
CanonicalVerseAnalysis  ─┬─→  compositor académico   → paper
                         ├─→  compositor de sermón   → sermón
                         └─→  camino guiado          → ejercicio + contraste
```

Eso es literalmente lo que la metodología ya promete: *un análisis riguroso
→ muchas expresiones ministeriales*. La formación es una expresión más.

**Consecuencia de costo:** el análisis se paga una vez. Un alumno que
recorre el camino guiado y después arma su trabajo no paga dos veces el
mismo estudio.

---

## 6 · Lo que este modo NO hace

- **No redacta el fundamento del alumno**, ni siquiera un borrador. Ese
  texto es la evidencia de que pensó.
- **No enseña griego desde cero.** Presupone la formación que el límite
  declarado de la metodología ya establece. Enseña el *método*, no el
  idioma.
- **No certifica ni califica.** Devuelve contraste, no nota.
- **No reemplaza al profesor.** La consigna, la rúbrica y la evaluación
  siguen siendo suyas.

---

## 7 · Dependencias

**Bloqueante y no negociable:** hoy el compositor académico descarta la
mayor parte del análisis canónico al escribir la prosa —sintaxis, partículas
de discurso, cruces de traducción con sus opciones—. Mientras eso siga así,
el camino guiado no tiene de dónde leer: **el ejercicio vive justo en los
campos que el pipeline hoy tira**. Arreglar el render determinista de la
Etapa 2 es prerequisito, y además rinde por sí solo.

**Deseable antes:** que el verificador de citas reconozca los formatos que
el sistema realmente emite, porque el momento 3 del recorrido depende de
poder decirle al alumno si la página que citó existe.

---

## 8 · Preguntas abiertas

- **¿Modo del trabajo o producto aparte?** Un interruptor en el setup del
  paper es lo más barato. Un módulo de formación con su propio progreso es
  más ambicioso y probablemente más vendible a una institución.
- **¿Quién elige qué decisiones se ejercitan?** El análisis puede producir
  ocho cruces en cinco versos; un trabajo semanal usa cuatro. ¿Las elige el
  alumno, el profesor, o el sistema por dificultad?
- **¿El profesor entra al producto?** Si la consigna, la rúbrica y las
  preguntas ya se modelan (`UserAssignmentBrief`, `UserRubric`), un docente
  podría publicar el ejercicio y recibir los recorridos de su curso. Eso
  cambia el modelo de negocio de B2C a B2B institucional.

  **Decisión diferida a propósito (2026-09-02).** El fundador la considera
  interesante y NO la toma todavía: falta ver más ejemplos de estudios
  reales antes de comprometerse. El disparador para retomarla no es una
  fecha sino evidencia — varios trabajos completos, de más de un curso y
  más de un profesor, que muestren si la consigna y la rúbrica se repiten
  lo bastante como para que valga modelar al docente como usuario. Decidir
  antes de tener ese material sería diseñar sobre un solo caso: el que
  originó este documento.
- **¿Qué se persiste del recorrido?** El fundamento escrito por el alumno es
  su trabajo intelectual: dónde vive, quién lo ve, y qué pasa con él si
  cancela la suscripción.

---

## 9 · Evidencia que originó este documento

Durante la sesión del 2026-09-02 se resolvió un trabajo práctico real —cuatro
preguntas gramaticales sobre Santiago 1:1-5— con la plataforma. El análisis
canónico contenía, para cada pregunta, el planteo completo, las opciones en
competencia, las posturas de los comentaristas con su página y el compromiso
razonado.

Ese material salió del sistema **ya con la forma de un ejercicio**. Nadie lo
diseñó para eso: es la consecuencia de haber modelado el método en vez de
modelar el texto. Este documento sólo propone usarlo.
