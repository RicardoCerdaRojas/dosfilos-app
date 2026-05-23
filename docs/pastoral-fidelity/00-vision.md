# 00 — Visión y marco bíblico

## El problema que esta iniciativa resuelve

El motor actual de generación de sermones produce contenido competente, citado y exportable. Pero opera sobre un supuesto silencioso: **que el sermón es un artefacto a producir, no un acto a vivir**. Bajo ese supuesto, el flujo natural se convierte en:

```
pasaje → exégesis (IA) → enfoques (IA) → bosquejo (IA) → borrador (IA) → pastor revisa → publica
```

El aporte real del pastor al output final es típicamente 10–30%. Curador, no autor.

El motor de citas (Fases B + C, ya en producción) resuelve un subproblema importante: que las atribuciones existen en la biblioteca del usuario. Pero **NO resuelve** fidelidad claim↔source, NO resuelve cobertura, NO resuelve cherry-picking, y sobre todo NO resuelve autoría. Peor: legitima la delegación porque "está fundamentado".

Esta iniciativa parte del diagnóstico de que el problema no es de motor — es de **propósito**. Sin una reorientación explícita, el motor de citas se convierte en velo, no en virtud.

## Marco bíblico — qué es predicar (no qué es producir sermones)

Cinco anclas que cualquier herramienta seria de predicación debe honrar:

### Esdras 7:10 — orden no negociable

> "Porque Esdras había preparado su corazón para inquirir la ley de Yahweh, **y para hacerla**, y para enseñar en Israel sus estatutos y decretos."

Orden: **estudio → vida → enseñanza**. Invertir el orden no es ineficiencia; es hipocresía estructural. El producto actual permite literalmente que un pastor genere un sermón habiendo leído el pasaje 30 segundos. Esto es una inversión de Esdras 7:10.

### 1 Timoteo 4:13-16 — labor como medio de salvación

> "Ocúpate en estas cosas; permanece en ellas, para que tu aprovechamiento sea manifiesto a todos. Ten cuidado de ti mismo y de la doctrina; persiste en ello, pues haciendo esto, **te salvarás a ti mismo y a los que te oyeren**."

La labor del estudio ES el medio de salvación del pastor y de su congregación. No es overhead delegable. Es el ministerio mismo. Externalizarla tiene costo eterno, no solo eclesiológico.

### Phillips Brooks — predicación como verdad-a-través-de-personalidad

> "Preaching is the communication of truth by man to men. It has in it two essential elements, truth and personality. **Neither of these can it spare and still be preaching.**"
> — *Lectures on Preaching* (Yale, 1877)

Si la personalidad del predicador no atraviesa el contenido, no es predicación — es entrega de información doctrinal correcta. Esta es la **prueba ácida del producto**: ¿lo que sale del sistema es VERDAD-A-TRAVÉS-DE-ESTE-PASTOR o verdad-a-través-de-LLM presentada como suya?

### Hechos 20:27 — todo el consejo

> "Porque no he rehuido anunciaros todo el consejo de Dios."

Anti cherry-picking. El pastor debe haber confrontado el texto entero, incluyendo lo que incomoda, antes de hablar. Un LLM optimiza coherencia narrativa, no comprehensividad teológica. Sin fricción intencional, el sermón será siempre más cómodo que el texto.

### Santiago 3:1 — stakes asimétricos

> "Hermanos míos, no os hagáis maestros muchos de vosotros, sabiendo que recibiremos mayor condenación."

Error desde el púlpito no es bug, es pecado. El producto no puede tratar la generación de sermones como una commodity de productividad.

### Subyacente reformado — predicación como medio de gracia

La tradición reformada (WCF 89, Heidelberg 65, Segunda Helvética cap. 1) trata la predicación como **medio de gracia**. El predicador no es expositor neutral; es instrumento del Espíritu para edificación del cuerpo. Un instrumento que no fue formado por el texto no puede ser canal del texto. La formación del pastor en el estudio ES el proceso por el cual el sermón se vuelve canal, no entrega.

Lloyd-Jones lo dijo en *Preaching and Preachers*: "Preaching is theology coming through a man who is on fire." Logic on fire. La logic la puede aportar un LLM. El fire no.

## Implicación dura

**El sermón no es output. Es testimonio.** Lo que el producto trata como artefacto, la Escritura trata como persona-en-acto. Esta es la fractura que la iniciativa cierra.

## Los tres fallos a distinguir (corrección pastoral)

Cualquier sistema que pretenda formar predicadores debe distinguir tres modos de fallo en la observación pastoral:

1. **Ignorancia inocente** — formación parcial, falta de exposición. Fix: enseñanza paciente, andamiaje.
2. **Ignorancia doctrinal** — el pastor rechaza una doctrina (ej. disciplina eclesial, doctrinas de la gracia, autoridad bíblica) por marco previo. Fix: confrontación con el texto, no imposición de autoridad del sistema.
3. **Intencionalidad** — falso maestro consciente. Fix: el sistema NO debe ser enabler. Pero tampoco puede juzgar corazones. Requiere guardrails (credos ecuménicos) + paper trail + escalación opcional a accountability eclesial.

Diagnóstico estructural: **ninguna IA puede ser obispo**. Pero puede ejercer funciones que históricamente cumplían (a) el texto mismo leído honestamente, (b) la comunidad local de pastores, (c) la confesión histórica, (d) la tradición exegética. La iniciativa instancia esos roles en tres testigos.

Detalle del mecanismo: [01-architecture.md § Tres testigos](./01-architecture.md#tres-testigos).

## Los tres principios no negociables

Toda decisión de diseño en esta iniciativa debe ser auditable contra estos tres principios. Si un feature los viola, el feature se reformula o no se construye.

### P1 — Labor antes que output (Esdras 7:10)

El pastor NO ve borrador hasta haber producido contenido propio mínimo. Sin semilla pastoral verificable, el motor de generación no arranca. Esto es bloqueo duro, no UX opcional.

### P2 — AI desarrolla, no origina (Brooks)

Inversión de roles: cambio de "AI escribe → pastor edita" a "**pastor siembra → AI cultiva**". Cada sección del borrador debe tener linaje rastreable a una semilla del pastor. Si la sección no se puede vincular a una semilla, no se genera.

### P3 — Confrontación obligatoria (Hechos 20:27)

Antes de permitir publish, el sistema fuerza al pastor a engager al menos una voz de la biblioteca que tensione su tesis. No skip. Sin fricción crítica no hay "todo el consejo de Dios".

## La pregunta operativa que define todo

No es "¿cómo mejoro el motor de citas?". Es:

> **¿Acepto que Preach produzca menos sermones por usuario, más lentos, pero genuinamente pastoreados — o sigo optimizando un asistente que escala output sintético con cobertura académica decorativa?**

La iniciativa entera responde la primera opción. Coherente con Brooks, Esdras, la memoria `priorities_repositioning`, y la intuición declarada del fundador.

El motor de citas que ya existe es **prerequisito necesario** para este camino — sin atribución sólida no hay ground-truth para fidelidad. Pero por sí solo también es la coartada perfecta para el segundo. Esta iniciativa fuerza el primero.

## Tradeoffs honestos que esta visión asume

Esta visión cuesta. Aceptarla implica:

- **Conversión inicial baja**. Onboarding friccionado. Algunos pastores migran a alternativas más rápidas. **Bien — esos no son el mercado.**
- **Time-to-sermón sube** de ~30min a ~2h. Sigue siendo 5-10x vs sin herramienta, pero se deja de competir en velocidad pura. Compite en formación.
- **Wizard standalone "genera sermón de cero" se vuelve incompatible**. Degrada a modo demo o se elimina.
- **Pricing puede ajustar al alza**. Si el output es co-autoría real con formación medible, justifica premium.
- **Marketing rebrand**. Stop "sermones en minutos". Start "tu estudio, expandido". Coherente con `feedback_copy_no_proprietary_tms` y `feedback_copy_no_ai_exposure`.

## Métricas que cambian con esta visión

| Antes (fábrica) | Después (formación) |
|---|---|
| Time-to-publish | % verbatim del pastor por sección |
| Sermones generados / mes | Nº chunks contra-posición considerados |
| Steps wizard completados | Nº reescrituras del borrador AI |
| Conversión a publish | Tiempo en pre-captura pastoral (proxy de wrestling) |
| MRR | Auto-reporte trimestral: ¿creciste teológicamente este mes? |

Lo que se mide se refuerza. Las métricas anteriores reforzaban exactamente lo que la visión rechaza.

## Modelo pedagógico operacional

El marco bíblico anterior establece **qué es predicar** y **por qué importa la formación del pastor**. La iniciativa adopta además un **modelo pedagógico operacional** explícito: el [Manifiesto Pedagógico](./05-pedagogy-manifesto.md) del fundador (Ricardo Cerda, profesor de seminario en teología sistemática).

El manifiesto articula cómo se enseña teología desde la exégesis sin imponer autoridad externa al texto:

> **Enseño desde la exégesis para realzar la autoridad del texto siempre.**
> Toda doctrina debe poder ser descubierta por el alumno a través del trabajo exegético responsable, no recibida del profesor, del credo o de la tradición.

Tres aportes del manifiesto a esta visión:

1. **9 pasos del patrón exegético** — estructura operacional que el sistema sigue: pregunta abierta → texto ancla → observaciones exegéticas → convergencia (paralelos + teología bíblica + sistemática) → síntesis doctrinal → diálogo con teología histórica → exégesis confrontativa → aplicación doxológica → transición.
2. **4 patrones pedagógicos** (exegético, metodológico, panorámico, sintético) — diferentes tipos de contenido requieren diferente estructura, sin abandonar el sello del método.
3. **3 niveles de doctrina** (core, distinctive, open-evangelical) — permite distinguir entre límites cristianos absolutos, distintivos confesionales legítimos, y disentimientos evangélicos respetuosos.

La traducción del manifiesto a componentes técnicos vive en [06-pedagogy-applied.md](./06-pedagogy-applied.md). La adopción formal está en [ADR-005](./decisions/ADR-005-exegetical-confessional-pedagogy.md).

## Referencias

- Brooks, P. *Lectures on Preaching*. Yale, 1877.
- Lloyd-Jones, D. M. *Preaching and Preachers*. Zondervan, 1971.
- Confesión de Westminster, capítulo 21 (sobre la adoración religiosa) y Catecismo Mayor preg. 89.
- Confesión de Fe Bautista de 1689, capítulo 22.
- Segunda Confesión Helvética, capítulo 1: "Praedicatio verbi Dei est verbum Dei."
- Bonhoeffer, D. *Worldly Preaching*. Crossroad, 1991 (notas de cátedra Finkenwalde, 1935-37).
- Cerda, R. *Manifiesto Pedagógico — Enseñanza Teológica desde la Exégesis*. Versión 1.0, 2026. ([05-pedagogy-manifesto.md](./05-pedagogy-manifesto.md))
