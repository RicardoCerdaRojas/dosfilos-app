# Metodología Exegética y Arquitectura del Estudio Canónico

**Plataforma:** Preach (DosFilos)
**Módulo:** Exégesis
**Versión:** 1.0
**Fecha:** Mayo 2026

---

## Resumen ejecutivo

Este documento articula la metodología exegética que implementa el módulo de Exégesis de Preach y la arquitectura que la sostiene. Dos premisas lo guían:

1. **El método.** Adoptamos el método **histórico-gramatical-literal** consensuado en seminarios evangélicos rigurosos (TMS, DTS, Westminster, Southern). No proponemos una hermenéutica nueva. Implementamos la disciplina con fidelidad operacional, anclados en autoridades académicas reconocidas.

2. **La arquitectura.** El análisis exegético de un pasaje se construye una sola vez como **artefacto canónico de conocimiento estructurado** (no como prosa libre) y luego se compone hacia múltiples formatos: paper académico, sermón expositivo, devocional, guía de estudio. Un análisis riguroso, múltiples expresiones ministeriales.

Este documento sirve tres audiencias:

- **Equipo interno** — guía de diseño, decisiones técnicas y guardrails metodológicos
- **Educativa** — material formativo para estudiantes y pastores que adopten la plataforma
- **Marketing** — fundamento académico para presentar el producto a seminarios e iglesias

---

## 1. El problema que resolvemos

La proliferación de herramientas de inteligencia artificial aplicadas al estudio bíblico ha producido tres patologías:

**Patología 1: Hermenéutica devocional disfrazada de exégesis.** Modelos de propósito general producen "análisis bíblico" que en realidad es paráfrasis devocional + cita ocasional. Sin fundamento gramatical-sintáctico, sin engagement crítico con fuentes, sin posición exegética defendible. El estudiante recibe la apariencia de rigor sin el rigor.

**Patología 2: Recuperación de fragmentos sin metodología.** Las herramientas tipo RAG (incluido NotebookLM y similares) recuperan fragmentos relevantes de documentos pero no implementan ningún método exegético. El usuario recibe citas yuxtapuestas sin que ninguna disciplina académica gobierne cómo interactúan, qué pesa más, qué decisión de traducción se toma, ni por qué.

**Patología 3: Prosa académica sin estructura analítica subyacente.** Algunas herramientas producen prosa que parece académica pero no se sostiene en un análisis verificable. La morfología, la sintaxis, las decisiones léxicas y los compromisos de traducción quedan implícitos en el texto, sin posibilidad de auditoría ni reuso.

**Lo que el estudiante de seminario y el pastor formado realmente necesitan:**

- Un método exegético explícito, anclado en autoridades académicas
- Análisis gramatical-sintáctico-léxico verificable y auditable
- Diálogo crítico real con comentaristas (no solo citas)
- Decisiones de traducción defendibles, derivadas del análisis
- Capacidad de transformar el análisis en distintos formatos ministeriales sin perder rigor

Preach implementa precisamente esto.

---

## 2. Fundamento metodológico

### El método histórico-gramatical-literal

El método operacional que implementamos se conoce como **histórico-gramatical-literal**. Es el estándar consensuado en la tradición exegética evangélica reformada y baptista, articulado en seminarios como The Master's Seminary, Dallas Theological Seminary, Westminster Theological Seminary y Southern Baptist Theological Seminary.

Sus referentes operacionales canónicos incluyen:

- **Gordon Fee**, *New Testament Exegesis: A Handbook for Students and Pastors* (Westminster John Knox, 3ra ed., 2002)
- **Walter Kaiser**, *Toward an Exegetical Theology* (Baker, 1981)
- **Daniel Wallace**, *Greek Grammar Beyond the Basics* (Zondervan, 1996)
- **Klein, Blomberg & Hubbard**, *Introduction to Biblical Interpretation* (Zondervan, 3ra ed., 2017)
- **D. A. Carson**, *Exegetical Fallacies* (Baker, 2da ed., 1996)

### Cinco compromisos no-negociables

El método opera bajo cinco compromisos que la plataforma respeta sin excepción:

**1. La intención del autor humano (inspirado por el Espíritu Santo) es el locus del significado.**
Rechazamos hermenéuticas centradas en el lector, en la tradición eclesial sola, o en lecturas meramente reactivas. El sentido del texto es el sentido que el autor inspirado quiso comunicar a su audiencia original.

**2. El análisis gramatical-sintáctico-léxico fundamenta toda interpretación.**
La intuición devocional, por sincera que sea, no es exégesis. Las afirmaciones interpretativas deben sostenerse en datos verificables del texto en su lengua original.

**3. El contexto histórico-cultural informa el sentido original.**
Las costumbres greco-romanas, el judaísmo del Segundo Templo, la geografía y la política del primer siglo dan forma al sentido. Pero estos elementos *informan* el texto, no se *imponen* sobre él.

**4. La teología emerge del texto, no se impone sobre él.**
La exégesis precede a la teología sistemática. Una doctrina sistemática puede iluminar la lectura, pero no puede dictar el sentido del verso. Cuando hay tensión, el texto gana.

**5. *Scripture interprets Scripture* (analogía de la fe).**
Pasajes claros iluminan pasajes oscuros — pero solo después de agotar el análisis del texto inmediato. La intertextualidad es paso final, no atajo inicial.

---

## 3. Los once pasos canónicos del análisis verso a verso

El análisis se organiza en seis capas operativas, totalizando once pasos. Cada paso responde a una pregunta concreta y se ancla en autoridades académicas explícitas.

### Capa 1 — Establecer el texto

**Paso 1: Crítica textual.** *¿Cuál es el texto?*
Base: Nestle-Aland 28 (NA28) / UBS5. Cuando hay variantes manuscritas significativas, se documentan los testigos a favor y en contra (papiros, mayúsculos, minúsculos), se adopta una lectura y se justifica la decisión.
**Autoridad:** Bruce Metzger, *A Textual Commentary on the Greek New Testament* (UBS, 2da ed.); Philip Comfort & David Barrett, *The Text of the Earliest New Testament Greek Manuscripts*.

### Capa 2 — Análisis lingüístico

**Paso 2: Análisis sintáctico.** *¿Qué hace cada palabra y frase?*
Identificación del verbo principal, cláusulas subordinadas y sus tipos (relativas, condicionales, causales, finales), participios y su función (circunstancial-temporal, modal, instrumental, atributivo), frases preposicionales con matiz por preposición + caso, genitivos según las categorías de Wallace (subjetivo, objetivo, posesivo, descriptivo, partitivo, etc.).
**Autoridad:** Daniel Wallace, *Greek Grammar Beyond the Basics*; BDF (*Blass-Debrunner-Funk*); A. T. Robertson, *A Grammar of the Greek New Testament*.

**Paso 3: Análisis morfológico.** *¿Qué forma tiene cada palabra clave?*
Parsing de formas relevantes (caso/género/número, tiempo/voz/modo/persona). Aspecto verbal (Porter, Fanning) cuando es interpretativamente relevante.
**Autoridad:** BDAG (*A Greek-English Lexicon of the New Testament and Other Early Christian Literature*, Bauer-Danker-Arndt-Gingrich, 3ra ed.); BDF; Wallace.

**Paso 4: Análisis léxico-semántico.** *¿Qué significa cada término clave?*
Lemma, rango semántico general (con fuentes), y carga específica del término en este verso (cómo el contexto inmediato selecciona del rango). Salvaguardas contra falacias léxicas: etimología ilegítima, totalidad transferida, anacronismo semántico.
**Autoridad:** BDAG; Liddell-Scott-Jones (LSJ); Louw & Nida, *Greek-English Lexicon Based on Semantic Domains*; Kittel-Friedrich, TDNT; Silva, NIDNTTE; Carson, *Exegetical Fallacies*.

**Paso 5: Partículas discursivas.** *¿Cómo conecta el argumento?*
Análisis de δέ, γάρ, οὖν, μέν…δέ, καί, ἀλλά, ὅτι y otras partículas discursivas con su función argumentativa específica en el verso. Frecuentemente subestimado en análisis tradicionales, crítico para flujo argumentativo.
**Autoridad:** Stephen Levinsohn, *Discourse Features of New Testament Greek*; Steven Runge, *Discourse Grammar of the Greek New Testament*.

### Capa 3 — Contexto hermenéutico

**Paso 6: Rol argumentativo en la pericopa.** *¿Qué hace este verso en el flujo del pasaje?*
Función específica del verso: ¿establece tesis? ¿desarrolla? ¿contrasta? ¿ejemplifica? ¿transiciona? ¿concluye? Conexión con el verso anterior y siguiente vía partículas discursivas y estructura.
**Autoridad:** Runge; Cotterell & Turner, *Linguistics and Biblical Interpretation*.

**Paso 7: Trasfondo histórico-cultural.** *¿Qué contexto extra-textual lo informa?*
Costumbres greco-romanas, judaísmo del Segundo Templo, geografía, política, dinámicas sociales del honor/vergüenza. Solo cuando el verso lo demanda — no por completitud, no por agregar color.
**Autoridad:** David deSilva, *Honor, Patronage, Kinship & Purity*; Craig Keener, *IVP Bible Background Commentary*; *Anchor Bible Dictionary*.

**Paso 8: Intertextualidad con el Antiguo Testamento.** *¿Hay resonancias canónicas?*
Citas explícitas (con fórmula de cita: γέγραπται, καθὼς εἴρηται), alusiones (sin fórmula pero con vocabulario/concepto identificable), ecos (resonancias temáticas más sutiles). Cada categoría con criterios distintos de identificación.
**Autoridad:** G. K. Beale & D. A. Carson (eds.), *Commentary on the New Testament Use of the Old Testament*; Richard Hays, *Echoes of Scripture in the Letters of Paul*.

### Capa 4 — Diálogo con la tradición exegética

**Paso 9: Interacción con comentaristas.** *¿Qué dicen los expertos?*
Engagement crítico real con comentaristas — no solo cita pasiva. La plataforma implementa una estrategia dialéctica: cada paso engancha al menos un **comentario expositivo** (lectura base, NICOT/NICNT, BECNT, Pillar), uno **crítico-técnico** (otra voz, WBC, NIGTC, Hermeneia, ICC) y, cuando aplique, una fuente **técnica** (léxico, gramática o aparato crítico). Esta dialéctica es nuestro estándar mínimo de pluralidad.

### Capa 5 — Decisiones de traducción

**Paso 10: Cruces de traducción.** *¿Dónde hay decisión real, y qué se decide?*
Identificación de cada punto contestado en el verso, las opciones disponibles, las posiciones de comentaristas mayores, y un **compromiso justificado** con una traducción específica derivado del análisis previo. La traducción no es un ejercicio aislado: es la conclusión del análisis exegético precedente.
**Autoridad:** Beekman & Callow, *Translating the Word of God*; Carson, *The Inclusive Language Debate*.

### Capa 6 — Síntesis

**Paso 11: Tesis del verso.** *¿Qué establece este verso específicamente?*
Una a tres oraciones que articulan el aporte único del verso al argumento de la pericopa. Vinculado al encuadre del trabajo (la tesis global del paper). No recapitula la pericopa, no salta a versos distantes, no aplica devocionalmente.
**Autoridad:** Walter Kaiser, *Toward an Exegetical Theology* (capítulo sobre síntesis verso-paragráfo-libro).

---

## 4. Cinco diferenciadores

Implementamos los once pasos canónicos con fidelidad. Pero identificamos cinco lugares donde el método estándar está sub-especificado o donde la tecnología nos permite agregar valor real sin diluir el rigor. Cada diferenciador se justifica académicamente, no como bell-and-whistle.

### Diferenciador 1: Carga semántica específica del término en cada verso

**Estándar:** Los word studies tradicionales presentan el rango semántico completo del término y dejan que el lector infiera la carga en el verso particular.

**Lo que añadimos:** Capturamos `rango semántico general` y `carga específica en este verso` como campos separados. El alumno (y el modelo de IA) está obligado a articular explícitamente cómo el contexto inmediato selecciona del rango general.

**Justificación académica:** D. A. Carson, en *Exegetical Fallacies*, identifica la "totalidad transferida" como una de las falacias léxicas más comunes — asumir que toda la gama semántica de un término está activa en cada uso. Separar rango de carga es una salvaguarda metodológica explícita contra esta falacia.

### Diferenciador 2: Tracking explícito del rol argumentativo en la pericopa

**Estándar:** El análisis de discurso es disciplina académica reciente (Levinsohn, Runge desde los 90s). En seminarios tradicionales rara vez se articula verso por verso de forma sistemática.

**Lo que añadimos:** Campo dedicado `rol argumentativo` (1-2 oraciones) que dice qué hace este verso en el flujo del pasaje (establece, contrasta, ejemplifica, transiciona, concluye).

**Justificación académica:** La lingüística textual moderna (Runge, Levinsohn) ha demostrado que el flujo argumentativo es identificable y enseñable a partir de marcadores discursivos. Formalizarlo como campo lo hace replicable y auditable.

### Diferenciador 3: Confidence flags por afirmación interpretativa

**Estándar:** Los seminarios enseñan a "matizar afirmaciones tentativas vs sólidas" pero no proveen un mecanismo. El estudiante mezcla "X demuestra" con "X sugiere" inconsistentemente.

**Lo que añadimos:** Cada afirmación interpretativa lleva un flag de confianza (alto / medio / tentativo). El sistema usa estos flags para calibrar el lenguaje en la composición final ("X demuestra" vs "X sugiere" vs "podría leerse como").

**Justificación académica:** Carson dedica un capítulo entero en *Exegetical Fallacies* a "afirmaciones sobre-confiadas" como falacia común — afirmar como demostrado lo que es probable, o como posible lo que es inverosímil. Codificar la confianza por afirmación es una salvaguarda directa contra la sobre-confianza.

### Diferenciador 4: Crítica textual como paso default, no opcional

**Estándar:** Muchos manuales tratan la crítica textual como "consultar el aparato cuando algo te llame la atención". Resultado predecible: estudiantes la omiten cuando la variante no es obvia.

**Lo que añadimos:** Campo `crítica textual` siempre presente en el análisis. Cuando no hay variantes significativas, el campo dice explícitamente "Sin variantes significativas en el aparato NA28 para este verso", registrando que se revisó. Cuando hay variante, formato estructurado con testigos manuscritos, lectura adoptada y justificación.

**Justificación académica:** Bruce Metzger y Philip Comfort enseñan que la crítica textual es disciplina obligatoria, no opcional. El default forzado lo cumple sin agregar carga cuando no hay variantes.

### Diferenciador 5: Theological hooks separados de la prosa académica

**Estándar:** El paper académico mezcla análisis con implicaciones teológicas (lo cual es correcto académicamente). Pero esa mezcla hace difícil reusar el análisis para sermón o devocional, donde la teología sistemática debe surgir explícita.

**Lo que añadimos:** Campo `theological hooks` (loci doctrinales tocados: cristología, soteriología, eclesiología, etc.) separado de la tesis del verso. El paper académico no los menciona explícitamente; los compositores no-académicos (sermón, devocional) sí los usan.

**Justificación académica:** Vanhoozer y Treier en *Theological Interpretation of Scripture* defienden que la transición de la exégesis a la sistemática debe ser un paso explícito y reflexivo, no derivado por inercia. Codificarlo respeta esa transición y previene la mezcla descuidada.

---

## 5. Arquitectura: el estudio canónico como artefacto reusable

### El problema arquitectónico que resolvemos

Las herramientas existentes asumen un mapeo uno-a-uno entre análisis y formato: si querés un sermón, generás un sermón; si querés un paper académico, generás un paper. Resultado: el mismo trabajo exegético se rehace una y otra vez, con riesgo de inconsistencia entre formatos derivados de la misma exégesis.

### Nuestra arquitectura: dos etapas separadas

**Etapa 1 — Análisis canónico estructurado** (una sola vez por pasaje):
Por cada verso producimos un objeto estructurado (`CanonicalVerseAnalysis`) que captura los once pasos canónicos como datos atómicos: texto griego, crítica textual, esqueleto sintáctico, análisis morfológico/léxico, partículas discursivas, rol argumentativo, contexto histórico, intertextualidad, engagement con comentaristas, cruces de traducción con compromisos, tesis del verso, theological hooks, confidence flags, extensiones para notas al pie.

Este artefacto es **canónico**: se construye una vez, se revisa, se acepta. Persiste como conocimiento auditable.

**Etapa 2 — Composición hacia formatos** (múltiples veces, según necesidad):
Sobre el análisis canónico, distintos *composers* producen formatos específicos:

- **Composer académico (TMS-style)** — prosa académica continua, párrafos temáticos, citas inline distribuidas, notas al pie con extensión argumentativa, párrafo de cierre con compromiso de traducción + tesis del verso. Este es el output que tu profesor de seminario espera.

- **Composer de sermón expositivo** — usa `theological hooks` para identificar el énfasis doctrinal, transforma el análisis en bosquejo de sermón con introducción narrativa, desarrollo expositivo verso-a-verso, ilustraciones contextualmente apropiadas y aplicación pastoral. La fidelidad exegética se preserva porque la base es el mismo análisis canónico.

- **Composer devocional** — destila el análisis a una reflexión accesible, manteniendo la fidelidad al sentido del texto pero adaptando el registro a lectores generales.

- **Composer de guía de estudio bíblico** — preguntas de inducción, preguntas de observación, preguntas de aplicación, todas ancladas en el análisis estructurado.

- **Composers futuros** — lecciones de Escuela Dominical, materiales para estudios de hogar, contenido para redes sociales con base bíblica sólida, etc. Cada uno es un nuevo composer sobre el mismo dato canónico.

### Por qué esta arquitectura importa

**Para el estudiante de seminario:** El análisis canónico es lo que efectivamente debe revisar y aprender. La prosa académica final es producto, no proceso. Ver el análisis estructurado mientras estudia (study mode) es pedagógicamente superior a ver solo la prosa terminada.

**Para el pastor:** El mismo trabajo exegético serio que hace para una semana de predicación alimenta naturalmente el sermón del domingo, el devocional del miércoles, la guía de estudio del grupo pequeño y el contenido en redes — sin re-trabajar la exégesis.

**Para la integridad del ministerio:** La consistencia teológica entre formatos no depende de la disciplina del autor — está garantizada por compartir la misma base analítica. El sermón no contradice al devocional porque ambos derivan del mismo `CanonicalVerseAnalysis` validado.

**Para la transparencia académica:** Cada afirmación en cualquier formato es trazable hasta una decisión documentada en el análisis canónico. Confianza, fuentes, decisiones de traducción — todo auditable.

---

## 6. Límites declarados (lo que NO hacemos)

La integridad metodológica exige declarar lo que la plataforma NO hace y por qué. Estos límites son intencionales, no pendientes de roadmap.

### Lo que la plataforma no hace

**No reemplaza la formación de seminario.** Preach es una herramienta de scaffolding para quien ya posee formación bíblica seria. No enseña griego desde cero, no provee gramática exhaustiva, no certifica formación. El estudiante debe poder evaluar críticamente las afirmaciones del sistema.

**No produce hermenéutica devocional como exégesis.** Cuando el modelo no tiene fuentes para sostener una afirmación, lo declara explícitamente o no la hace. No suplementa con espiritualidad genérica.

**No aplica al lector contemporáneo dentro del análisis exegético.** La aplicación pertenece al sermón o devocional, no al análisis. Mezclar capas produce hermenéutica devocional.

**No incorpora hermenéuticas contemporáneas reactivas.** Estructuralismo, deconstrucción, lectura del lector, hermenéutica feminista crítica, hermenéutica de la liberación — no están integrados como métodos. Esto no es por desconocimiento; es por incompatibilidad con el compromiso #1 (intención autoral inspirada).

**No emite juicios apologéticos contemporáneos como exégesis.** "Cómo este verso refuta X corriente actual" anacroniza el texto. La apologética es válida en otros formatos (sermón temático, escrito apologético), pero no es exégesis.

**No genera conclusiones doctrinales que no estén sustentadas por el texto.** Si una doctrina sistemática iluminaría el verso pero no se desprende del análisis gramatical-sintáctico inmediato, se omite o se marca como "lectura informada por la analogía de la fe", sin disfrazarse de conclusión exegética.

### Por qué estos límites importan

Los límites son la integridad. Una herramienta que no tiene límites declarados es una herramienta cuyos límites el usuario descubre por sorpresa, generalmente cuando el daño ya está hecho. Preach declara sus límites para que el estudiante, el pastor y el seminario sepan exactamente qué tipo de trabajo confiar al sistema y qué trabajo permanece humano.

---

## 7. Casos de uso

### Estudiante de seminario en MDiv o ThM

Trabajo de investigación exegética sobre un pasaje. El estudiante configura la rúbrica del seminario, sube las fuentes que su profesor exige, y trabaja verso por verso. Cada análisis canónico estructurado le permite ver y evaluar cada paso (revisar la crítica textual, validar el parsing, criticar la decisión léxica, ajustar la traducción comprometida). Cuando está satisfecho, el composer académico produce la prosa final en estilo TMS-Turabian listo para entrega.

**Beneficio principal:** scaffolding de un trabajo riguroso que de otro modo tomaría 30-50 horas para un pasaje de 4-7 versos. La revisión humana es necesaria; el progreso del análisis se acelera dramáticamente.

### Pastor con preparación seria semanal

Predica una serie expositiva. Cada semana enfrenta una pericopa nueva. El análisis canónico de la pericopa alimenta:

- El sermón del domingo (composer de sermón)
- El devocional del grupo pequeño del miércoles (composer devocional)
- La guía para los líderes del grupo (composer de guía de estudio)
- El contenido para redes sociales del jueves (composer breve)

Todos los formatos derivan del mismo análisis exegético serio realizado una vez. La consistencia entre lo que predica el domingo y lo que devociona en grupo está garantizada por arquitectura, no por disciplina.

**Beneficio principal:** el pastor que quiere ministrar con rigor pero no tiene 40 horas semanales para investigar puede preservar la profundidad exegética sin colapsar en plagio de bosquejos genéricos.

### Estudiante laico con formación teológica

Adulto formado teológicamente que estudia un libro bíblico durante seis meses. Construye su biblioteca, va analizando capítulo por capítulo, mantiene el análisis canónico como su "diario exegético" sobre el libro. Puede reusar fragmentos del análisis para enseñar en su iglesia local sin perder fidelidad académica.

**Beneficio principal:** democratización del rigor exegético sin democratización de la simulación de rigor.

### Profesor de seminario o instituto bíblico

Usa la plataforma como herramienta de enseñanza. Los estudiantes producen sus análisis canónicos y los profesores revisan los pasos atómicos antes de evaluar la prosa final. La auditabilidad del análisis estructurado permite identificar exactamente dónde el estudiante falla (¿en la crítica textual? ¿en la decisión léxica? ¿en la articulación argumentativa?), lo que la prosa terminada oculta.

**Beneficio principal:** retroalimentación pedagógica granular que el formato monolítico de "trabajo escrito" no permite.

---

## 8. Decisiones técnicas derivadas de la metodología

La metodología no es teoría desconectada del producto. Estas son las decisiones técnicas que se derivan directamente:

**Schema `CanonicalVerseAnalysis` denormalizado.** Cada uno de los once pasos canónicos es un campo separado en el modelo de dominio. La denormalización permite revisión, edición y reuso atómico. La persistencia en Firestore mantiene este nivel de granularidad.

El schema vive en [`packages/domain/src/exegesis/entities/CanonicalVerseAnalysis.ts`](../../packages/domain/src/exegesis/entities/CanonicalVerseAnalysis.ts) y se exporta desde el barrel del módulo. Cada campo del tipo `CanonicalVerseAnalysis` documenta inline a qué paso canónico o diferenciador implementa, con referencias cruzadas a las autoridades académicas correspondientes.

**Generación verso a verso, no de pasaje completo.** Cada verso recibe atención dedicada del modelo de IA, no se diluye en una generación de pasaje completo. Esto preserva profundidad por verso.

**Aceptación explícita por verso.** El estudiante acepta cada análisis verso a verso antes de avanzar. Este gating es metodológico (no se construye sobre análisis cuestionable) tanto como pedagógico (el estudiante revisa de forma forzada).

**Composers separables del análisis.** El análisis canónico no asume formato de output. Los composers (académico, sermón, devocional, etc.) son módulos separables que consumen el análisis y producen formato. Agregar un composer nuevo no requiere tocar el análisis.

**Confidence flags propagados a la composición.** Los flags de confianza por afirmación se traducen en hedge language calibrado en la prosa final ("X demuestra" / "X sugiere" / "podría leerse como"). La calibración es automática, no opcional.

**Auditoría de fuentes obligatoria.** Toda afirmación en cualquier formato derivado debe poder rastrearse a una fuente citada en el análisis canónico, o marcarse explícitamente como conocimiento general no respaldado por el corpus. Sin excepciones.

---

## 9. Bibliografía

### Metodología exegética

- Carson, D. A. *Exegetical Fallacies*. 2nd ed. Grand Rapids: Baker, 1996.
- Fee, Gordon D. *New Testament Exegesis: A Handbook for Students and Pastors*. 3rd ed. Louisville: Westminster John Knox, 2002.
- Kaiser, Walter C. *Toward an Exegetical Theology: Biblical Exegesis for Preaching and Teaching*. Grand Rapids: Baker, 1981.
- Klein, William W., Craig L. Blomberg, and Robert L. Hubbard Jr. *Introduction to Biblical Interpretation*. 3rd ed. Grand Rapids: Zondervan, 2017.
- Stuart, Douglas. *Old Testament Exegesis: A Handbook for Students and Pastors*. 4th ed. Louisville: Westminster John Knox, 2009.

### Gramática y sintaxis del NT griego

- Blass, F., A. Debrunner, and Robert W. Funk. *A Greek Grammar of the New Testament and Other Early Christian Literature*. Chicago: University of Chicago Press, 1961.
- Robertson, A. T. *A Grammar of the Greek New Testament in the Light of Historical Research*. Nashville: Broadman, 1934.
- Wallace, Daniel B. *Greek Grammar Beyond the Basics: An Exegetical Syntax of the New Testament*. Grand Rapids: Zondervan, 1996.

### Léxico y semántica

- Bauer, Walter, F. W. Danker, W. F. Arndt, and F. W. Gingrich. *A Greek-English Lexicon of the New Testament and Other Early Christian Literature* (BDAG). 3rd ed. Chicago: University of Chicago Press, 2000.
- Liddell, H. G., and Robert Scott. *A Greek-English Lexicon* (LSJ). 9th ed. Oxford: Clarendon, 1940.
- Louw, Johannes P., and Eugene A. Nida. *Greek-English Lexicon of the New Testament Based on Semantic Domains*. New York: United Bible Societies, 1989.
- Silva, Moisés (ed.). *New International Dictionary of New Testament Theology and Exegesis* (NIDNTTE). 5 vols. Grand Rapids: Zondervan, 2014.
- Kittel, Gerhard, and Gerhard Friedrich (eds.). *Theological Dictionary of the New Testament* (TDNT). 10 vols. Grand Rapids: Eerdmans, 1964–1976.

### Crítica textual

- Aland, Barbara, et al. *Novum Testamentum Graece* (NA28). 28th rev. ed. Stuttgart: Deutsche Bibelgesellschaft, 2012.
- Comfort, Philip W., and David P. Barrett. *The Text of the Earliest New Testament Greek Manuscripts*. Wheaton: Tyndale House, 2001.
- Metzger, Bruce M. *A Textual Commentary on the Greek New Testament*. 2nd ed. Stuttgart: United Bible Societies, 1994.

### Análisis del discurso

- Cotterell, Peter, and Max Turner. *Linguistics and Biblical Interpretation*. Downers Grove: InterVarsity, 1989.
- Levinsohn, Stephen H. *Discourse Features of New Testament Greek: A Coursebook on the Information Structure of New Testament Greek*. 2nd ed. Dallas: SIL International, 2000.
- Runge, Steven E. *Discourse Grammar of the Greek New Testament: A Practical Introduction for Teaching and Exegesis*. Peabody: Hendrickson, 2010.

### Trasfondo histórico-cultural

- deSilva, David A. *Honor, Patronage, Kinship & Purity: Unlocking New Testament Culture*. Downers Grove: InterVarsity, 2000.
- Freedman, David Noel (ed.). *The Anchor Bible Dictionary* (ABD). 6 vols. New York: Doubleday, 1992.
- Keener, Craig S. *The IVP Bible Background Commentary: New Testament*. 2nd ed. Downers Grove: InterVarsity, 2014.

### Intertextualidad NT-AT

- Beale, G. K., and D. A. Carson (eds.). *Commentary on the New Testament Use of the Old Testament*. Grand Rapids: Baker, 2007.
- Hays, Richard B. *Echoes of Scripture in the Letters of Paul*. New Haven: Yale University Press, 1989.

### Traducción

- Beekman, John, and John Callow. *Translating the Word of God*. Grand Rapids: Zondervan, 1974.
- Carson, D. A. *The Inclusive Language Debate: A Plea for Realism*. Grand Rapids: Baker, 1998.

### Hermenéutica e interpretación teológica

- Vanhoozer, Kevin J., and Daniel J. Treier. *Theological Interpretation of Scripture: An Introduction*. Grand Rapids: Baker Academic, 2008.

---

## Apéndice — Glosario de términos clave

**Análisis canónico** *(uso interno del producto):* el artefacto estructurado de los once pasos exegéticos que persiste como base de conocimiento sobre un pasaje. No relacionado con "canónico" en el sentido bíblico.

**Composer** *(uso interno del producto):* módulo que consume el análisis canónico y produce un formato específico (paper académico, sermón, devocional, etc.).

**Historicogramatical-literal:** método interpretativo que prioriza el sentido del autor humano (inspirado por el Espíritu Santo) determinado por análisis gramatical, sintáctico, léxico e histórico del texto en su contexto original.

**Pericopa:** unidad literaria coherente dentro de un libro bíblico, generalmente delimitada por marcadores estructurales (cambios de tema, personajes, ubicación). Ej: Hebreos 1:1-4 es una pericopa que constituye el prólogo cristológico de la epístola.

**Sorites (estructura en cadena):** figura retórica donde cada elemento se conecta al anterior y al siguiente formando una progresión. Ej: 2 Pedro 1:5-7 — fe → virtud → conocimiento → dominio propio → paciencia → piedad → afecto fraternal → amor.

**Theological hook** *(uso interno del producto):* loci doctrinal (cristología, soteriología, etc.) tocado por un verso, anotado para uso en composers no-académicos donde la transición a teología sistemática es explícita.

**μέν…δέ (men…de):** par de partículas griegas que marcan contraste o paralelo entre dos elementos. Frecuentemente usado para estructurar argumentos en pares.

---

*Este documento se mantiene actualizado conforme la metodología y arquitectura del módulo evolucionan. Última revisión: mayo 2026.*
