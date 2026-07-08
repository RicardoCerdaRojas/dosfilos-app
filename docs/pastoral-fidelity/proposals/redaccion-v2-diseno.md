# Redacción v2 — Diseño del módulo de sermón (documento vivo)

> **Estado:** diseño en curso, entre el fundador y el copiloto. NO implementar.
> Crece género por género. Cuando esté completo y aprobado, ESTE documento es la
> especificación que instruye a Claude Code — íntegra, no reconstruida de memoria.
> **La integración pasa por la mano del fundador. El diseño también.**

**Última actualización:** ✅ DISEÑO COMPLETO. Los 8 perfiles de género, la etapa 5 (mecánica del juez) y la revisión completa del catálogo del juez están sellados. Lo que resta es material de ADR (implementación), no diseño.

---

## 1. Contexto y decisión

La auditoría del generador de sermones (post-estudio) encontró que el pipeline
produce sermones "predicables pero planos": exégesis superficial, ilustraciones
cliché, transiciones-índice, citas de autoridad inventadas, FCF/cristocentrismo
genéricos, sin validadores post-gen.

**Diagnóstico de fondo:** el módulo está diseñado alrededor del *artefacto* (un
documento), no del *acto* (un pastor predicando a una congregación). Y hay un flip
de tesis: en el estudio el pastor produce y el sistema confronta; en la redacción
el sistema produce y el pastor queda de editor de un texto ajeno. Ese flip invierte
el segundo principio ("el sistema desarrolla, no origina") justo en el punto donde
la herramienta toca a la congregación.

**Decisión:** rediseñar la fase de sermón para que el sistema haga el trabajo pesado
de redacción y el pastor tome todas las decisiones de diseño del sermón. No es un
parche al generador — es Redacción v2.

**Objetivo de diseño (la vara de cada decisión):**
> El sistema hace el trabajo pesado de redacción; el pastor toma todas las decisiones
> de diseño del sermón. Productividad = el pastor no teclea párrafos. Fidelidad = el
> pastor decide proposición, estructura, ilustración y aplicación.

---

## 2. Los tres principios como vara (cómo se cumplen en el nuevo flujo)

- **Labor antes que output:** el pastor estudia (8 pasos) antes de redactar; y dentro
  de la redacción, cada decisión de diseño (proposición, estructura, ilustración,
  aplicación) la toma él.
- **El sistema desarrolla, no origina:** el sistema redacta prosa SOBRE decisiones y
  material del pastor (su exégesis, su estructura, su anécdota). Nunca origina la
  decisión de diseño.
- **Confrontación obligatoria:** el sistema confronta (proposición mal formada, punto
  sin anclaje, ilustración no validada, género mal leído) — pero deja al pastor
  decidir con razón registrada. Confronta, no encierra.

---

## 3. El flujo de cinco etapas

1. **Proposición** — el sistema muestra el material del pastor (idea central, principio
   atemporal, observaciones) y construye la proposición con los 8 elementos; el pastor
   decide cada elemento; el sistema ensambla, muestra y el pastor pule; confronta contra
   los 8 elementos.
2. **Forma** — el pastor elige la forma (6 del catálogo) sobre su proposición ya fijada.
   El sistema recomienda por género con razón visible, no impone.
3. **Bosquejo por movimientos** — el sistema propone estructura derivada del análisis
   estructural (paso 3) y de `PassageProfile.movements`; cada movimiento anclado a
   versos; el pastor reordena, funde, divide, corta, renombra.
4. **Desarrollo movimiento por movimiento** — por cada punto, un ciclo de la anatomía
   del movimiento (§5). Input del pastor: corto, 2-3 decisiones por movimiento, cero
   párrafos tecleados.
5. **Ensamble + confrontación final** — introducción y conclusión al final; el juez
   corre aquí como confrontación pre-publicación (globales G1/G2/G3 + vara de la forma).

---

## 4. Decisiones transversales (selladas)

### 4.1 Dos velocidades, con desbloqueo por historial
- **Dirigido:** el flujo completo por etapas.
- **Rápido:** pre-llena cada etapa DESDE el corpus real del pastor (sus proposiciones,
  giros, aplicaciones, manera de ilustrar). No genérico. El pastor revisa/ajusta.
- **Desbloqueo:** el rápido se habilita tras **≥3 sermones completados en modo dirigido**
  (solo dirigidos cuentan; material subido pre-Preach NO cuenta — el desbloqueo certifica
  oficio ejercido, no archivo). **Umbral editable** (data, no hardcode).
- **Fail-closed por etapa:** si la historia del pastor no tiene material para pre-llenar
  una etapa, esa etapa cae a modo dirigido. Nunca rellena con material genérico.

### 4.2 Umbral único, dos gracias progresivas
- El **mismo umbral** (~3 dirigidos, editable) gobierna: (a) desbloqueo del modo rápido,
  y (b) aligeramiento de la guía socrática de género (§4.4).
- **Un umbral, un lugar, dos consumidores.** Invariante byblos: no crear un segundo umbral
  pensando que son features separadas.
- Principio de tesis: el andamiaje se retira a medida que el pastor demuestra oficio.

### 4.3 Constructor de proposición (los 8 elementos del fundador)
Proposición SIEMPRE (universal a las seis formas — elemento pedagógico/exhortativo de la
predicación expositiva). El tutor pide los 8 elementos, cada uno pre-sembrado desde el
estudio donde exista:
1. Define el pasaje ("En Mateo…") — viene del estudio.
2. Introduce la cantidad de puntos ("veremos tres…") — sale del bosquejo/§6.
3. Sustantivo plural (verdades, motivos, exhortaciones…) — el pastor elige.
4. Llamado a la acción (obedecer, confiar, poner por obra…) — decisión pastoral.
5. Elemento proposicional (que, para, a fin de, por lo que).
6. Pronombre 1ª plural (vivimos, confiamos… puede ser implícito) — gramática, el sistema resuelve.
7. Idea central del pasaje (paso 7 del estudio, verbatim).
8. Los puntos en armonía con el llamado a la acción y con la idea central del texto —
   **aquí siempre manda el flujo del texto; no se inventan ni introducen ideas fuera de
   contexto** (G3 en miniatura).

El sistema ensambla con lo que el pastor decidió, lo muestra, el pastor pule; luego
confronta contra los 8. La proposición se vuelve el CONTRATO de todo lo que sigue: los
puntos del bosquejo heredan el llamado a la acción (ej. Mateo 28: "Debes ir… Debes hacer…
Debes reconocer…").

### 4.4 Override de género socrático, sensible al nivel
- **Gap actual (confirmado por CC):** el género hoy lo infiere el sistema
  (`inferGenreFromBook`), el pastor NO lo confirma ni puede sobrescribir. La premisa "el
  género que gobierna debe ser el que el pastor confirma en el paso 2" NO se cumple hoy.
- **Decisión:** agregar confirmación/override explícito del género de la **perícopa** en
  el paso 2. El sistema propone (inferencia como default con razón visible); el pastor
  confirma o corrige. Desarrolla, no origina.
- **Socrático, no un dropdown en crudo:** el sistema guía al pastor a *ver* el género de
  su perícopa (¿argumenta? ¿narra? ¿canta/ora?), y explica "perícopa"/"género" en el
  momento si el pastor no sabe (modo simplificar que ya existe). Convierte el override en
  momento formativo.
- **Sensible al nivel (mismo umbral §4.2):** novato → formativo pleno (siempre discierne
  el género, nadie avanza sin pronunciarse); pastor con historial → ligero (propone,
  confirma rápido, guía bajo demanda).
- **Hereda las 3 situaciones de la confrontación de lectura errónea:** no tocó / lo
  ignoró / lo trabajó y discrepa → avanza con razón registrada. El sistema juzga si
  TRABAJÓ la decisión, no si coincidió.
- **Fuente única:** el sermón LEE `seed.passageProfile.genres/movements`. NO re-deriva
  género (evita la 2ª fuente de verdad que costó con `homileticalApproach`).

### 4.5 Paso 3 reforzado como fundación
Si el bosquejo del sermón se cosecha del análisis estructural del paso 3, la calidad del
sermón queda acotada por la calidad de ese paso. El paso 3 pasa de "paso de estudio" a
**fundación estructural del sermón**. Requiere:
- Ayuda sensible al género (epístola = conectores/flujo; narrativa = escenas/giros;
  poesía = paralelismos/estrofas) — gobernada por el género confirmado en paso 2.
- Ejemplos trabajados por género (curados por el fundador, no generados).
- Confrontación de calidad estructural EN el paso 3, no aguas abajo.
- Refinamiento iterativo sin sustitución (el sistema ilumina el texto; el pastor traza).
- **Prerrequisito del rediseño, no paralelo:** reforzar la fundación antes de construir el
  cosechador de bosquejo.
- **Vara de entrada fail-closed formativo:** análisis estructural insuficiente → el pastor
  revisita el paso 3 con las ayudas nuevas antes de entrar al flujo homilético. Aplica a
  estudios legados. (La vara de "suficiente" se define como catálogo editable, sensible al
  género — [[pendiente detallar]].)

### 4.6 El juez confronta, no bloquea
- El juez (etapa 5) corre como confrontación pre-publicación. **Confronta y deja pasar con
  advertencia registrada** — no bloquea. El pastor es el predicador.
- La advertencia VIAJA con el sermón. Si el shadow muestra a un pastor pasando por encima de
  G3 sermón tras sermón, es señal formativa que el sistema conoce. Confrontar sin bloquear
  no es confrontar sin memoria.

---

## 5. Anatomía del movimiento (universal, 6 componentes)

Una sola anatomía para las seis formas. Lo que muta por género es la *realización* de la
explicación (componente camaleónico), no la lista de componentes.

1. **Explicación** (obligatorio, sensible al género) — incluye la **explicación exegética**:
   la carga gramatical/léxica del propio pasaje hecha accesible (morfología real de
   `PastoralWordAnalysis`, la profundidad léxica de 1.5b). Sin ella es paráfrasis; con ella
   es exposición.
2. **Apoyo escritural / referencias cruzadas** (obligatorio) — los "aros concéntricos":
   misma palabra del autor en otro libro, misma enseñanza en otro lugar del canon. Es el
   **motor de tres testigos a nivel de movimiento**. El apoyo sugerido PASA por el motor de
   citas (verifica que el paralelo realmente respalde lo que el punto afirma, no solo que la
   palabra coincida — detector de proof-texting a favor del pastor).
3. **Respaldo de autoridad** (opcional, "solo si existe") — cita de autoridad; fail-closed
   igual que authorityQuote (contra fuente vetada o null).
4. **Ilustración** — orden estricto: (a) el sistema pregunta al pastor su ilustración propia
   ("¿qué has visto en tu congregación / tu vida que encarne esto?"); (b) si no tiene, el
   sistema sugiere UNA derivada solo del contexto (condición nombrada, FCF, anécdota del
   seed, mundo del pasaje) — nunca del banco de clichés; (c) provenance: `propia` vs
   `sugerida-validada`; la sugerida exige validación explícita antes del ensamble
   (fail-closed: sin validar, no entra). El shadow mide proporción propia/sugerida.
5. **Aplicación** — contra dos anclas que ya existen: la condición real que el pastor nombró
   + el llamado a la acción de la proposición (elemento 4). Mata el callToAction genérico por
   construcción.
6. **Transición** — repite proposición + puntos. **ES EL MÉTODO DEL FUNDADOR, no un bug.**
   La crítica de la auditoría ("índice de recap, no transición narrativa") estaba EQUIVOCADA
   — el re-anclaje de la proposición es intencional y pedagógico. Instruir a CC: NO
   "arreglar" la transición hacia arco narrativo.

**Introducción/conclusión (etapa 5, se escriben al final):**
- Introducción = Ilustración + Contexto (el pasaje dentro del argumento/capítulo/libro/
  metanarrativa — Terry: condición de interpretación correcta) + Proposición con puntos.
- Conclusión = Resumen breve de los puntos y sus implicaciones + Llamado a la acción (a
  creyentes e inconversos).

---

## 6. Catálogo de perfiles de género

**Base compartida (decisión sellada):** existe un `PassageProfile` real en prod
(`PassageProfile.ts:228`, ADR-035, flag-gated). Captura `genres` (determinista de
`inferGenreFromBook`) y `movements` (cada uno "unidad preachable/argumental"). El módulo de
sermón LEE de ahí — **una sola fuente de verdad**. El catálogo género→estructura de sermón
(rango de puntos, realización de la explicación) es un mapeo NUEVO que consume el perfil, no
lo re-deriva. Vive como data editable (domain SSOT, movible a Firestore). Invariante: llaves
= enum de géneros; test rompe CI si difieren.

Cada perfil declara 4 piezas: (1) rango de puntos + razón hermenéutica; (2) fuente de los
puntos en el análisis estructural; (3) realización de la explicación; (4) forma de la
proposición sustantivada.

**Regla estructural transversal (sellada en epístola, aplica a todos):**
- **Estudio = cobertura exegética total.** El texto se estudia con TODOS sus movimientos, los
  que manda el género. Sin agrupación. Fidelidad = cobertura total.
- **Sermón = libertad homilética.** Sobre movimientos ya estudiados, el pastor organiza: puede
  **fusionar** movimientos afines o **dividir** un movimiento profundo en varios puntos.
- **Vara NO es "nº puntos = nº movimientos".** Es **cobertura + anclaje**: cada punto rastrea a
  movimiento(s) exegético(s); ningún punto sin anclaje (eso es G3). Un punto sin anclaje a
  movimiento estudiado se confronta.
- **Omisión:** predicar menos movimientos de los estudiados es fiel SI es decisión consciente
  del pastor (foco, tiempo, propósito panorámico); omisión ciega (saltarse sin ver el
  movimiento con la lectura errónea) se confronta, no se bloquea.
- **Techo de puntos = guía de carga homilética, no límite exegético.**

---

### 6.1 EPÍSTOLA (discurso lógico / argumentativo) — SELLADO

**Fuentes:** Zuck (epístola = "discurso lógico", combina exposición con apoyo lógico +
exhortación); Terry (determinar objeto y plan; el plan = orden de pensamiento del autor;
Romanos 1:16 como proposición-tema intrínseca; observar elementos gramaticales). Tabla de
metodología propia (epístola → conectores lógicos, flujo del argumento).

**Pieza 1 — Rango de puntos:** 2 a 4 (techo sano 4). [propuesta: el nº es homilético; la
hermenéutica de "argumento con movimientos" es de las fuentes.] Los puntos salen de los
movimientos del argumento. Sobre 4 movimientos → agrupar afines (permite sermón panorámico);
un movimiento denso → dividir. Fragmentación sin anclaje se confronta.

**Pieza 2 — Fuente de los puntos:** flujo del argumento — conectores lógicos y cláusulas
principales del paso 3 ("por tanto", "porque", "para que"). Ej. sistema: 2 Pedro 2:10-22 →
acusación / vacío / fin peor. El paso 3 reforzado protege esto (§4.5).

**Pieza 3 — Realización de la explicación:** desglosa el argumento cláusula por cláusula
siguiendo los conectores lógicos. Máximo peso a la explicación exegética gramatical (Zuck
"apoyo lógico"; Terry elementos gramaticales — ej. el "vosotros" plural de 2 Ti 4:22).

**Pieza 4 — Proposición sustantivada:** modelo de 8 elementos completo y natural — el género
es intrínsecamente proposicional (Terry, Romanos 1:16 como tema del que cuelga todo). Sustantivo
plural = verdades/razones/advertencias/exhortaciones según lo que hace el argumento. Elemento 8
(armonía puntos↔texto) muerde fuerte aquí porque el argumento es explícito.

**Criterio de fidelidad propio de la epístola:**
- Un sermón epistolar fiel EXPONE la verdad del texto Y la LLEVA a la vida del oyente.
- **La aplicación toma muchos rostros** — mandato, consuelo, esperanza, advertencia, ánimo —
  según lo que el texto hace con su audiencia (Zuck lista las formas del discurso NT: mandatos,
  prohibiciones, exhortaciones, deseos, permisos, ejemplos). **NO reducir exhortación a
  imperativo moral.** Un sermón de puro consuelo (ej. 1 Ts 4) es aplicación fiel; penalizarlo
  por "faltarle un mandato" es un error.
- **Infiel =** doctrina sin aterrizaje (queda en lección, nunca toca al oyente) O aplicación sin
  fundamento (exhorta/consuela desconectado del texto — moralismo o sentimentalismo sin ancla).
- **Guía socrática (sensible al nivel):** para el novato, el tutor enseña la distinción
  doctrina/aplicación con el pasaje delante y le muestra que la exhortación tiene rostros.

---

### 6.2 NARRATIVA (histórica) — SELLADO

**Fuentes:** Zuck (patrón narrativo: problema → complicación creciente → clímax/"pico" [Cotterell-Turner]
→ resolución; taxonomía de 6 tipos: tragedia, épica, romance, heroica, etc.; "las narrativas enseñan por
ilustración, no por mandato directo"; controles para extraer principios). McQuilkin (citado por Zuck: el
principio es más firme cuando el texto emite juicio — exalta o condena). Tabla propia (narrativa → trama,
escena, caracterización).

**Pieza 1 — Rango de puntos:** 1 a N acotado por los movimientos reales de la trama (techo homilético 4).
Los movimientos son los **giros de la trama** (no razones de argumento como en epístola). Un relato simple
rinde pocos; uno con varias escenas, más. Fusión/división homilética libre (cobertura + anclaje manda).

**Pieza 2 — Fuente de los puntos:** trama, escena y caracterización (tabla propia + patrón de Zuck). El
paso 3 en narrativa traza el ARCO (¿dónde arranca la tensión? ¿el clímax? ¿la resolución?), no conectores.
La ayuda del paso 3 en narrativa enseña a leer el arco, no la lógica.

**Pieza 3 — Realización de la explicación (corazón camaleónico):** narra el movimiento de la escena y saca
su fuerza del RELATO — no lo disecciona en receta ("no receta sin vida"; explicación *appropriately timed*
para no matar la tensión). Zuck: la narrativa enseña por ilustración, no por mandato — así que la explicación
se apoya menos en carga gramatical de una palabra (eso es epístola) y más en el movimiento del relato, la
caracterización, y el juicio del narrador.

**Pieza 4 — Proposición sustantivada:** modelo de 8 elementos completo. **La proposición SE ANUNCIA (no se
revela tarde), igual que en toda forma** — decisión del fundador: el propósito de predicar no es sorprender
ni sostener suspenso, es comunicar la verdad de Dios, y repetirla es patrón bíblico. Cae la excepción de
"revelar tarde en narrativa" que sugería la literatura secular. La transición re-ancla proposición+puntos
también en narrativa. Sustantivo puede ser singular si el relato rinde un solo principio.

**Descalificadores propios de la narrativa (los DOS peligros, ambos duros):**
- **D1 — Moralizar / caricaturizar:** identificación solo con lo negativo ("no seas como X"); caricaturizar
  un personaje traicionando el balance del texto. [tradición]
- **D2 — Sobre-extracción de principios:** extraer principios que el texto no sostiene (Zuck: Gn 24 NO enseña
  "cómo conseguir esposa"; Gn 22 NO enseña "sacrificar hijos"; 1 Re 17 NO enseña "Dios alimenta por aves").
  **Vara de los TRES CONTROLES** (sellada) — cuando el pastor formula el principio de un movimiento narrativo,
  el sistema lo confronta con: (1) ¿está DERIVADO directamente del texto? (Zuck: "esos puntos simplemente no
  están en el texto"); (2) ¿es COHERENTE con el resto del canon? (= motor de tres testigos / paralelos
  canónicos); (3) ¿el texto EMITE JUICIO sobre esto? (McQuilkin — exalta o condena, a veces explica por qué).

**Taxonomía de 6 tipos (gancho para afinar paso 3, [[detallar en v2]]):** tragedia (arco de caída — Saúl,
Sansón), épica (episodios encadenados — desierto), romance (Rut, Cantares), heroica, etc. Cada tipo tiene su
forma de arco; se usa para afinar la ayuda del paso 3 en narrativa. No se detallan los 6 ahora — gancho puesto.

---

### 6.3 PARÁBOLA — SELLADO

**Decisión del fundador:** parábola y sapiencial son DOS géneros distintos (operaciones hermenéuticas
diferentes) → dos perfiles separados. La parábola es "narrativa con regla de punto único".

**Fuentes:** Zuck (la parábola enseña UNA sola verdad; no alegorizar detalles — error de Agustín con el
buen samaritano; a veces Jesús declara la verdad: Lc 15:7, Mt 20:16). Terry (hacer prominente la verdad
central, unidad de las partes; la parábola de Natán a David — 2 Sm 12 — desarma antes de confrontar).

**Pieza 1 — Rango de puntos: 1 (punto único).** El perfil MÁS restrictivo del catálogo. El sistema
**resiste la multiplicación**, no la propone: si el pastor quiere varios puntos, el tutor confronta ("la
parábola enseña por un punto mayor de comparación — ¿tus puntos no fragmentan la única verdad?"). Único
género donde la fusión opera hacia FORZAR unidad.

**Pieza 2 — Fuente del punto:** la comparación central. Terry: determinar ocasión histórica y propósito;
analizar imágenes; interpretar partes con referencia al designio general → "verdad central prominente".
Zuck: identificar la verdad principal (muchas veces Jesús la declara).

**Pieza 3 — Realización de la explicación:** explica la comparación y su fuerza, **SIN alegorizar los
detalles** (mesonero, monedas, burro = realismo, no significado espiritual). Excepción: cuando el propio
Jesús interpreta detalles (sembrador, cizaña) — excepción, no regla.

**Pieza 4 — Proposición:** anunciada, como todas. Sustantivo **singular** ("una verdad que…"). Captura la
verdad central que la parábola ilustra.

**Descalificador propio:**
- **Alegorizar los detalles** — asignar significado espiritual a elementos que solo dan realismo, más allá
  del punto único (Zuck: error de Agustín; Terry: "el grave error de buscar analogías minuciosas en todos
  los detalles"). Es el proof-texting de la parábola.

**[[para CC en el ADR]]** ¿Parábola es género propio en `PassageProfile.genres` o sub-tipo de narrativa con
marca "punto único"? Decisión de implementación, depende de cómo esté armado hoy `genres`. Hermenéuticamente
es su propio perfil (decidido); la representación en código la resuelve CC.

---

### 6.4 SAPIENCIAL (literatura de sabiduría) — SELLADO

**Fuentes:** Zuck (sabiduría = Job, Proverbios, Eclesiastés, a veces Cantares; DOS tipos: proverbial y
reflexiva; proverbios son "guías, no garantías; preceptos, no promesas" — verdades generales con
excepciones). Terry (en Proverbios muchos aforismos sin conexión entre sí; paralelismos sinónimo/antitético
ayudan a exponer; en Job hay que preguntar QUIÉN habla — Job, los amigos, Eliú o Dios — antes de citar).

**Sub-tipo como MARCA interna** (decisión del fundador — no dos perfiles): `proverbial | reflexiva`.
Comparten el descalificador de fondo (sabiduría ≠ promesa) y la naturaleza poética; se ramifican en estructura.
Toda la sabiduría es poesía, pero no toda poesía es sabiduría (distinto del perfil poesía/salmos).

**Pieza 1 — Rango de puntos:**
- **Proverbial:** 1 (máxima a fondo) o agrupación temática de proverbios afines (unidos por tema, no por arco).
- **Reflexiva** (Job/Eclesiastés): 2-4, sigue el movimiento del argumento reflexivo (cercano a epístola).

**Pieza 2 — Fuente de los puntos:**
- **Proverbial:** el paralelismo (sinónimo/antitético) y la máxima (Terry).
- **Reflexiva:** el flujo del argumento reflexivo + **la operación "quién habla"** (Terry: citar Job sin saber
  si lo dijo Job, un amigo refutado, Eliú o Dios es fútil).

**Pieza 3 — Realización de la explicación:**
- **Proverbial:** abre el paralelismo (¿el 2º verso ilustra o contrasta?) y determina la figura.
- **Reflexiva:** rastrea el discurso y UBICA la voz (distingue la voz que el libro afirma de la que refuta).

**Pieza 4 — Proposición:** anunciada. Proverbial: singular (o plural si agrupa). Reflexiva: patrón de epístola.

**Descalificadores propios (dos, filosos):**
- **D1 — Proverbio como promesa absoluta [SEVERIDAD: CRÍTICA].** El error central de predicar Proverbios.
  Zuck: "guías, no garantías; preceptos, no promesas" (el perezoso generalmente empobrece, PERO hay
  excepciones; la piedad generalmente da vida larga, PERO hay excepciones). Terry: Prov 16:7 tiene "muchas
  excepciones — todos los perseguidos por amar la justicia". **Vara:** predicar un proverbio como contrato
  garantizado de Dios ("sé diligente y Dios te hará rico") es infiel. Es la puerta de la teología de
  prosperidad — por eso severidad CRÍTICA. Es un caso del detector de proof-texting.
- **D2 — Citar la voz equivocada en Job/reflexiva como verdad.** Predicar palabras de los amigos de Job (que
  el libro REFUTA) como enseñanza del libro (Terry). Proof-texting de la literatura reflexiva.

**Ambos descalificadores son también AYUDA activa del paso 3 (decisión del fundador — enseñar, no solo
reprobar):** el sistema enseña en el momento que el proverbio es guía no garantía; y en textos reflexivos
pregunta "¿quién dice esto y el libro lo afirma o lo refuta?" antes de que llegue al sermón.

**Cantares — DIFERIDO (deuda consciente byblos).** Condiciones del fundador cumplidas: (a) el catálogo-dato
permite agregarlo después sin tocar la mecánica del juez/constructor — es entrada nueva, no cambio de motor
(abierto/cerrado); (b) documentado en byblos. Razón: Cantares es difícil hermenéuticamente (Terry advierte
fuerte contra alegorizarlo; desacuerdo real en la tradición) — merece discusión cuidadosa con el fundador,
no un perfil apurado.

**Patrón nuevo que este perfil activa — SEVERIDAD de descalificadores (aplica a TODO el catálogo, no solo
sapiencial):** los descalificadores ganan un campo `severidad` (`critica | estandar`), como DATO editable
por descalificador. NO hardcodeado, NO excepción para sapiencial. Qué hace la severidad con el veredicto
(¿crítica → "no cumple" directo mientras estándar → "revisar"? ¿crítica bloquea, estándar advierte?) se
define en la etapa 5 del juez (decisión de tesis del fundador, pendiente). Esto resuelve el pendiente que se
había marcado al revisar el catálogo del juez ("los descalificadores no tienen severidad").

---

### 6.5 POESÍA / SALMOS — SELLADO

**Fuentes:** Terry (la forma poética ES parte del significado — "imposible verter poesía a prosa sin perder
su poder y espíritu"; interpretar poesía depende de "la simpatía con los sentimientos del autor"; paralelismo
sinónimo/antitético/sintético según Lowth). Zuck (tipos de salmo con elementos internos; "detrás de cada
figura hay un significado literal"; buscar "la idea central, el pensamiento unificador"). Tabla propia
(poesía → paralelismo, imágenes, quiasmo).

**Categorías como MARCA interna** (decisión del fundador): `lamento (colectivo/individual) | alabanza
(declarativa/descriptiva) | confianza | sabiduría | canto-de-Sion`. La marca ramifica los ELEMENTOS
INTERNOS que el paso 3 busca y que la explicación abre (ej. lamento individual: invocación → lamento →
confianza → petición → voto de alabanza). Toda la sabiduría es poesía pero no toda poesía es sabiduría
(§6.4 es perfil aparte).

**Pieza 1 — Rango de puntos:** 1 a 3. La poesía no se desmenuza en muchos puntos — su unidad es afectiva y
temática (Zuck: "idea central / pensamiento unificador"). Los movimientos salen de la estructura de la
categoría y los giros de metáfora. Ej. sistema: Salmo 23 → 2 movimientos (pastor, anfitrión).

**Pieza 2 — Fuente de los puntos:** paralelismo, imagen, y estructura de la categoría (Terry: paralelismo
Lowth; Zuck: elementos por tipo). El paso 3 traza paralelismos y giros de imagen, no conectores ni arco.

**Pieza 3 — Realización de la explicación (distintiva):** abre la imagen y el paralelismo SIN aplanar el
poema en prosa. (a) Abrir el paralelismo (¿el 2º verso ilustra, contrasta o intensifica?). (b) Interpretar
la imagen sin sobre-literalizar NI vaciar ("el Señor es mi roca" = firmeza/refugio preciso, ni roca literal
ni abstracción vaga). (c) **Conservar el AFECTO, no solo la doctrina** (Terry: ser consolado con sus
consolaciones, agitado por sus tormentas). **Engancha la conducción afectiva existente del producto**
(mente/corazón/conducta → saber/sentir/hacer): en poesía el "sentir" es constitutivo del texto. **[[punto
de integración para CC — la conducción afectiva se consume como SERVICIO, no se fusiona; arquitectura
limpia, no acoplar los dos módulos]]**.

**Pieza 4 — Proposición:** anunciada. Captura el pensamiento unificador; sustantivo puede ser singular. El
cuidado propio: formular una proposición fiel que NO reduzca el poema — anunciar la verdad sin apagar el
afecto que la carga.

**Descalificadores propios:**
- **D1 — Aplanar el poema en prosa doctrinal [TIPO: TRATAMIENTO].** Desmenuzar el salmo en proposiciones
  frías que pierden el movimiento afectivo (Terry). Descalificador ESTRUCTURAL/de tratamiento, no de
  contenido.
- **D2 — Sobre-literalizar o vaciar la imagen [TIPO: CONTENIDO].** Los dos extremos: tomar la figura
  literalmente (absurdo) o vaciarla en abstracción sin fuerza (Zuck: la figura comunica un hecho literal
  por medio pintoresco — hallarlo sin destruir la imagen).

**Patrón nuevo que este perfil activa — TIPO de descalificador (aplica a todo el catálogo):** un
descalificador puede ser de `contenido` (qué dice el sermón — moraliza, alegoriza, promete) o de
`tratamiento` (CÓMO trata el texto — aplana el afecto, disecciona la narrativa en receta). El juez gana una
segunda dimensión de fidelidad: no solo "¿dice lo correcto?" sino "¿lo trata como el género pide?".
Retroactivo: narrativa D1 (moralizar/receta) también es tratamiento. Campo `tipo` como dato del
descalificador.

---

### 6.6 PROFÉTICO — SELLADO

**Fuentes:** Terry ("profetizar NO significa primariamente predecir el futuro"; *nabí* = uno que habla bajo
fervor divino, portavoz de mensaje que puede ser pasado/presente/futuro — revelación, amonestación,
censura, exhortación, promesa o predicción; los libros proféticos están "en gran parte escritos en las
formas de la poesía hebrea" — lenguaje figurado/hiperbólico; Isaías 13 "carga de Babilonia" = lenguaje
cósmico para juicio histórico; rechaza el "doble sentido" pero afirma tipología). Zuck (la profecía viene
de Dios, "hablar de antemano"). Tabla propia (profecía → género + cumplimiento).

**Base que corrige el instinto:** el error común es tratar la profecía como "historia escrita de antemano"
(almanaque de eventos). La mayoría de la profecía es CONFRONTACIÓN AL PRESENTE — llamado, denuncia,
promesa. El perfil corrige eso desde la raíz.

**Pieza 1 — Rango de puntos:** 1 a 4. Los movimientos siguen la estructura del oráculo — patrón por defecto
**acusación → juicio → restauración** (patrón del pacto, decisión del fundador). Fusión/división libre.

**Pieza 2 — Fuente de los puntos:** estructura del oráculo (denuncia/juicio/esperanza) + su lenguaje
figurado. El paso 3 traza el oráculo y su TIPO de mensaje (¿censura? ¿promesa? ¿predicción?).

**Pieza 3 — Realización de la explicación (tres operaciones):** (a) ubica el mensaje al PRESENTE original
(¿qué le dijo el profeta a SU audiencia? — Terry: portavoz, no almanaque); (b) interpreta el lenguaje
figurado sin sobre-literalizar (cósmico/hiperbólico = realidad histórica o espiritual); (c) maneja el
cumplimiento CON EL MARCO DEL PASTOR — donde el NT señala cumplimiento (típico o directo) se traza; donde
hay cuestión escatológica abierta, el sistema NO impone escuela.

**Pieza 4 — Proposición:** anunciada. Captura el mensaje del oráculo — muchas veces un llamado
(arrepentimiento, esperanza, fidelidad), no un dato sobre el futuro.

**NEUTRALIDAD ESCATOLÓGICA CON TRANSPARENCIA FORMATIVA (decisión del fundador — clave):** el sistema NO se
casa con una escuela escatológica (dispensacional / pacto / premilenial / amilenial). Sirve a pastores de
tradiciones distintas. PERO **para el novato, hace visible qué postura está tomando cuando la toma** — no
para corregirlo hacia una escuela, sino para que SEPA que está eligiendo ("lo que afirmaste es una lectura
premilenial; hay hermanos fieles que lo leen distinto — ¿es consciente tu elección?"). Le enseña a
distinguir "el texto dice" de "mi tradición lee". Sensible al nivel (mismo umbral §4.2): activa para
novato, ligera para pastor con historial. Misma lógica que la confrontación de lectura errónea: juzga si
SABE que elige, no QUÉ elige.

**Descalificadores propios:**
- **D1 — Profecía como almanaque de eventos futuros [TIPO: TRATAMIENTO].** Reducir el oráculo a mapa de
  fechas/eventos, perdiendo el mensaje al presente (Terry: "profecía es historia escrita de antemano" =
  doctrina extraviada). El error más común del género.
- **D2 — Sobre-literalizar el lenguaje figurado [TIPO: CONTENIDO].** Tomar el lenguaje poético-cósmico
  literalmente cuando describe juicio histórico o realidad espiritual (Terry, Isaías 13).
- **D3 — Imponer una escuela escatológica como si fuera el texto [TIPO: CONTENIDO].** Presentar una postura
  contestada como "lo que el texto claramente dice", sin reconocer marcos fieles distintos. NO descalifica
  TENER postura (un dispensacional puede predicar dispensacionalmente y pasar); descalifica ABSOLUTIZARLA.
  Proof-texting escatológico. Contraparte de la transparencia formativa: enseña al novato a ver su postura,
  confronta al que la absolutiza.

---

### 6.7 APOCALÍPTICO — SELLADO

**Fuentes:** Zuck (*apokalypsis* = revelación; escrito en exilio/opresión — Ezequiel/Daniel en Babilonia,
Juan en Patmos; propósito: desafiar y animar al pueblo oprimido; 4 rasgos: visiones elaboradas, muchos
símbolos, ángel intérprete, futuro lejano; **regla del símbolo:** literal salvo que sea imposible/ilógico,
respetando la auto-interpretación del texto). Terry ("doble visión de juicio y salvación"; divisiones en
cuatros y sietes; **la regla suprema: distinguir la FORMA simbólica de la SUSTANCIA/verdad** — confundirlas
sobrecarga la Revelación).

**Pieza 1 — Rango de puntos:** 1 a 4, según la estructura de la visión (bloques: siete iglesias/sellos/
trompetas; patrón macro juicio/salvación). Fusión/división libre.

**Pieza 2 — Fuente de los puntos:** estructura de la visión + patrón juicio/salvación. El paso 3 traza los
bloques y distingue forma (símbolo) de sustancia (verdad).

**Pieza 3 — Realización de la explicación (operación única):** **distinguir la forma simbólica de la verdad
sustancial** (Terry: la regla de mayor énfasis). Regla operacional de discernimiento de símbolo (Zuck, OK
del fundador): **literal salvo que tomado literalmente sea imposible/ilógico**, respetando cuando el texto
se auto-interpreta (ej. "águila que grita" → símbolo; "prostituta sobre siete montes" → símbolo, el texto
dice que los montes son reyes; "silencio en el cielo media hora" → normal). No simbolizar todo porque hay
algunos símbolos.

**Pieza 4 — Proposición:** anunciada. Captura el CONSUELO/DESAFÍO al pueblo de Dios (propósito original —
animar al oprimido), no un dato del calendario profético.

**Descalificadores propios:**
- **D1 — Simbolizar todo o literalizar todo [TIPO: CONTENIDO].** Los dos errores gemelos (Zuck). Vara: la
  regla literal-salvo-imposible + auto-interpretación del texto.
- **D2 — Descifrado especulativo del calendario [TIPO: TRATAMIENTO].** Convertir el apocalíptico en mapa de
  eventos actuales (la bestia = un político; las langostas = los turcos — ejemplo de Zuck). Pierde el
  propósito pastoral. Pariente intensificado del "almanaque" de profecía.
- **D3 — Imponer escuela escatológica como el texto [TIPO: CONTENIDO].** Heredado de profético, aquí MÁS
  crítico (Apocalipsis/Daniel = campo de batalla escatológico). Neutralidad con transparencia formativa: el
  sistema no impone premilenial/amilenial/preterista/futurista; para el novato hace visible qué postura toma.

**Número simbólico — ABIERTO (neutralidad, OK del fundador):** Terry ("vacilar antes de insistir en lo
literal donde abundan números simbólicos") vs Zuck (si 144.000 es simbólico, ¿por qué 7.000 no?). Tensión
real entre fieles. El sistema NO resuelve — presenta que el número puede leerse simbólica o literalmente
según el marco; para el novato marca que toma postura. (El fundador es dispensacional pero eligió
neutralidad, igual que en profético.)

---

### 6.8 LEGAL (ley mosaica) — SELLADO

**Fuentes:** Zuck (dos tipos de material legal: **apodíctica** — mandatos directos, empiezan con "No", los
Diez Mandamientos, Levítico; **casuística** — ley caso por caso, introducida por condición "si un hombre…";
ninguna es exhaustiva — aplican por principio a casos análogos. **El problema central NO es la estructura,
es la TRANSFERIBILIDAD:** los 3 criterios de McQuilkin). Terry (advertencia contra alegorizar la ley —
Clemente de Alejandría con las leyes de alimentos).

**El corazón del perfil — transferibilidad (los 3 criterios de McQuilkin, vía Zuck):**
1. **Permanente/transferible:** repetible, no-revocado, moral/teológico, repetido en otras partes (pena
   capital Gn 9:6 con su razón dada; amar al prójimo Lv 19:18 repetido 6× en el NT; 9 de 10 mandamientos
   repetidos en el NT, con estándar más alto).
2. **No transferible:** circunstancias no repetibles, o revocado (leyes alimentarias anuladas — Hechos 10;
   sacerdocio aarónico obsoleto — Heb 7:12; práctica nazarea revocada — 1 Co 11:14).
3. **Solo el principio transfiere:** entorno cultural parcialmente similar (beso santo → abrazo en
   Latinoamérica; el principio es amistad/amor, no la forma).

**Pieza 1 — Rango de puntos:** 1 a 3. Una ley/precepto a fondo, o agrupación temática de leyes afines.
Los puntos salen del precepto y su fundamento (la razón que la ley da, cuando la da).

**Pieza 2 — Fuente de los puntos:** el precepto (apodíctico/casuístico) + su razón/fundamento. El paso 3
en legal identifica el tipo de ley y **pregunta la transferibilidad** (¿moral permanente? ¿ceremonial
anulada? ¿civil con principio transferible?).

**Pieza 3 — Realización de la explicación:** expone el precepto en su contexto original (¿qué demandaba a
Israel y por qué?) y **traza la transferibilidad al oyente hoy** con los criterios de McQuilkin. La
explicación exegética incluye el fundamento (muchas leyes dan su razón — imagen de Dios, santidad).

**Pieza 4 — Proposición:** anunciada. Captura la demanda permanente de Dios que la ley revela (no la letra
ceremonial si fue anulada). Sustantivo singular o plural según agrupe.

**Descalificadores propios:**
- **D1 — Aplicar mal la transferibilidad [TIPO: CONTENIDO].** Los dos errores gemelos: (a) predicar una ley
  ceremonial/civil anulada como vigente hoy (legalismo — "no comas cerdo"); (b) descartar una ley moral
  permanente como "eso era solo para Israel" (antinomianismo). Vara: los 3 criterios de McQuilkin.
- **D2 — Alegorizar la ley [TIPO: CONTENIDO].** Asignar significados místicos a los detalles legales
  (Terry: Clemente con las leyes de alimentos = "el águila indica latrocinio…"). La ley no es alegoría.

---

**GENEALÓGICO — FUERA DEL CATÁLOGO (decisión del fundador, con razón documentada).** Ni Zuck ni Terry le
dan tratamiento de género predicable propio (solo mención de pasada — Crónicas con propósito teológico
selectivo). Las genealogías casi nunca se predican solas: se integran a una narrativa o argumento. Forzar
un perfil sin respaldo de las fuentes sería inventar vara. **Regla:** una genealogía predicada
específicamente (ej. Mateo 1 como sermón sobre la fidelidad de Dios a través de generaciones) se trata bajo
el perfil NARRATIVO (es un relato de la providencia de Dios en el tiempo). No necesita perfil propio.
Registrar en byblos.

---

## 7. CATÁLOGO DE GÉNEROS — COMPLETO

8 perfiles sellados: epístola, narrativa, parábola, sapiencial (marca proverbial/reflexiva), poesía (marca
por categoría de salmo), profético, apocalíptico, legal. Genealógico → fuera (se trata como narrativo).
Cantares → diferido (deuda byblos, agregable sin tocar mecánica).

**Vuelve a la mesa el gran pendiente:** revisión criterio-por-criterio del catálogo de compliance del juez
(`approach-compliance-criteria.md`), ahora enriquecido con lo que emergió del trabajo por género:
severidad (crítica/estándar), tipo (contenido/tratamiento), y los descalificadores específicos por género.

## 9. Revisión del catálogo del juez — decisiones (EN CURSO)

Revisión criterio-por-criterio de `approach-compliance-criteria.md` (estado real volcado por CC: 6 formas +
G1/G2/G3 + E3-refina-G2 + C4 narrativo; SIN severidad/tipo aún — se agregan aquí).

### 9.1 Armonización forma ↔ género: CATÁLOGOS HERMANOS (opción A, sellada)
El juez es COMPOSITOR de tres fuentes, no lector de un catálogo:
1. Globales (G1/G2/G3/G4) — de `approach-compliance-criteria.md`.
2. Criterios + descalificadores de la FORMA elegida — de `approach-compliance-criteria.md` (`porEnfoque`).
3. Descalificadores del GÉNERO del pasaje — de `genre-compliance-criteria.md` (NUEVO, hermano).
Cada catálogo = data editable independiente. Invariante forma≠género respetado (archivos separados).
Jerarquía etapa 5: género es piso innegociable, forma es énfasis. SOLID: cada catálogo una responsabilidad;
el juez compone. Un 4º eje futuro = una fuente más, no reescritura (abierto/cerrado).
**El catálogo hermano de género lo EXTRAE CC** de los 8 perfiles sellados (§6) al ADR; el fundador revisa
después. No se redacta a mano — es extracción, no diseño nuevo.

### 9.2 G4 — proof-texting sube a GLOBAL (Camino 2, sellado)
**G4 — proof-texting: usa un texto que no respalda lo que el sermón afirma.** Citar o apoyarse en un pasaje
(o paralelo, o autoridad) que, leído en contexto, NO dice lo que el predicador afirma. Distinto de G3: G3 =
"el texto no gobernó el contenido" (impuso su idea); G4 = "el texto citado no dice eso" (la evidencia no
sostiene). Puedes cometer G3 sin G4 y G4 sin G3. **Severidad: CRÍTICA** (alimenta la teología de
prosperidad; el proverbio-como-promesa es un caso de G4). El detector de proof-texting + motor de tres
testigos son su maquinaria. Le da rango de primera clase al diferenciador central del producto.
- E1 teológico → `refina: 'G4'` (verso de percha sin exégesis = proof-texting).
- E1 temático → `refina: 'G3'` (la CAUSA sellada es imponer el tema; G4 lo caza transversal si además proof-textea).
- E2 apologético → `refina: 'G3'` (abandona el texto).

### 9.3 G4 de DOBLE CARA — confronta Y ayuda (sellado, clave para productividad)
G4 NO puede ser solo un muro. Un pastor novato sin experiencia para hallar los aros concéntricos correctos,
rechazado sin ayuda, se frustra o aprende a esquivar el gate. Las dos caras (mismo motor de citas como
servicio, en ambas direcciones):
1. El sistema pregunta al pastor qué paralelos ve (labor primero).
2. **El sistema PROPONE candidatos** — busca en el canon textos que comparten la ENSEÑANZA (no solo la
   palabra): misma palabra del autor en otro libro, misma doctrina en otro lugar.
3. Todo paralelo (del pastor o sugerido) pasa por el motor de citas que verifica relevancia.
4. G4 dispara SOLO cuando un apoyo queda en el sermón SIN verificar — NO cuando el pastor no lo encontró
   solo. Aceptar un paralelo sugerido y verificado CUMPLE G4, no lo viola.
**G4 no castiga la falta de experiencia — castiga la afirmación no sostenida que llega al púlpito.** El muro
es el último recurso, no el primero.

### 9.4 Principio nuevo — DOS CLASES DE AYUDA (sellado, aplica a todo el sistema)
- **Ayuda formativa:** se RETIRA con la experiencia (umbral de sermones §4.2); su fin es que el pastor
  aprenda a hacerlo solo (leer género, formar proposición, guía socrática de género/escatología).
- **Ayuda de amplificación:** permanece SIEMPRE generosa; suple una limitación estructural humana que la
  experiencia no resuelve (buscar en los 66 libros por enseñanza compartida — ni el experto tiene el canon
  indexado en la cabeza). **La ayuda de G4 (sugerir aros concéntricos) es de amplificación — siempre
  generosa, todos los niveles.** Amplifica la voz del pastor sin originarla. La distinción dice al sistema
  cuándo retirar andamiaje y cuándo no.

### 9.5 Severidad + tipo de cada descalificador de forma (SELLADO)

Validado por el fundador (su criterio coincide). Cada descalificador de forma gana `severidad`
(`critica | estandar`) y `tipo` (`contenido | tratamiento`):

| Descalificador | Severidad | Tipo | Nota |
|---|---|---|---|
| E1 temático (impone el tema) | crítica | contenido | falla que define la infidelidad temática |
| E1 pastoral (consuelo falso que evade el texto) | estándar | contenido | |
| E2 pastoral (aplicación sin anclaje) | estándar | contenido | |
| E3 pastoral (terapia sin cruz, `refina:'G2'`) | crítica | contenido | |
| E1 teológico (proof-texting, `refina:'G4'`) | crítica | contenido | hereda crítica de G4 |
| E2 teológico (especulación sin respaldo) | crítica | contenido | |
| E1 apologético (hombre de paja) | estándar | tratamiento | cómo trata la objeción |
| E2 apologético (gana la discusión, pierde el pasaje, `refina:'G3'`) | estándar | contenido | |
| E1 evangelístico (moralismo/decisionismo) | crítica | contenido | traiciona el evangelio |
| E2 evangelístico (manipulación emocional) | crítica | tratamiento | |
| E1 narrativo (moraliza/caricaturiza) | crítica | contenido | |
| E2 narrativo (drama por drama) | estándar | tratamiento | |

**Globales:** G1 (FCF), G2 (cristocentrismo), G3 (expositividad) — severidad a definir junto con el umbral;
G4 (proof-texting) = **crítica** (ya sellado, §9.2). Los descalificadores de género (catálogo hermano) traen
su severidad/tipo desde los perfiles (§6) — CC los extrae con esos campos.

### 9.6 Umbral de cumplimiento — SELLADO

Los criterios de cumplimiento (C) ganan severidad: **esencial** (su sola ausencia descalifica) o **esperado**
(su ausencia baja calidad, no descalifica sola).

**Cumple = TODOS los esenciales en `yes` + MAYORÍA de los esperados en `yes` + CERO descalificadores
disparados.** (Usa la maquinaria de severidad ya sellada, no inventa nada.)

- **C4 narrativo (redención) = esencial.** Su ausencia descalifica aunque C1-C3 (arco, movimiento,
  aterrizaje) pasen — sin la trayectoria a Cristo es drama moral, no sermón cristiano.
- El resto de criterios C: por defecto esperados salvo que el fundador los marque esenciales (pocos y
  esenciales por naturaleza; se afina al extraer/revisar cada forma).

**INVARIANTE INNEGOCIABLE — ningún criterio esencial sin ayuda formativa upstream.** Si un criterio es
esencial (descalifica), el sistema DEBE tener su ayuda formativa antes del juez (en paso 3 / construcción de
proposición / desarrollo del movimiento). Un esencial sin andamiaje upstream es un MURO, y está prohibido
por diseño. La severidad esencial de un criterio OBLIGA la existencia de su ayuda. Razón (fundador): el juez
es la ÚLTIMA red, no la primera vez que el pastor oye la exigencia. Si un pastor llega al juez fallando C4,
el problema es que el wizard no lo cuidó socráticamente antes — bug del sistema, no falla del pastor a
castigar. Preach es MAESTRO (acompaña durante), no EXAMINADOR (reprueba al final).

**Costo de rigor acotado:** el juez confronta, no bloquea (§8). "No cumple" = advertencia que el pastor
reconoce y puede pasar, no muro. Un falso "no cumple" es una advertencia, no un bloqueo.

### 9.7 Globales — severidad y redacción de G2 (SELLADO)

**Los CUATRO globales son severidad CRÍTICA.** No son criterios de calidad — son las líneas rojas de
fidelidad. Violar cualquiera es falla de fondo, no defecto de ejecución.
- **G1 (sin FCF)** = crítica.
- **G2 (telos cristológico)** = crítica — redacción corregida abajo.
- **G3 (no expositivo)** = crítica — la condición de fidelidad; si el texto no gobernó, lo demás da igual.
- **G4 (proof-texting)** = crítica (ya §9.2).

**G2 corregido — de cristocéntrico a CRISTOTÉLICO (decisión del fundador):**
> **G2 — no traza el telos cristológico (la manera en que el pasaje apunta a Cristo):** el sermón no ubica
> el texto en su trayectoria hacia la culminación en Cristo y su obra redentora, DONDE la trayectoria
> canónica lo sostiene.

Razón: "cristocéntrico" se abusa como "cada texto habla de Cristo" → empuja a EISEGESIS (forzar tipologías/
alegorías donde no están). "Cristotélico" (*telos* = meta/fin) es más preciso: cada texto APUNTA hacia
Cristo desde su lugar en la historia de la redención (Lc 24:27,44), sin forzar cristología en cada frase.
Respeta la histórico-gramatical: el sentido original gobierna (G3) y su telos es Cristo. La cláusula "donde
la trayectoria canónica lo sostiene" protege contra eisegesis — G2 NO dispara cuando el pastor respeta que
un texto no tiene conexión cristológica directa (ej. proverbio); solo dispara cuando la deja sin telos donde
la trayectoria SÍ lo tiene. Forzar a Cristo donde no está sería violación de G3 — así cristotélico mantiene
G2 y G3 coherentes en vez de enfrentarlos. Consistente con C4 narrativo (ya era lenguaje cristotélico). La
glosa entre paréntesis = dual-register: término técnico + accesible al pastor.

### 9.8 Segundo descalificador del temático — SELLADO (cierra la revisión)

Resuelve la asimetría (el enfoque más expuesto a proof-texting tenía solo E1). Nuevo:
- **E2 temático — yuxtapone sin sintetizar:** reúne varios textos sobre el tema pero los LISTA en vez de
  mostrar cómo se corrigen, matizan y ordenan entre sí; cada texto queda como compartimento aislado.
  Distinto de E1 (imponer el tema): aquí el pastor no impuso idea preconcebida, simplemente no hizo el
  trabajo de síntesis que el temático fiel exige (falla el propio C2). **Severidad: estándar** (falta de
  rigor, no traición; la ayuda socrática debe prevenirlo upstream). **Tipo: tratamiento.**
- Candidato "descontextualizar por conveniencia temática" DESCARTADO — redundante con G4 (proof-texting
  global ya lo caza transversalmente).

Temático ahora tiene 2 descalificadores propios (E1 imposición + E2 yuxtaposición) + 4 globales + G4. Red
proporcional a su riesgo.

---

## ✅ REVISIÓN DEL CATÁLOGO DEL JUEZ — COMPLETA

Todo lo de §9 sellado: catálogos hermanos (forma + género + globales, el juez compone) · G4 proof-texting
global crítico de doble cara · dos clases de ayuda (formativa se retira / amplificación permanece) ·
severidad+tipo de los 12 descalificadores de forma · umbral (esenciales todos + esperados mayoría + cero
descalificadores) · invariante "ningún esencial sin ayuda upstream" · 4 globales críticos · G2 cristotélico ·
E2 temático.

**El diseño de Redacción v2 está COMPLETO.** Lo único que resta es material de implementación para el ADR
(no diseño): que CC extraiga el catálogo hermano de género, materialice los campos severidad/tipo, y proponga
el plan por fases. Ver §10.

## 8. Etapa 5 — Mecánica del juez (SELLADA)

El juez corre en la etapa 5 (ensamble + confrontación pre-publicación). Reúsa la infraestructura de shadow
ya construida — NO es infraestructura nueva.

### 8.1 Qué juzga (tres capas de vara)
1. **Globales G1/G2/G3** (FCF, cristocentrismo, expositividad) — a TODO sermón.
2. **Criterios de la forma homilética elegida** (C/E del catálogo `approach-compliance-criteria.md`).
3. **Descalificadores del género del pasaje** (los D de los 8 perfiles), cada uno con `severidad`
   (crítica/estándar) y `tipo` (contenido/tratamiento).

### 8.2 Relación forma ↔ género (decisión de tesis del fundador — ESTRUCTURAL)
**El género es PISO INNEGOCIABLE; la forma es el ÉNFASIS que el pastor elige dentro de ese piso.** El texto
manda siempre. Puedes predicar un texto profético en forma pastoral, pero NO puedes violar los
descalificadores del profético (no sobre-literalizar) aunque tu forma sea pastoral. El género pone los
límites; la forma decide el énfasis dentro de ellos. Es expositividad (G3) hecha arquitectura: elegir cómo
enfatizar, no traicionar lo que el género demanda.

### 8.3 Los tres estados del veredicto
- **Limpio:** globales pasan, mayoría de criterios de forma en `yes`, cero descalificadores disparados. Se
  ensambla sin advertencia.
- **Con advertencia:** disparó algo de severidad ESTÁNDAR, o hay `unclear`. Se ensambla con advertencia
  registrada y visible al pastor. Confronta, no bloquea.
- **Confrontación fuerte:** disparó un descalificador de severidad CRÍTICA (proverbio-como-promesa, cita
  inventada, imponer escuela escatológica como el texto). Se puede publicar (NO bloqueamos — el pastor es el
  predicador), pero exige **RECONOCIMIENTO ACTIVO**: el pastor confirma "vi esto y decido proceder", no
  puede pasar de largo. Queda registrada con peso.

### 8.4 Reglas de los atributos
- **Severidad** cambia el estado del veredicto (crítica → confrontación fuerte con reconocimiento activo;
  estándar → advertencia). Es el atributo que gobierna la gradación.
- **Tipo** (contenido/tratamiento) es DIAGNÓSTICO — informa al pastor qué clase de problema tiene, NO cambia
  el peso del veredicto. La severidad pesa; el tipo informa.
- `unclear` → cola de revisión, no cuenta como cumplido ni como violación (fail-closed, no infla tasa).

### 8.5 Shadow primero (disciplina innegociable)
El juez del sermón ARRANCA como shadow puro (mide, no confronta) hasta tener datos que muestren que adjudica
bien. La confrontación visible al pastor se activa DESPUÉS. Misma disciplina que todo lo construido.
**Reúsa la infraestructura existente:** recorder de #390 (mergeado), contrato `DraftShadowSignal`, colector
juez con `kind:'judged'` + fail-closed a `unclear`, disciplina 036. El juez emite sus veredictos
(limpio/advertencia/crítica) como señales al mismo recorder, en shadow, y solo cuando los datos validen su
adjudicación se activa la confrontación. **Se cierra el círculo: la instrumentación construida para auditar
el generador viejo es la que mide y luego gobierna el juez nuevo.**

### 8.6 Pendiente de esta etapa
- La combinación exacta "mayoría/todos" de criterios de forma en `yes` — se afina en la revisión
  criterio-por-criterio del catálogo (§9).

## 10. Pendientes de diseño (lo único que resta antes del ADR)

- **Revisión criterio-por-criterio del catálogo del juez** (`approach-compliance-criteria.md`): la ÚLTIMA
  pieza. Enriquecer con severidad + tipo + armonizar con los 8 perfiles de género. El fundador revisa cada
  criterio; el copiloto marca huecos estructurales. Incluye afinar el umbral "mayoría/todos" de §8.6.
- **Vara de "análisis estructural suficiente"** (§4.5) — catálogo editable sensible al género (qué hace
  "suficiente" el paso 3 por género). Puede resolverse dentro del ADR o como pieza aparte.

## 11. Deuda consciente / notas para byblos

### 11.0 Gap de enum de género — RESUELTO (Fase 0 del ADR)
El enum real `LiteraryGenre` (`BookPanorama.ts:68`) tiene 9 valores: epistle, narrative, poetry, prophecy,
wisdom, gospel, apocalypse, law, mixed. Reconciliación con los 8 perfiles de diseño (decisiones del fundador):
- **`gospel` se DISUELVE** en sus géneros internos (no es género propio): narrativas del evangelio → narrativa;
  parábolas → parábola; **discursos de enseñanza de Jesús (Sermón del Monte, discurso escatológico, aposento
  alto) → epístola/argumentativo** (con override socrático a sapiencial si la perícopa es aforística).
- **`parable` se AÑADE** al enum (existe como perfil sellado, faltaba en el código).
- **`mixed` NO necesita perfil propio** — es el disparador natural del override socrático de género: el
  detector marca `mixed`, el sistema pregunta al pastor "¿cuál género gobierna tu perícopa?", el pastor elige
  el dominante. La perícopa manda.
- **Matiz de nomenclatura para CC:** el perfil "epístola" es en realidad el perfil del DISCURSO LÓGICO/
  argumentativo (venga de Pablo o de Jesús) — el nombre "epístola" es estrecho para lo que cubre. Considerar
  nombrarlo `argumentativo` o `discurso-lógico` al materializar. Mismo perfil, alcance más amplio que "cartas".
- Invariante: el enum de género y el catálogo hermano de género deben ser el mismo conjunto (test CI).

- Umbral único (§4.2): un solo umbral, dos consumidores. No duplicar.
- El sermón lee `PassageProfile`, no re-deriva género (evita 2ª fuente de verdad).
- La transición-repite-proposición es método del fundador, no bug — no "arreglar".
- Gap de override de género (§4.4): hoy el pastor no confirma género; el rediseño lo agrega.
- **INVARIANTE — dos catálogos distintos, NO forzar que coincidan:** (a) **formas homiléticas** (elige el
  pastor): temático, pastoral, teológico, apologético, evangelístico, narrativo — 6. (b) **géneros del
  pasaje** (`PassageProfile.genres`, gobierna estructura): epístola, narrativa, parábola, sapiencial,
  poesía, profético, apocalíptico, legal/genealógico. El género es realidad del texto; la forma es decisión
  del predicador. Un pasaje narrativo puede predicarse con forma pastoral o teológica. NO son el mismo
  conjunto y no deben forzarse a coincidir (riesgo tipo `homileticalApproach`). Registrar en byblos.
- **Cantares diferido:** el catálogo-dato permite agregarlo sin tocar mecánica (abierto/cerrado). Deuda
  funcional consciente. Merece discusión hermenéutica cuidadosa (alegorización). Registrar en byblos.
- **Patrón de severidad de descalificadores:** campo `severidad` (`critica | estandar`) como dato editable
  por descalificador, aplica a todo el catálogo del juez. No hardcode. Activado por el perfil sapiencial
  (proverbio-como-promesa = crítica). Qué hace con el veredicto se decide en etapa 5.
- **Patrón de tipo de descalificador:** campo `tipo` (`contenido | tratamiento`). Contenido = qué dice el
  sermón; tratamiento = cómo trata el texto (aplanar poesía, receta narrativa, descifrar apocalíptico).
  Activado por poesía. El juez gana segunda dimensión de fidelidad.
- **Genealógico fuera del catálogo:** no es género predicable propio (sin respaldo en Zuck/Terry); se trata
  como narrativo cuando se predica. Decisión consciente. Registrar en byblos.
- **Neutralidad escatológica con transparencia formativa** (profético/apocalíptico): el sistema no impone
  escuela; para el novato hace visible qué postura toma. El fundador es dispensacional pero eligió neutralidad.
