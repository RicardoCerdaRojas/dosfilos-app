# ADR-037 — Redacción socrática por elementos, y autoría medida por procedencia de ideas

## Estado

`accepted`

## Fecha

2026-08-24

## Contexto

Fase 4 sub-feature 1 especificaba un *authorship verbatim tracker*: "diff entre draft AI y final del pastor por sección; badge visible; gate publish ≥50% verbatim".

Al implementarlo (2026-08-24) aparecieron dos problemas, uno detrás del otro.

### Problema 1 — la spec no definía de quién era el "verbatim"

"Verbatim" admite dos lecturas opuestas: texto que quedó **intacto de la IA** (malo) o texto que es **del pastor** (bueno). El fundador resolvió: se mide lo que es suyo, con referencia en la última generación, y el gate confronta sin bloquear.

### Problema 2 — medir palabras no es medir autoría

Con esa decisión aplicada, un sermón recién generado marcó **0% tuyo**. La causa no era un bug: era que el diff medía el final contra **todo** lo generado, asumiendo que el borrador no contenía nada del pastor.

Esa suposición era cierta cuando se escribió la fase. Dejó de serlo el mismo día: el generador ahora **transcribe** material del pastor por instrucción explícita — su ilustración del paso 8 verbatim, sus aplicaciones por punto, sus directivas de énfasis, su proposición y los títulos de sus puntos (ensamblados palabra por palabra desde el bosquejo).

Se corrigió rastreando el material del pastor. El número subió a **18%** — y ahí quedó a la vista el problema real.

### El diagnóstico de fondo

18% era aritméticamente correcto. El material del pastor son unos cientos de palabras; el sermón, varios miles. Aunque el generador transcriba todo lo suyo sin perder una coma, no puede pasar de ~20%.

Dos consecuencias:

1. **El piso de 50% es inalcanzable.** Un umbral que nadie puede cumplir hace que la puerta se dispare siempre, y una puerta que siempre se dispara se aprende a saltar sin leerla. Es el mismo modo de fallo del aviso de `RESEND_API_KEY`, que gritaba en todas las funciones y por eso no señalaba en ninguna.

2. **Se estaba midiendo el eje equivocado.** P2 dice "la IA desarrolla, no origina". **Originar** es tener la idea; **desarrollar** es redactarla. Medir palabras mide *desarrollo* — y castiga exactamente aquello en lo que la IA debe ayudar. Si el pastor decide que el contexto histórico debe hablar de la crueldad asiria y la IA lo redacta bien, la idea es suya aunque no escribiera una palabra.

## Decisión

Dos cambios que son **uno solo**, porque el segundo no es medible sin el primero.

### 1. La redacción pasa a ser un flujo socrático por ELEMENTOS

En vez de generar el sermón completo y editarlo, cada sección se construye decidiendo un conjunto acotado de **elementos** (3-7): los conceptos que esa sección debe contener.

Para cada sección el acompañante ofrece dos caminos:

- **"Yo te digo qué quiero"** — el pastor escribe sus elementos.
- **"Propónme y elijo"** — la IA propone; el pastor acepta, edita, descarta o agrega.

La IA redacta la prosa **desde los elementos decididos**, no desde cero. Eso además acota su margen de invención: escribe desde una lista aprobada.

#### Qué es un elemento

> Un **elemento** es una **idea decidible**: una afirmación o imagen que **podría
> ser otra** y que cambia el sermón si cambia.

No es un párrafo ni un campo del esquema. La prueba operativa:

> ¿Podría un pastor competente elegir distinto y seguir siendo fiel al texto?

Si sí, es elemento. Si no —porque lo determina el texto, o porque ya se decidió
río arriba— no lo es, y preguntarlo es fricción sin contenido.

De ahí salen cuatro estados, y sólo el primero se pregunta:

| Estado | Significado |
|---|---|
| **◆ Elemento** | Lo decide el pastor, o elige entre propuestas |
| **✓ Ya suyo** | Viene del estudio o la homilética: se MUESTRA, no se pregunta |
| **~ Prosa** | La IA redacta desde los elementos; no hay decisión que tomar |
| **⚙ Verificado** | Se calcula o se valida (referencias, anclas de cita); no se opina |

#### El mapa aplicado a un sermón real

Sobre el sermón de Jonás 1:1-3 del fundador — narrativa, pasaje que abre libro.

**Introducción**

| | Sección | Elementos |
|---|---|---|
| ✓ | Ilustración de Apertura | Suya, del paso 8 |
| ◆ | └ puente al texto | **1** — cómo enlaza con el pasaje |
| ◆ | El Libro de un Vistazo | **2-3** de: autor y época · qué otro pasaje habla del libro · divisiones · contemporáneos · lugar en la metanarrativa |
| ◆ | Contexto Histórico | **2-4** — qué hechos importan *para este sermón* |
| ◆ | Conexión Actual | **1-3** — su conocimiento de la congregación es insustituible |
| ✓ | Proposición y puntos | Decididos en homilética |

**Cada punto**

| | Componente | Elementos |
|---|---|---|
| ◆ | Exposición | **2-4** — las afirmaciones exegéticas del punto |
| ✓ | └ sus directivas | Énfasis y notas ya escritas |
| ✓ | Palabras clave | Paso 4 + análisis cacheado |
| ◆ | Referencias cruzadas | **2-3** — ver los tres caminos más abajo |
| ◆ | Ilustración del punto | **1** |
| ✓ | Aplicación | Suya, por punto |
| ⚙ | Cita de autoridad | Se recupera de la biblioteca y se ancla |
| ~ | Transición | La proposición se ensambla verbatim |
| ◆ | Nota exegética | **0-1** — SÓLO si ninguna directiva la cubre |

**Cierre**

| | Sección | Elementos |
|---|---|---|
| ~ | Resumen | Se deriva de los puntos |
| ◆ | Llamado final / cristocéntrico | **1-2** — decisión teológica mayor |
| ✓ | └ aplicación doxológica | Suya, del paso 8 |
| ◆ | Llamado a la acción | **1-3** — pasos concretos |
| ◆ | Título | **1** — al final, propone 3 y elige |

Total para un sermón de dos puntos: **~26 decisiones**. Ocho en la introducción,
seis por punto, cinco en el cierre.

#### La nota exegética es elemento SÓLO si ninguna directiva la cubre

Caso real: la nota sobre "y pagando su pasaje" salió de una directiva del pastor,
así que ya era suya. Preguntarla habría sido re-preguntar lo decidido.

Regla: si el punto trae nota exegética en su `pastorDirective`, se muestra como
suya. Si no, se pregunta.

#### Referencias cruzadas: tres caminos, uno de ellos invierte la recuperación

| Camino | Procedencia |
|---|---|
| El pastor escribe la referencia | `pastor` |
| **El pastor DESCRIBE el versículo y el motor lo busca** | `pastor` |
| Elige entre las que el motor propuso | `elegido` |

El segundo camino es el importante y salió del fundador: *"citemos el versículo
donde Jeremías dice que la palabra es como martillo que rompe la peña"*.

Invierte la recuperación: en vez de "la IA propone y tú eliges", es **el pastor
sabe lo que quiere y la IA lo encuentra**. Es P2 en su forma más limpia — él
origina, la máquina sirve. Y produce naturalmente la procedencia más alta.

**SALVAGUARDA NO NEGOCIABLE**: el modelo puede recordar mal una referencia. El
flujo es `describe → el motor propone la referencia → el sistema trae el TEXTO
REAL desde la Biblia → el pastor confirma`. **Nunca se acepta una referencia sin
mostrar su texto real.** Si el modelo se equivoca de capítulo, se ve al instante
en vez de descubrirse en el púlpito.

El validador determinista (`checkCrossReferences`) sigue detrás en los tres
caminos: que crucen a otro libro, que no repitan el pasaje predicado.

#### Granularidad por SECCIÓN, no por sermón, y sin pantalla previa

Veintiséis decisiones es mucho un sábado por la noche. La fricción es el riesgo
real de este diseño, no un detalle de UI.

El pastor arranca en **modo sección** —los 2-4 elementos de una sección juntos,
~8 paradas— y cualquier sección ofrece **"trabajar en detalle"** para abrirla
elemento por elemento.

Se descartó una pantalla inicial que eligiera el modo para todo el sermón:

- Pide decidir **a ciegas**: nadie sabe cómo se siente el modo granular hasta
  estar dentro. Es fricción antes de la fricción.
- **Un sermón no es homogéneo.** El Punto II puede merecer las seis decisiones
  una por una y el vistazo al libro no. Un interruptor global impone una sola
  velocidad.
- La elección por sección es **reversible**: se abre, no aporta, se cierra.

Encaja además con un precedente del propio producto: `EXPERT_MODE_UNLOCK_THRESHOLD`
establece que los atajos **se ganan demostrando trabajo**, no se autodeclaran en
un formulario. La profundidad se decide sobre el material.

#### La salida por sección entrega elementos, NO prosa

Si "genérame esta sección" produjera prosa terminada, la procedencia quedaría sin buena respuesta: si editarla la vuelve del pastor, la medición se burla sola (cambiar una palabra reclama la autoría de un párrafo que no pensó); si no, editar deja de servir y nadie edita.

Manteniendo la salida al nivel de elementos, la procedencia se registra **donde de verdad ocurre la decisión**. Beneficio adicional: elegir entre opciones y descartar una es formativo; recibir un párrafo hecho, no.

### 2. La autoría se mide por PROCEDENCIA DE IDEAS

Cada elemento lleva su origen:

| Origen | Significado |
|---|---|
| `pastor` | Lo escribió él |
| `elegido` | La IA propuso, él aceptó tal cual |
| `editado` | La IA propuso, él la reformuló |
| `descartado` | La propuso y él la sacó — también es juicio, y se registra |

`elegido` **no se funde** con `pastor`: elegir es juicio, no origen. Fundirlos inflaría el número.

## Reglas de diseño que acompañan la decisión

### Orden inverso: cuerpo → conclusión → introducción → título

No es convención de ensayo, es homilética. La introducción existe para crear la necesidad de *este* sermón: escrita primero sale genérica, escrita al final sabe a dónde lleva. La conclusión necesita el arco del cuerpo para cerrarlo.

Y toca directamente la autoría: **empezar por los puntos hace que la exégesis del pastor gobierne todo lo demás**, en vez de derivar del primer intento del motor.

El **título va al final** porque nombra lo que existe. Hoy se genera primero y deriva: con idea central "El Dios que se revela a todas las naciones y la rebeldía de su profeta", el título salió "El Dios que se revela y la rebeldía del profeta" — perdió el eje del libro.

**Excepción: la ilustración de apertura.** Se escribe en el paso 8, antes de que existan los puntos, y eso es deliberado (decisión del fundador, 2026-08-23: "en ese momento no estoy pensando en los puntos homiléticos"). Queda reservada desde el inicio; la introducción se arma alrededor de ella.

### El recorrido se deriva del género y de las entradas del pastor

No hay lista fija de secciones. Salen de `GENRE_SERMON_STRUCTURE` (narrativa y epístola tienen movimientos distintos) y de condicionales ya implementados: la Ilustración de Apertura sólo existe si hay anécdota en el paso 8; El Libro de un Vistazo, sólo si el pasaje abre el libro (`opensBook`).

### No volver a preguntar lo ya decidido

Al llegar a un punto, la aplicación ya está escrita en homilética, las directivas de énfasis ya existen, la ilustración de apertura ya está. El acompañante **muestra eso como suyo y pregunta sólo por los huecos**.

Un flujo que re-pregunta lo ya trabajado se abandona en la tercera sección. Es el "modelo de cobertura" de ADR-025 aplicado a la redacción.

### Interfaz: una pregunta a la vez, sin panel de chat

El riesgo de un flujo socrático es degenerar en un muro de conversación. La metáfora correcta no es "chat" sino **editor enfocado con una pregunta arriba**. Esta pantalla NO lleva el panel de chat que hoy vive a la derecha del borrador: compite por atención con la pregunta.

### Mapa lateral expandible

Es lo que vuelve tolerable el orden no secuencial: sin él, empezar por el cuerpo desorienta. Expandible para ver, dentro de cada punto, qué elementos están listos, cuáles pendientes y en cuál se trabaja — lo que además resuelve la navegación.

**Completitud: numérica** ("4 de 6 elementos") — es un hecho y responde cuánto falta.

**Autoría: cualitativa por sección, nunca porcentaje por elemento.** Precedente directo en el propio producto: `StudyDepthBadge` (Fase 2.5) documenta *"anti-gamification: shows ONLY qualitative coverage, never a number/streak/leaderboard"*. La razón aplica más fuerte acá — un porcentaje visible mientras se trabaja invita a inflarlo con elementos vacíos, y se consigue una métrica bonita a cambio de nada. El número agregado se muestra **al cerrar**, cuando ya no puede alterar la conducta.

Dentro de un punto expandido, los elementos muestran **sólo estado** (listo / pendiente / en curso). Textura de autoría por elemento volvería el mapa el ruido que se quiere evitar.

### "Generar todo" sobrevive como salida de emergencia

Un pastor un sábado a las 23:00 necesita un sermón. Si el flujo guiado es el único camino, lo abandona. El camino de generación completa se mantiene, con la consecuencia honesta de que la autoría queda baja y el sermón lo dice.

## Consecuencias

### Lo que se cae

La implementación por palabras queda en la rama `spike/autoria-por-palabras`,
**deliberadamente sin mergear**, como referencia de lo que se probó y por qué no
sirvió. No se borra para que quien pregunte "¿por qué no medimos autoría por
palabras?" encuentre el código además del razonamiento; no se mergea para que
nadie lo resucite por accidente.

**`computeAuthorship` por palabras NO se publica como "Autoría".** Mide el eje equivocado. Publicarlo ahora y cambiarle el significado después enseñaría al pastor a desconfiar del indicador — y un número en el que no confía es peor que ninguno.

Puede sobrevivir como señal secundaria ("cuánto reescribiste"), con esa etiqueta y sin gate.

### Lo que se reusa

- `StepCompanion` + callable `orientStudy` (Fase 2.5): acompañante que verifica y orienta sin escribir por el pastor. Ya probado sobre los ocho pasos.
- Contrato socrático de ADR-034 (`SocraticTurn`, `StepPolicyRegistry`, afirma + enruta dudas + nudge).
- `GENRE_SERMON_STRUCTURE`, `opensBook`, `sermonSectionTexts`, el historial durable de versiones y el modal de confrontación.

### Lo que queda abierto

1. ~~**¿Qué es un "elemento"?**~~ **RESUELTA** (2026-08-24) — definición, prueba operativa, los cuatro estados y el mapa por sección quedaron arriba. El fundador validó el marcado: "coincide con mi honestidad intelectual acerca de la responsabilidad del pastor y del espíritu del producto".
2. ~~**¿El gate de publicación usa procedencia? ¿Con qué piso?**~~ **RESUELTA** (2026-08-24, spike) — **no hay piso**, y la métrica no es un nivel. El fundador, al ver su primera sección (cuatro elementos, todos elegidos): *"al inicio hay mucho de selección y con el tiempo y la experiencia eso debería ir cambiando de dirección hacia mis propias ideas"*.

   Eso reencuadra la medición: el porcentaje de una sección aislada no significa nada, porque **un pastor que empieza SELECCIONA mucho — y seleccionar es el mecanismo por el que se forma**. Lo que significa algo es la TRAYECTORIA a través de muchos sermones. Un piso castigaría exactamente al pastor que la herramienta existe para formar, y lo empujaría a escribir cualquier cosa propia para pasar el umbral: peor sermón y peor formación.

   Consecuencia inmediata: la sección **se describe, no se puntúa** (`describeSectionAuthorship` → `vacia | propia | mixta | seleccionada`). Mismo precedente anti-gamificación que `StudyDepthBadge`. La lectura de trayectoria queda pendiente de que exista historia entre sermones.

3. ~~**¿Los sermones existentes?**~~ **RESUELTA** (2026-08-24) — quedan como **legacy**: no se migran ni se les inventan elementos. Pero **regenerar entra por el pipeline nuevo**. Decisión del fundador: *"si yo como pastor voy a un sermón con estudio ya hecho y quiero rehacer una nueva versión, debería entrar por el pipeline que estamos construyendo"*.

   El razonamiento: regenerar ES rehacer la decisión. Una versión nueva que se salta el flujo socrático es justamente la que no debería existir — si el pipeline existe para que las ideas sean del pastor, dejarle una puerta de atrás que produce el mismo artefacto sin decisiones vacía el pipeline por el uso, no por el diseño.

   **TRAMPA A EVITAR, y es la mitad importante de esta decisión:** un sermón legacy no tiene elementos, y "sin elementos" NO es lo mismo que "todo elegido". Si la vista de un sermón legacy cae en el estado `seleccionada`, la app le dice a un pastor con noventa sermones propios que ninguna idea es suya — una acusación falsa, y falsa por ausencia de datos, no por medición. Hace falta un estado **`sin medir`** a nivel de sermón, distinto de las cuatro formas de sección. La ausencia de dato no es evidencia de cero.

4. ~~**Costo de LLM**~~ **RESUELTA** (2026-08-24, medición real en `llmUsageDaily`) — **no es un bloqueador**. Una llamada de propuesta: 566 in + 476 out = **$0,00136**. Una generación completa de borrador: **$0,017** — doce veces más.

   Honestidad sobre la extrapolación: el spike pasa poco contexto (proposición y puntos). La implementación real agrega exégesis y semilla pastoral, así que la entrada sube a ~2-4k por llamada. Con ~14 secciones y contando segundas propuestas, la cuenta realista queda en **$0,03–0,08 por sermón: dos a cuatro veces una generación de un tirón**. Se paga entre dos y cuatro veces por un sermón cuyas ideas son rastreables, en vez de uno sin costuras.

5. **NUEVA (2026-08-24, spike) — las DIRECTIVAS no son elementos.** Puesto frente al campo, lo primero que el fundador escribió fue `Autor / Fecha del libro / Período histórico con años`. Eso no son ideas decidibles: son **temas a cubrir**. El contenido que los llena (Jonás hijo de Amitai, 2 Reyes 14:25, Jeroboam II, siglo VIII a.C.) no admite alternativa, así que no pasa la prueba operativa del elemento.

   Y es revelador que fuera lo primero que salió: la pantalla asumía aporte de CONTENIDO; él aportó ESTRUCTURA.

   Decidido: la directiva es un **tipo propio de aporte** — se registra como suya la *decisión de cobertura*, y el contenido que la llena entra como `elegido`. Enlaza con el mecanismo de directivas del bosquejo (`applyPastorDirectives`). Pendiente: el sistema debe distinguir tema de afirmación **sin pedirle al pastor que clasifique nada** — él sigue escribiendo como escribe.

## Alternativas consideradas

**Bajar el piso a 25-30%** y mantener la medición por palabras. Rechazada: el número saldría de una estimación, no de datos, y seguiría midiendo desarrollo en vez de origen.

**Renombrar la métrica a "editado"**, dejando la aritmética. Honesta y barata, pero pierde el punto: el gate exigiría ediciones, que no es lo que P2 pide. Un pastor con un estudio impecable que no necesita editar quedaría en 0%.

**Dos números separados** ("tu material" / "tus ediciones"). Descartada por ruido: dos cifras en una barra ya apretada, y el gate tendría que elegir una igual.

## Referencias

- [ADR-025](./ADR-025-study-companion-unified-model.md) — un Acompañante, modelo de cobertura, tres momentos.
- [ADR-027](./ADR-027-override-and-expert-mode-policy.md) — confronta, no bloquea.
- [ADR-033](./ADR-033-contra-scan-independent-confrontation-step.md) — paso de confrontación independiente; precedente de gate soft con nota + override auditado.
- [ADR-034](./ADR-034-socratic-feedback-contract.md) — contrato socrático.
- [phase-4](../phases/phase-4-authorship-contrascan-voice.md) — sub-feature 1, re-scopeada por este ADR.
