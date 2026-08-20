# Criterios de cumplimiento por enfoque — la vara del juez de fidelidad homilética

> Para revisión del fundador, criterio por criterio, ANTES de armar el juez. Es la
> vara de fidelidad, no la define el modelo. Viven como DATO editable (catálogo
> domain, movible a config Firestore). NO en el prompt del juez hardcodeados.

## ⚙️ MATERIALIZADO EN CÓDIGO (2026-08-20) — este archivo ya no es la fuente de verdad

La revisión criterio-por-criterio que este documento pedía **está cerrada** (`redaccion-v2-diseno.md`
§9.1–§9.8, sellada 2026-07-08). Lo que aquí abajo se describe sin severidad ni tipo vive ahora, CON esos
campos, como dato editable en el dominio:

| Pieza | Dónde |
|---|---|
| Globales G1–G4 + las 6 formas (C y E, con severidad/tipo/refina) | `packages/domain/src/sermon-judge/approachComplianceCatalog.ts` |
| Catálogo HERMANO de género (los D de los 8 perfiles de §6) | `packages/domain/src/sermon-judge/genreComplianceCatalog.ts` |
| Composición de las tres capas para un sermón concreto | `composeJudgeRubric.ts` |
| Umbral (§9.6) y los tres estados del veredicto (§8.3) | `evaluateCompliance.ts` |

**Lo que cambió respecto del texto de abajo, y que este archivo todavía no reflejaba:**

- **G4 — proof-texting subió a GLOBAL** (§9.2). Abajo solo aparecen G1/G2/G3.
- **G2 se redactó de nuevo como CRISTOTÉLICO** (§9.7): "no traza el telos cristológico… DONDE la
  trayectoria canónica lo sostiene". La cláusula condicional es la que impide que G2 empuje a eisegesis.
- **Los cuatro globales son severidad CRÍTICA** (§9.7).
- **Los 12 descalificadores de forma ganaron `severidad` + `tipo`** (§9.5).
- **Temático ganó E2 — yuxtapone sin sintetizar** (§9.8).
- **El umbral se cerró** (§9.6): TODOS los esenciales en `yes` + MAYORÍA de los esperados + CERO
  descalificadores. C4 narrativo es el único esencial sellado. Abajo todavía dice "mayoría/todos", que era
  justamente el pendiente de §8.6.
- **Invariante nuevo:** ningún criterio esencial sin ayuda formativa upstream. Un esencial sin andamiaje es
  un muro, y está prohibido por diseño — un test rompe CI si falta.

Este documento se conserva como el **razonamiento** de por qué cada criterio es lo que es (la corrección de
categoría de `expositivo`, las promesas de cada forma, el trato de los estudios legados). Para editar la
vara, se edita el catálogo en dominio.

---

## Corrección de categoría (2026-07-06) — leer antes que nada

La investigación Fase 0 del enum destapó un error más profundo que el accidente del
4→6: **`expositivo` nunca debió ser una forma del catálogo.** Expositividad no es una
forma paralela a temático o pastoral — es la **condición de fidelidad que toda forma
debe cumplir**: un sermón es expositivo cuando el TEXTO gobierna el contenido (mensaje,
énfasis, doctrinas y aplicaciones surgen del sentido correcto de la Escritura; la voz
del predicador se somete a la del texto). Eso aplica a las seis formas por igual.

Consecuencias, ya decididas (byblos):
- **Expositivo sale del catálogo de formas → se vuelve descalificador global G3.**
- **Tópico no es una forma** — es el nombre de la temática NO expositiva, o sea la
  falla misma. Cubierto por el descalificador del temático + G3. No entra al catálogo.
- **Temático vuelve** como forma legítima, con su descalificador redactado sobre la
  CAUSA (imponer el tema sobre los textos), no el síntoma (proof-texting).

Catálogo de formas resultante (seis, distinto al anterior): **temático, pastoral,
teológico, apologético, evangelístico, narrativo.**

## Reglas de adjudicación (comunes)

- Cada `criteriosCumplimiento` → juez adjudica `yes | unclear | no` CONTRA el criterio
  explícito (no "¿te parece?").
- Cada `criteriosDescalificacion` → juez adjudica `disparado | no-disparado`. Si
  cualquiera dispara → **NO cumple**, aunque C1-Cn estén en `yes`. Presencia ≠ fidelidad.
- **Cumplimiento = mayoría/todos los cumplimiento en `yes` Y cero descalificadores
  (G o E) disparados.**
- Cualquier criterio en `unclear` → **cola de revisión**, no cuenta como cumplido ni
  como violación (fail-closed, no infla la tasa).
- El juez es shadow-only, muestreado, aislado del determinista.

## Prerrequisito BLOQUEANTE: consolidar el enum a una fuente de verdad

El juez NO se arma hasta que `ApproachType` sea el único enum, con las **seis formas
nuevas** (temático, pastoral, teológico, apologético, evangelístico, narrativo). Hoy el
sistema es incoherente consigo mismo: el pastor elige entre 6, pero el prompt le pide a
Gemini emitir el legado inglés de 4 (`prompts-generator.ts:215`), `useDraftRefinement`
compara contra `thematic`/`topical` que la UI ya no emite, y la selección escribe vía
`as any` (apaga el chequeo de tipos en la decisión estructural más importante del
sermón). Consolidar primero: retipar `homileticalApproach` → `ApproachType`, matar el
`as any`, alinear schema + refinación + selección, back-compat de data vieja
(`thematic`→`temático` limpio, `topical`→`temático` marcado). El juez lee la vara sobre
un solo enum, sin tabla de traducción. Ver decisión en byblos.

---

## Descalificadores GLOBALES (aplican a las SEIS)

Transversales — un solo lugar, DRY. Si cambian, cambian para todas.
- **G1 — sin FCF**: no traza la condición caída / incapacidad del oyente que el texto
  expone (moraliza: lista de mandatos sin la brecha).
- **G2 — sin centralidad cristológica cuando el texto la sostiene**: no resuelve en la
  obra redentora de Cristo.
- **G3 — no expositivo (el texto no gobernó el contenido)**: el predicador impuso su
  idea y usó el texto de excusa, en vez de someter mensaje, énfasis, doctrinas y
  aplicaciones al sentido correcto de la Escritura. Es la condición de fidelidad
  transversal: separa cualquier forma fiel de su versión infiel. La pregunta que el
  juez le hace a TODO sermón, sea cual sea su forma: ¿el texto gobernó el contenido, o
  el predicador impuso su idea y usó el texto de excusa?

Cada forma tiene, ADEMÁS, sus descalificadores específicos abajo.

---

## temático — promesa: desarrolla un TEMA dejando que la Escritura lo defina

El problema nunca fue predicar sobre un tema; fue imponer el tema sobre la Biblia en
vez de dejar que la Biblia defina, corrija y ordene el tema. Un sermón sobre la oración
que estudia Mateo 6, Lucas 11, Efesios 6 y Santiago 5 respetando contexto e intención
es temático Y expositivo.

**Cumplimiento:**
- C1: reúne varios textos alrededor de un tema y respeta el contexto e intención de CADA uno.
- C2: deja que los textos DEFINAN, CORRIJAN y ORDENEN el tema (el tema emerge de la Escritura, no al revés).
- C3: la síntesis final es fiel a lo que los textos dicen juntos, no a una idea preconcebida.

**Descalificadores específicos (además de G1/G2/G3):**
- E1: **impone el tema sobre los textos** — los usa como apoyo de una idea preconcebida
  en vez de dejar que definan, corrijan y ordenen el tema. (Proof-texting es el SÍNTOMA
  de esto; adjudicamos contra la CAUSA.)

## pastoral — promesa: consuelo/cuidado a la condición del oyente

**Cumplimiento:**
- C1: nombra la condición/lucha real de la congregación.
- C2: aplica el texto como consuelo/cuidado/exhortación a ESA condición.
- C3: tono pastoral, dirigido a la situación del oyente (no lección abstracta).

**Descalificadores específicos (además de G1/G2/G3):**
- E1: consuelo falso/terapéutico que evade el llamado del texto — suaviza lo que el texto confronta.
- E2: aplicación sin anclaje — consejos genéricos no derivados del pasaje.
- E3 (`refina: 'G2'`): **consuelo sin la obra de Cristo** — cuidado que se siente bien
  pero nunca llega a la cruz. NO es duplicación de G2: G2 pregunta "¿evadió a Cristo?"
  genérico; E3 pregunta "¿fue terapia disfrazada aunque mencione a Cristo de pasada?".
  Un pastoral puede pasar G2 y fallar E3. Redes de distinto calibre para el pez que
  más se escapa en este enfoque. **Relación jerárquica explícita en la data (`refina:
  'G2'`)** — quien edite G2 mañana ve que hay una especialización aguas abajo.

## teológico — promesa: inmersión doctrinal

**Cumplimiento:**
- C1: desarrolla una doctrina/tema teológico con rigor (define términos, la traza).
- C2: la conecta con la teología bíblica más amplia (categorías sistemáticas / otros pasajes).
- C3: la doctrina está ANCLADA en el pasaje, no flota libre.

**Descalificadores específicos (además de G1/G2/G3):**
- E1: proof-texting — usa el verso de percha para colgar la doctrina sin exégesis del pasaje.
- E2: especulación sin respaldo — afirma sobre Dios lo que el texto (y la Escritura) no dice.

## apologético — promesa: defiende la fe / responde objeciones

**Cumplimiento:**
- C1: plantea una objeción/duda real.
- C2: la responde desde el texto + razón.
- C3: presenta la objeción con justicia (no un hombre de paja).

**Descalificadores específicos (además de G1/G2/G3):**
- E1: hombre de paja — caricaturiza la objeción para tumbarla fácil.
- E2: gana la discusión pero pierde el pasaje — se va a la apologética abstracta y abandona el texto.

## evangelístico — promesa: llama al no-creyente a Cristo

**Cumplimiento:**
- C1: presenta el evangelio con claridad (condición, Cristo, respuesta).
- C2: se dirige al no-creyente.
- C3: hace un llamado claro a responder.

**Descalificadores específicos (además de G1/G2/G3):**
- E1: moralismo/decisionismo — llama a "portarse bien" o a una decisión sin el evangelio de gracia.
- E2: manipulación emocional — presión/culpa sin contenido de cruz.

## narrativo — promesa: traza la historia, movimiento dramático

> Corrección validada contra literatura homilética (Chapell, teología bíblica
> reformada): el arco tensión→resolución es el tratamiento EXPOSITIVO correcto de
> textos narrativos, no un enfoque menos riguroso — pero anclado a la redención: cada
> narrativa juega su papel en la historia de redención en Cristo, y la tensión
> dramática es el VEHÍCULO del FCF, no drama por drama.

**Cumplimiento:**
- C1: sigue un arco narrativo (tensión→resolución).
- C2: usa el movimiento de la historia, no puntos abstractos.
- C3: aterriza el punto de la historia.
- **C4: traza cómo ESTE pasaje narrativo funciona en la historia de la
  redención — trayectoria hacia Cristo, no un arco emocional cerrado en sí mismo.**

**Descalificadores específicos (además de G1/G2/G3):**
- **E1: caricaturiza personajes o moraliza sobre uno traicionando el
  balance del texto** — identificación solo con lo negativo ("no seas como X"). Es la
  falla típica del enfoque según la literatura.
- E2: drama por drama — tensión emocional como fin en sí, no vehículo del FCF/redención.
  (La ausencia de FCF/Cristo la cazan G1/G2; acá se marca el uso del drama como fin.)

---

## Estructura de datos propuesta (para tu OK)

```
ApproachComplianceCatalog = {
  descalificadoresGlobales: { id: string; text: string }[];   // G1 FCF, G2 cristo, G3 expositividad — a las 6
  porEnfoque: Record<ApproachType, {
    promise: string;
    criteriosCumplimiento: { id: string; text: string }[];    // C1..Cn → yes/unclear/no
    descalificadoresEspecificos: {
      id: string;
      text: string;
      refina?: string;   // link jerárquico a un global, ej. E3 pastoral refina 'G2'
    }[];
  }>
}
```

**Estudios legados (enum viejo de 4):** bajo el modelo corregido NO hay huérfanos que
marcar como no-evaluables — temático existe. `thematic` legado → `temático` limpio
(misma forma). `topical` legado → `temático` PERO **marcado para que el pastor
confirme** (era temático mal nombrado; "tópico" bajo el nuevo modelo es la falla, no una
forma), no se fuerza en silencio. `expository`/`narrative` legados → `expositivo` era
condición, no forma: un estudio legado `expository` no dicta una forma — se marca para
que el pastor elija forma (su expositividad la juzga G3, no lo define como forma).
Forzar reescribiría la elección del pastor — el pecado que este módulo mata.

El juez adjudica, por generación: los globales (G1/G2/G3) + los del enfoque elegido
(C + E). Cumplimiento = mayoría/todos los C en `yes` Y cero G/E disparados. Cualquier
`unclear` → cola. DRY: FCF/cristo/expositividad viven una vez (G), cambian en un lugar.

- Catálogo domain (SSOT), llaves = el enum `ApproachType` (invariante en byblos: mismo
  conjunto o el juez queda sin vara). Un test rompe CI si difieren.
- Movible a `config/approachComplianceCriteria` (Firestore) para editar sin deploy —
  igual patrón que otros catálogos-dato.
