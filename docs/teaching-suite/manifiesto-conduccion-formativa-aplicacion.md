# Manifiesto de conducción formativa — La aplicación en tres dimensiones

**Versión:** 1.3 · 15-jun-2026
**Posición en el sistema:** dentro del Asistente A (formativo), en el paso de aplicación del Estudio Madre (P5 del riel pasaje, D5 del riel doctrina). Es la conducción que produce el campo `aplicacion` y alimenta `objetivos: { saber, sentir, hacer }` del `TeachingPlan`.
**Qué reemplaza:** es el equivalente riguroso del manejo afectivo que hoy hace el sermón de forma ad-hoc (`InsightStepPolicy` + `doxologicalApplication`). No parchea lo existente — establece el estándar por primera vez y el sermón migra a él.
**Principio rector (no negociable):** el docente produce el afecto, el sistema lo confronta y lo valida. Si el sistema puede declarar el afecto sin que el docente lo haya desprendido del texto, el paso está mal diseñado. Esto es *formamos predicadores fieles, no fabricamos*, aplicado al corazón.

> **Nota de vocabulario:** lo que en specs anteriores se llamó *puerta* (validation gate) aquí se llama **examen** — "examínese cada uno" (1 Co 11:28), "examinadlo todo, retened lo bueno" (1 Ts 5:21). La spec ya quedó alineada en **v1.3.1**; solo resta alinear **byblos** para no arrastrar dos vocabularios. Las facultades son **mente · corazón · conducta**; los objetivos que cada una produce, **saber · sentir · hacer** (mapeo 1:1).

---

## 0. El problema, contado de verdad

Un pastor predica Romanos 5:8. La sala se conmueve. Pero, ¿hacia qué?

Si nadie condujo el afecto desde el texto, el pastor lo *declaró*. Quizás declaró uno fiel. Quizás, porque su iglesia anda fría con las ofrendas, declaró: "siéntete movido a dar más a la obra." Es largo, es sincero, suena espiritual. Y pasa — porque hoy en producción el `doxologicalApplication` solo valida **longitud**.

El texto movió corazones hacia el dios equivocado: el programa de la iglesia. Y ningún examen lo atrapó.

Esa es la grieta. El corazón es la única dimensión donde un sermón puede ser **más conmovedor y menos fiel a la vez** — y es justo la que nunca validamos. La mente la cuidamos con tres testigos. La conducta la cuidamos con la confrontación. El corazón quedó suelto.

Este documento lo cierra. Define cómo se conduce al docente para que el afecto **se desprenda del texto** en vez de declararse, y define el examen que confronta el afecto huérfano con el mismo motor que ya valida lo demás.

---

## 1. Las tres convicciones (el esqueleto)

Todo lo que sigue se deriva de tres convicciones teológicas. No son negociables; son los axiomas del diseño.

1. **El afecto se desprende del texto en su intención autoral.** Lo que el autor bíblico buscaba mover en el corazón de su audiencia original. No se declara, no viene de la reacción del lector moderno, no se inventa.

2. **Las tres dimensiones son una secuencia que hereda.** Informar la mente → instruir el corazón → mover la conducta hacia la piedad. No son casillas paralelas. Cada una se funda en la anterior. Un corazón sin mente es sentimentalismo; una conducta sin corazón es moralismo.

3. **El corazón necesita su propio examen.** Un afecto fuera de la intención del texto es **proof-texting afectivo**, y se confronta con el mismo motor que ya tienes. La fidelidad del corazón se audita, no se asume.

### 1.1 Qué espejan los exámenes (y qué no son)

Los tres exámenes espejan una obra que no es del sistema. La mente recordada a pensar bien, el corazón redargüido cuando la intención no es precisa, la conducta movida a la piedad como fruto de un corazón instruido por una mente sana: esa es obra del Espíritu en el ministro. El sistema **no la hace ni la sustituye** — pone delante del docente las preguntas que lo llevan a depender de ella. Por eso *formamos, no fabricamos*: no reemplazamos al ministro, y menos al Espíritu. El examen es un siervo, no un sustituto.

---

## 2. La secuencia que hereda (el mecanismo)

La proposición exegética es el eje. La mente la produce; el corazón y la conducta heredan de ella.

```
        PROPOSICIÓN EXEGÉTICA
        (lo que el texto afirma en su intención autoral)
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
   cara       cara       cara
 cognitiva  afectiva   volitiva
     │          │          │
   MENTE  →   CORAZÓN  →  CONDUCTA
  (saber)    (sentir)    (hacer)
```

La clave que resuelve el "sentir no tiene de dónde derivar": **la proposición exegética tiene tres caras, no una.** Una cara cognitiva (qué enseña), una afectiva (qué buscaba mover en el corazón), una volitiva (hacia qué conducta empuja). El corazón no busca evidencia nueva en el texto — **extrae la cara afectiva de la proposición que la mente ya cristalizó.**

Por eso la herencia es real y no decorativa:
- El **saber** (mente) sale de la proposición y las observaciones.
- El **sentir** (corazón) sale de la cara afectiva de esa misma proposición — vuelta a anclar en el texto bajo la luz de la idea central.
- El **hacer** (conducta) sale del afecto: la piedad es el afecto en movimiento, no una orden pegada con cinta.

Romper la cadena es nombrable: un `sentir` que no se traza a la proposición es huérfano; un `hacer` que no se funda en un `sentir` validado es moralismo. El examen atrapa ambos.

---

## 3. La conducción, dimensión por dimensión

Tres dimensiones, tres conducciones. La del corazón es la nueva y la que se hace bien; las otras dos se enuncian para cerrar la cadena de herencia.

### 3.1 Mente — objetivo `saber` (breve, ya existe el grueso)

Hereda directo del estudio. La proposición exegética ya está cristalizada (P3/D1–D3). La conducción aquí solo formula el objetivo cognitivo: *al salir, mis alumnos sabrán…*, en contenido verificable, derivado verbatim de la idea central y las observaciones. RAG apagado para generación. Sin novedad de diseño.

### 3.2 Corazón — objetivo `sentir` (el núcleo de este manifiesto)

Cinco pasos. Cada uno con input exigido al docente, modo RAG y la pista de elicitación que el sistema usa para preguntar bien. **Regla transversal: el sistema nunca escribe la afección. Pregunta, confronta, ofrece pistas — la oración afectiva la escribe el docente.** Es la misma prohibición que rige la idea central.

**C1 — Recuperar la proposición.**
El sistema presenta la proposición exegética cristalizada como punto de partida. El corazón no parte de cero: parte de lo que la mente ya estableció.
*Input exigido:* el docente confirma sobre qué proposición va a trabajar el afecto.
*RAG:* apagado. No se trae material nuevo; se trabaja sobre lo ya validado.

> **Requisito duro — qué ES la proposición (toca la convicción 1).** La proposición de la que C1 parte es `idea_central`, y `idea_central` debe ser la **proposición exegética**: lo que el autor afirmó en su intención autoral, *antes* del puente a hoy. **No** una idea homilética ya transpuesta ni una aplicación adelantada. Si fuera homilética, C1 anclaría el afecto a una idea ya aterrizada en el lector moderno — exactamente el "afecto declarado" que la convicción 1 prohíbe. Como el Estudio Madre es neutro al destino, `idea_central` *debe* ser la exegética por construcción.
> **Requisito de interfaz:** la conducción debe **enfatizarle al docente** que lo que escribe en `idea_central` es la afirmación del texto en su intención autoral, no su aplicación para hoy. El puente a la congregación llega después, en C4 — no aquí. Microcopy, ejemplo y contraejemplo en el punto de captura, para que el docente no entre una idea ya transpuesta sin darse cuenta.

**C2 — La cara afectiva en la audiencia original.**
*Input exigido:* el docente responde: *¿qué buscaba mover el autor en el corazón de sus primeros oyentes con esta verdad?*
*RAG:* `contexto` y `testigo` como **candidatos a evaluar**, nunca como el afecto mismo.
*Pista de elicitación (la linterna, no el tesoro):* el sistema pregunta apoyándose en marcadores literarios — ¿hay un imperativo? ¿una doxología? ¿un lamento? ¿el autor expresa su deseo por ellos? ¿qué género es? Los marcadores **ayudan a preguntar**; no son lo que valida el examen. Lo que valida es la proposición.

**C3 — La raíz teocéntrica.**
*Input exigido:* el docente nombra *de qué verdad sobre Dios, revelada en este texto, cuelga este afecto.*
*El sistema confronta:* un afecto que no puede nombrar su raíz en el Dios revelado por el texto es **huérfano**. "Me siento motivado", "esto me da paz" — sin que la paz cuelgue de algo que el texto afirma sobre Dios — no pasa.
*Aclaración clave (criterio de raíz, no de término):* el afecto **no tiene que terminar en Dios.** Puede terminar legítimamente en el creyente — seguridad, contrición, esperanza, temor filial. Lo que se exige es que **su raíz** sea el Dios del texto. En Romanos 5:8, "seguridad de mi salvación" pasa si descansa en que el amor de Dios precede mi dignidad; "asombro ante un amor que ama al enemigo" también pasa. Ambos cuelgan del mismo Dios revelado. El que no cuelga de nada — ese se confronta.

**C4 — El puente a tu congregación.**
El afecto del autor apuntaba a su audiencia. Esa no es la nuestra. El puente tiene dos tramos con libertad desigual:

| Tramo | Pregunta | Libertad del pastor |
|---|---|---|
| Texto → audiencia original | ¿Qué afecto buscaba el autor? | **Cero.** Es cuestión exegética, se valida contra el texto (C2–C3). |
| Audiencia original → tu congregación | ¿Cómo aterriza ese mismo afecto en tu gente? | **Real.** Aquí entra tu conocimiento pastoral que el sistema no tiene. |

*Input exigido:* el docente usa lo que sabe de su gente — su dureza, su quebranto, sus desafíos — para aterrizar el afecto.
*El sistema confronta la continuidad, no la uniformidad:* el pastor es libre en *cómo* aterriza el afecto; no es libre para **sustituirlo**. El fallo a atrapar: el texto busca temor reverente ante la santidad de Dios y el pastor, porque su iglesia anda desanimada, lo traslada como "Dios te acepta como eres." Cambió el afecto. Eso es proof-texting afectivo en el segundo tramo.

> **Input futuro (v1+): la bitácora de la congregación.**
> El segundo tramo del puente vive del conocimiento pastoral, y ese conocimiento es longitudinal: una congregación se mueve en el tiempo. La bitácora es una memoria que el sistema acumula sobre la congregación — sus desafíos, batallas y victorias — para afinar el aterrizaje del afecto y mostrarle al pastor la trayectoria de su gente. Activo de cuidado pastoral, no solo de estudio.
> **Dos candados de diseño, innegociables:**
> 1. *Alimenta el tramo 2, nunca el tramo 1.* La bitácora informa **cómo** aterriza el afecto, jamás **cuál** es (eso sale solo del texto). Si la congregación pudiera definir el afecto, sería la puerta trasera al afecto declarado — lo que la tesis prohíbe. El examen de continuidad sigue mandando.
> 2. *Es dato pastoral sensible.* Guarda quebrantos y batallas de personas reales. Se trata con dignidad de notas de consejería: privado del pastor, scoped, fuera de cualquier insumo de entrenamiento.
> No es MVP. Se asienta aquí para no perderlo.

**C5 — Formulación de la afección.**
*Input exigido:* el docente escribe la afección en una oración, con sus palabras.
*El sistema confronta afección vs. emoción:* lo que se valida es una **afección** — disposición asentada del corazón hacia Dios —, no una emoción transitoria. "Que se emocionen" no es validable ni perdurable. "Que reposen con seguridad filial en un amor que los precede" sí. Si el docente formula una reacción momentánea, el sistema lo devuelve a formular la disposición que esa reacción debería asentar.

→ Sale: elemento `aplicacion` subtipo `corazon`, trazable a la proposición, listo para el examen.

### 3.3 Conducta — objetivo `hacer` (breve, pero cierra la herencia)

*Input exigido:* el docente nombra la conducta piadosa hacia la que el afecto empuja.
*El sistema confronta la herencia:* un `hacer` que no se funda en el `sentir` validado de C5 es moralismo — una orden sin combustible afectivo. El sistema verifica que la conducta sea **el afecto en movimiento**, no un imperativo añadido. RAG apagado para generación.

---

## 4. El examen del corazón

Corre en la cristalización del Estudio Madre, junto a los otros siete exámenes (los que en spec ≤v1.3 se llamaban "siete puertas", ya renombrados en v1.3.1 §8). **No es un motor nuevo: es un colector nuevo sobre el motor único de fidelidad** (el que se generalizó en PR1). El afecto huérfano se confronta con el mismo mecanismo de trazabilidad y testigos que ya valida la doctrina.

Cuatro condiciones, todas verificables contra elementos ya cristalizados:

1. **Trazabilidad.** El afecto (`aplicacion:corazon`) se deriva de la **proposición exegética** cristalizada. Si no se puede trazar a ella → huérfano → se confronta. (Mismo examen de trazabilidad del §8 de la spec, aplicado al corazón.)

2. **Raíz teocéntrica.** El afecto nombra la verdad sobre Dios, revelada en el texto, de la que cuelga. Criterio de **raíz, no de término**: pasa si termina en el creyente o en Dios, siempre que su raíz sea el Dios del pasaje. Rechaza solo el afecto sin raíz.

3. **Continuidad del puente.** El afecto trasladado a la congregación de hoy es **el mismo** que el texto buscaba, no un sustituto conveniente. Valida continuidad, conserva la libertad pastoral en el *cómo*.

4. **Afección, no emoción.** Lo formulado es una disposición asentada, validable y perdurable — no una reacción transitoria. Una emoción del momento no tiene anclaje verificable; se devuelve a formular la afección.

**Soft block / hard block:** el examen usa los mismos umbrales del motor existente (`WITNESS_THRESHOLDS`). El afecto huérfano sin ninguna raíz nombrable es hard block (no cristaliza). El afecto con raíz débil o puente dudoso es soft block (advierte, deja decidir al docente con la objeción registrada en `historial_confrontacion`).

### 4.1 Cómo las cuatro condiciones se mapean al motor único (arquitectura, no teología)

Las cuatro condiciones **no son cuatro cosas del mismo tipo.** Una decide si el afecto *puede* examinarse; las otras tres son testigos. Esta distinción es la que evita forzar cuatro "testigos" artificiales sobre un motor que razona en tres.

**Primero corre un filtro de admisibilidad. Después, los testigos.**

```
afecto formulado (C5)
   │
   ▼
┌─────────────────────────────────────┐
│ FILTRO DE ADMISIBILIDAD (corre antes)│   ¿es una afección asentada,
│  Condición 4: afección, no emoción   │   o una emoción transitoria?
└─────────────────────────────────────┘
   │ si pasa            ✗ si es emoción → ni entra al motor:
   ▼                      no es la clase de cosa que un testigo
┌─────────────────────────────────────┐   pueda respaldar. Se devuelve a C5.
│ EXAMEN POR TESTIGOS (motor único)    │
│  Testigo de contexto — dos ejes:     │
│   · eje textual  → Condición 1       │   ¿el afecto se traza a la
│     (trazabilidad a la proposición)  │   proposición exegética?
│   · eje temporal → Condición 3       │   ¿el afecto de hoy es el mismo
│     (continuidad del puente)         │   que el texto buscaba ayer?
│  Testigo de confesión + contexto:    │
│   · Condición 2 (raíz teocéntrica)   │   ¿la raíz en Dios concuerda
│                                      │   con el texto y la confesión?
└─────────────────────────────────────┘
```

Tres precisiones para la implementación:

- **El filtro de admisibilidad (cond. 4) es binario y previo, no un testigo.** Un testigo confirma una afirmación *contra una fuente externa*; la afección-vs-emoción no contrasta el afecto contra un texto, sino contra la *definición de qué es una afección validable*. Por eso corre antes: lo que no es afección no llega siquiera a examinarse.
- **La continuidad del puente (cond. 3) es el testigo de contexto en el eje temporal**, no una categoría nueva. El contexto de la audiencia original funciona como guarda contra la sustitución del afecto. Reutiliza el colector de contexto del motor único; solo cambia el eje sobre el que pregunta.
- **Los paralelos canónicos no se re-colectan aquí.** El corazón hereda los testigos que la mente ya aceptó para la proposición (P4/D2). No vuelve a buscar paralelos: confía en los que el motor ya validó arriba. La herencia, otra vez, hace el trabajo.

Resultado: el motor sigue razonando en testigos; el afecto entra por un filtro previo y se examina con los colectores que ya existen, reapuntados. Cero motor nuevo, cero testigo forzado.

---

## 5. El handoff a Claude Code

Tres piezas, en este orden.

**Pieza 1 — Subtipar `aplicacion`.**
Hoy `aplicacion` es un campo único. Pasa a llevar `subtipo: mente | corazon | conducta`. Mapeo canónico a `objetivos` (que ya usa `saber/sentir/hacer` desde PR2): **mente→saber, corazón→sentir, conducta→hacer**. Una facultad, un objetivo, puente explícito — sin dos vocabularios sueltos. Additivo y backward-compatible: una `aplicacion` legacy sin subtipo se trata como `sin_auditar`, igual que el estudio sin sobre. Esto desbloquea que `objetivos.{saber,sentir,hacer}` derive verbatim de cada subtipo, no de un campo plano.

**Pieza 2 — Escribir la conducción.**
Implementar C1–C5 (corazón) más las conducciones breves de mente y conducta, como política formativa que reemplaza el manejo ad-hoc del `InsightStepPolicy`. Regla dura heredada: el sistema **no escribe la afección**; ofrece pistas de elicitación (marcadores literarios) y confronta. Cada elemento producido lleva su `autoria` — el afecto cuenta para la métrica de autoría como cualquier otro elemento. **Requisito de interfaz en C1:** el punto de captura de `idea_central` debe dejarle claro al docente —con microcopy, ejemplo y contraejemplo— que ahí va la proposición **exegética** (intención autoral), no una idea homilética ya transpuesta. El puente a hoy es C4, no C1.

**Pieza 3 — El examen del corazón + reparar la grieta de producción.**
Implementar el examen (§4) sobre el motor único, siguiendo la arquitectura de §4.1: la condición 4 (afección vs. emoción) como **filtro de admisibilidad binario que corre antes**; las condiciones 1, 2 y 3 como testigos sobre los colectores existentes (contexto reapuntado al eje textual y al temporal; confesión + contexto para la raíz). Nada de motor nuevo ni de cuarto testigo forzado. Y enrutar el `doxologicalApplication` del sermón **a través de este examen**, retirando la validación-solo-por-longitud. Ese es el cierre de la grieta: el sermón en producción deja de permitir afecto declarable sin validar.

**Tarea de consistencia (no código):** la spec ya quedó alineada *puerta → examen* en v1.3.1. Resta alinear el mismo vocabulario en **byblos**, para que no convivan dos términos para el mismo mecanismo.

**Reglas duras que se conservan:** no se toca el pipeline determinista JSON→HTML ni `validatePlan`. Todo es upstream del markdown. El examen vive en la cristalización del Estudio Madre, no en la generación de artefactos — así el afecto validado se hereda a sermón, clase, devocional y todo lo que derive.

---

## 6. Lo que este manifiesto protege

1. **El afecto se desprende del texto; no se declara.** La proposición exegética es su única evidencia válida; los marcadores literarios solo ayudan a preguntar.
2. **La secuencia hereda de verdad.** Mente funda corazón, corazón funda conducta. La cadena rota es nombrable y se confronta.
3. **El examen valida raíz, no término.** El afecto puede terminar en el creyente; lo que se exige es que cuelgue del Dios del texto. Solo el huérfano se rechaza.
4. **La libertad pastoral es real pero acotada.** El pastor es libre en cómo el afecto aterriza en su gente; no es libre para sustituir el afecto del texto. El examen valida continuidad, no uniformidad.
5. **Un solo motor de fidelidad.** El corazón se audita con el mismo motor que la doctrina. El proof-texting afectivo se confronta como el proof-texting doctrinal.
6. **El examen sirve, no sustituye.** Espeja la obra del Espíritu en el ministro; no la reemplaza. *Formamos, no fabricamos* — ni al ministro, ni su dependencia de Dios.
7. **La grieta del sermón se cierra.** El afecto declarable sin validar deja de existir en producción.
