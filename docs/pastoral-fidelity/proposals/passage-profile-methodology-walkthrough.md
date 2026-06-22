# Metodología — Cobertura adaptativa del pasaje (perfil + spine + gate)

> **Documento de referencia.** Explica la metodología en lenguaje narrativo + dos ejemplos gráficos
> completos para validación. El **diseño técnico** (schemas, decisiones, alternativas, consecuencias)
> vive en su par: [`passage-profile-adaptive-coverage.md`](./passage-profile-adaptive-coverage.md).
> Mantener ambos sincronizados.

**Estado**: decisiones de diseño cerradas en
[ADR-035](../decisions/ADR-035-passage-profile-adaptive-coverage.md) (`accepted`, 2026-06-22). Sin
implementar. Origen: 2026-06-21, caso disparador 2 Pedro 2:10-22.

---

## 1. El problema en una imagen

El estudio guiado (8 pasos) trata el pasaje como un **string opaco**. En pasajes grandes (15+ versos)
sub-captura lo que el texto realmente contiene:

```
   PASAJE (13 versos, denso)            LO QUE EL MÉTODO CAPTURA HOY
   ┌───────────────────────┐           ┌───────────────────────────┐
   │ 2 Pe 2:10-22          │           │ estructura: 1 cláusula     │
   │  • alusión Balaam     │  ───────► │ paralelos:   máx 3 (cap)   │
   │  • alusión Prov 26:11 │   se      │ ilustraciones: (sin campo) │
   │  • 2 ilustraciones    │  pierde   │ lectura errónea: (nada)    │
   │  • lectura errónea    │           │ alusiones AT: (nada — los  │
   │  • 3 movimientos      │           │   motores ven la REFERENCIA│
   └───────────────────────┘           │   no el TEXTO)             │
                                        └───────────────────────────┘
```

Resultado real: el pastor no pudo enseñar las alusiones AT ni confrontar la lectura errónea
("se pierde la salvación"), y el sermón se armó ciego a todo eso.

---

## 2. Marco conceptual

### No "estocástico" — **condicionado por el pasaje**

Aleatorizar el flujo rompería reproducibilidad y formación. Lo correcto: el método
histórico-gramatical es **invariante**, pero **qué sub-disciplinas pesan varía por género**:

| Género | Qué carga el foco |
|---|---|
| Narrativa | trama, escena, caracterización |
| Epístola (argumento) | conectores lógicos, flujo del argumento |
| Poesía | paralelismo, imágenes, quiasmo |
| Profecía | género + cumplimiento |
| Texto con citas AT | intertextualidad (taxonomía Hays) |

"El camino se adapta al género" **ya es buena hermenéutica** — no relaja el método, lo aplica bien.

### Tres capas sobre un spine intacto

```
   ┌─────────────────────────────────────────────────────────────┐
   │  CAPA 1 · PERFIL DEL PASAJE   (lee el TEXTO, 1 vez, al activar)│
   │  → género, movimientos, features (con ancla si son 'hard')    │
   └───────────────┬─────────────────────────────────────────────┘
                   ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  CAPA 2 · CONTRATO DE COBERTURA                               │
   │  → checklist de "lo que ESTE pasaje exige tratar"            │
   └───────────────┬─────────────────────────────────────────────┘
                   ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  CAPA 3 · SPINE DE 8 PASOS (invariante) + nudges + GATE       │
   │  → cada paso recibe foco/checklist del perfil                │
   │  → al cierre, gate de completitud verifica el checklist      │
   └─────────────────────────────────────────────────────────────┘
```

**Nunca salta pasos.** Solo enriquece el foco dentro de cada paso y verifica al cierre.

---

## 3. Los 8 pasos son invariantes (y por qué 8)

Los 8 pasos son las **operaciones invariantes del método histórico-gramatical**, no categorías de
temas. El perfil cambia el **foco / profundidad / checklist DENTRO** de cada paso, nunca el número.

| # | Paso | Operación |
|---|---|---|
| 1 | Lectura | primera impresión del texto completo |
| 2 | Contexto y Género | género gobierna las reglas de lectura |
| 3 | Análisis Estructural | flujo del discurso / paralelismo según género |
| 4 | Estudio de Palabras | semántica léxica de términos con peso |
| 5 | Reconocimiento canónico | conexiones AT↔NT, alusiones, paralelos |
| 6 | Función | qué hizo el texto a su audiencia original |
| 7 | Principio Atemporal | verdad teológica (puente exégesis→homilética) |
| 8 | Insight | idea homilética en la voz del predicador |

### El "8" no es máximo ni herencia ciega — **ya creció 6→8**

- Empezó en **6** (ADR-002), del tutor griego/hebreo.
- Creció a **8** (ADR-022) agregando dos **operaciones no-opcionales** que faltaban: Contexto/Género
  y Principio Atemporal. Más rename de dos mal nombrados.

**Criterio para crecer** (paso nuevo vs cobertura):
- **Paso nuevo** ⟺ existe una **operación** interpretativa distinta, no-opcional, validada contra el
  manifiesto, que no tiene casa o se conflaciona con otra.
- **Feature de contenido** (alusión, ilustración, lectura errónea) **NO** es paso — es cobertura
  *dentro* de un paso (`routeToStep`).

Crecer cuesta (rename, validators, thresholds, UI, prompt, tests, migración Firestore, orden
no-invertible), por eso el spine crece **raro y vía ADR**. El **catálogo de features** crece seguido
(es dato); el **spine** casi nunca (es operación + migración). Dos ejes distintos.

---

## 4. El catálogo de features (dato, no código)

El pipeline es genérico e itera sobre un catálogo. Agregar/ajustar una feature = editar una entrada,
**nunca tocar el pipeline**.

```ts
interface FeatureType {
  key: 'ot-allusion' | 'theological-tension' | 'common-misreading'
     | 'parallelism' | 'illustration' | 'named-entity' | 'textual-crux';
  kind: 'hard' | 'soft';        // hard = ancla verificable → elegible al gate
  detector: 'rule' | 'llm' | 'curated';
  routeToStep: PastoralSeedStepKey;
  coverageRule: 'must-touch' | 'nudge-only';
  nudgeTemplate: string;        // socrático; NO da la respuesta
}
```

- **`hard`** (alusión AT, ilustración, paralelismo): trae **ancla verificable** (cita, rasgo
  gramatical, hecho de género). Puede entrar al gate como `must-touch`.
- **`soft`** (tensión teológica, lectura errónea): interpretativa. Solo `nudge-only`, **nunca
  bloquea**.

### Feature `common-misreading` (lecturas erróneas frecuentes)

Clase **soft**, enrutada a **confrontación socrática**. **Regla dura anti-alucinación**: solo se
emite si trae **ancla correctiva verificable**. Sin ancla → no se emite.

```ts
CommonMisreading {
  claim:            "el pasaje enseña que se pierde la salvación"
  whyWrong:         "describe falsos maestros que apostatan (v.22:
                     la naturaleza nunca cambió), no regenerados"
  correctiveAnchor: [v.22 metáfora, Jn 10:28-29, 1 Jn 2:19]   // VERIFICABLE
  routeToStep:      function | timelessPrinciple
}
```

El nudge **no da la respuesta**: *"Este pasaje suele leerse como X. ¿Tu lectura lo sostiene o lo
confronta? ¿Qué en el texto lo decide?"*

### Comportamiento: `theological-tension` vs `common-misreading`

Spec de comportamiento (sin ambigüedad de rondas). Ambas retienen al pastor **in-step** vía CONFRONTAR
hasta que se pronuncie con **sustancia** (no una pulsación); ninguna exige acertar, exigen haberlo
trabajado. La diferencia está en si hay un "incorrecto" demostrable.

| clase | ¿hay ancla? | qué hace el agente | nº rondas / re-confronta | umbral para aceptar | override | cierre (gate-cobertura) |
|---|---|---|---|---|---|---|
| `theological-tension` | **No** — no hay lectura "correcta" | señala la tensión real + pide **tomar postura consciente**; no impone cuál | **1 ronda**; **nunca re-confronta** (sería imponer) | pasa el **GATE-MÍNIMO de sustancia** (postura razonada); no exige acertar | N/A — cualquier postura razonada pasa | soft nudge **solo si la ruta no disparó el in-step** (red de seguridad); no bloquea |
| `common-misreading` | **Sí** — ancla correctiva verificable | señala la lectura errónea + confronta **contra el ancla**; no da la respuesta | **1 ronda + máx 1 re-confront** si la postura sustantiva **aún contradice el ancla**; luego override | pasa el **GATE-MÍNIMO de sustancia** primero (si no → orienta "profundiza", NO cuenta como re-confront) | **override floor (ADR-027)** tras la re-confront: insistir queda **registrado**, no bloquea | igual: soft nudge solo como red de seguridad; no bloquea |

**El confront in-step es la red principal**; el gate-cobertura del cierre es **solo red de seguridad**
para rutas de borde que no dispararon el in-step — **no** un segundo punto de fricción.

Flujo `common-misreading` (el más fino):

```
 confront (ancla) ─► respuesta del pastor
                          │
        ┌─────────────────┼─────────────────────────┐
        ▼                 ▼                          ▼
  < sustancia       sustantiva +                sustantiva PERO
  ⛔ GATE-MÍNIMO    engancha el ancla           contradice el ancla
  "profundiza"      ✅ ACEPTA → avanza          🔴 RE-CONFRONT (máx 1)
  (no es re-conf.)                                   │
                                              ┌──────┴───────┐
                                              ▼              ▼
                                        corrige        insiste
                                        ✅ ACEPTA      ⚖ OVERRIDE FLOOR
                                                       (registra, no bloquea)
```

---

## 5. La mecánica de loops

Todos los loops ocurren **dentro del mismo paso**. El perfil **no inventa mecánica** — reusa la que
ya existe; solo inyecta nudges + checklist.

```
╔══════════════════════════════════════════════════════════════════╗
║ ✅ ACEPTAR        respuesta suficiente → persiste → avanza         ║
║ 🟡 ORIENTAR (T1)  "pedir ayuda" o respuesta delgada → datos +      ║
║                   preguntas socráticas (NO da la respuesta)        ║
║ 🔵 SIMPLIFICAR(T2)"explícamelo más sencillo" → baja jerga +        ║
║                   ejemplo del método en OTRO pasaje (ZPD)          ║
║ 🔴 CONFRONTAR     error de método / lectura errónea → nombra el    ║
║                   problema + "¿cómo cambia tu lectura?"            ║
║ ⛔ GATE-MÍNIMO    no cumple umbral (largo/ítems) → "falta X"       ║
║ 🎯 GATE-COBERTURA cierre: checklist incompleto → nudge al paso     ║
║                   dueño del ítem faltante (soft = no bloquea).     ║
║                   NO es gate paralelo: es un colector/sub-reporte  ║
║                   sobre el agregador de publish-gate (Motor B).    ║
╚══════════════════════════════════════════════════════════════════╝
```

Diagrama de un paso cualquiera:

```
        entra al paso
             │
             ▼
      ┌─────────────┐   respuesta del pastor
      │  evaluación │◄────────────────────────┐
      └──────┬──────┘                          │
             │                                 │
   ┌─────────┼───────────┬───────────┐         │
   ▼         ▼           ▼           ▼         │
 ✅ acepta  🔴 confronta ⛔ falta    🟡/🔵 ayuda │
   │         │           │           │         │
   │         └───────────┴───────────┴─────────┘  (loop, mismo paso)
   ▼
 siguiente paso
```

---

## 6. Ejemplo 1 — 2 Pedro 2:10-22 (epístola, grande, densa)

### Paso 0 · Perfil (al activar)

```
┌─ PassageProfile ─────────────────────────────────────────────┐
│ pasaje: 2 Pedro 2:10-22                                       │
│ género: epístola          movimientos: 3                      │
│   M1 v10-16  acusación a falsos maestros (+ Balaam)           │
│   M2 v17-19  su vacío ("fuentes sin agua", falsa libertad)    │
│   M3 v20-22  fin peor + proverbios (perro/cerda)              │
│                                                               │
│ features:                                                     │
│  [hard] ot-allusion  → Balaam hijo de Beor (Num 22-24)  v15   │
│  [hard] ot-allusion  → perro vuelve al vómito = Prov 26:11 v22 │
│  [hard] illustration → fuentes sin agua / nubes        v17    │
│  [hard] illustration → perro/cerda lavada              v22    │
│  [soft] common-misreading → "se pierde la salvación"   v20-22 │
│         ancla: v22 + Jn 10:28-29 + 1 Jn 2:19                  │
│  [soft] theological-tension → juicio vs misericordia          │
└───────────────────────────────────────────────────────────────┘
        ▼ CONTRATO DE COBERTURA
   ☐ alusión Balaam   ☐ alusión Prov 26:11   ☐ 2 ilustraciones
   ☐ confrontar "pierde salvación"   ☐ 3 movimientos
```

### Recorrido (pasos que cargan features)

```
PASO 1 Lectura ───────────────────────────────────────────────
  Pastor: "Habla de gente mala que estaba en la iglesia."
  ✅ ACEPTAR → avanza

PASO 2 Contexto y Género ─────────────────────────────────────
  Agente: "¿Qué género es y cómo cambia tu forma de leerlo?"
  Pastor: "No sé bien... ¿es una profecía?"
        ▼ 🔴 CONFRONTAR (genre-mismatch: el perfil dice epístola)
  Agente: "Es una epístola, no profecía. Pedro denuncia a falsos
           maestros REALES de esa comunidad. ¿Cómo cambia leerlo
           como carta de advertencia y no como predicción?"
  Pastor: "pero no entiendo qué es 'género'"
        ▼ 🔵 SIMPLIFICAR (T2 — ZPD)
  Agente: "Género = el TIPO de texto, como en una biblioteca. Una
           carta se lee distinto a un poema. En Salmos 'el Señor es
           mi roca' es imagen poética; en una carta como esta, las
           palabras son argumento directo. ¿Qué implica que ESTO
           sea una carta?"
  Pastor: "Son instrucciones directas a una iglesia real sobre
           maestros peligrosos, para que los reconozcan."
  ✅ ACEPTAR → avanza   [☑ género: epístola]

PASO 3 Análisis Estructural ──────────────────────────────────
  ⚙ NUDGE perfil: "Tiene 3 movimientos. ¿Cuál es la cláusula
     principal y cómo la sostienen?"
  Pastor: "La idea es que serán juzgados." (corto)
        ▼ ⛔ GATE-MÍNIMO + 🟡 ORIENTAR
  Agente: "Bien, pero falta cómo los 3 bloques lo construyen:
     acusación (v10-16) → vacío (v17-19) → fin peor (v20-22)."
  Pastor: "Primero los acusa, luego muestra que son huecos, y al
           final que terminan peor que antes."
  ✅ ACEPTAR → avanza   [☑ 3 movimientos]

PASO 5 Reconocimiento canónico ───────────────────────────────
  ⚙ NUDGE perfil (lo que ANTES se perdía):
     "Datos — este pasaje ALUDE a:
       • Balaam hijo de Beor (Números 22-24)  v15-16
       • 'perro que vuelve a su vómito' = Proverbios 26:11  v22
      ¿Por qué Pedro los trae?"
  Pastor: "No conocía lo de Proverbios... ¿qué tiene que ver?"
        ▼ 🟡 ORIENTAR (da el DATO, no la interpretación)
  Agente: "Prov 26:11 compara al necio que repite su locura con un
           perro. ¿Qué dice eso de la naturaleza de estos hombres?"
  Pastor: "Que nunca cambiaron — el perro sigue siendo perro."
  ✅ ACEPTAR → avanza   [☑ Balaam ☑ Prov 26:11]
  (sin cap rígido de 3 — el perfil pide los que el texto exige)

PASO 6/7 Función / Principio ─────────────────────────────────
  ⚙ NUDGE soft (common-misreading):
  🔴 CONFRONTAR (socrático, NO da la respuesta):
  Agente: "Ojo: v20-22 suele leerse como que un creyente PIERDE la
           salvación. ¿Tu lectura lo sostiene o lo confronta? Mira
           v22 (la naturaleza del perro/cerda nunca cambió) y
           compara con Juan 10:28-29. ¿Qué decide el texto?"
  Pastor: "Describe a falsos maestros que parecían convertidos pero
           nunca lo fueron, no a hijos de Dios que se pierden."
  ✅ ACEPTAR   [☑ lectura errónea confrontada]

PASO 8 Insight ──────────────── ✅ → estudio completo
```

### Gate de cobertura (cierre)

```
🎯 GATE-COBERTURA  ✔ checklist completo
   ☑ Balaam  ☑ Prov 26:11  ☑ 2 ilustraciones  ☑ misreading
   ☑ 3 movimientos          → Estudio LISTO.

  (Si hubiera saltado Balaam:
   🎯 "Antes de cerrar: no abordaste la alusión a Balaam (v15).
       ¿Quieres volver al Paso 5?"  — nudge, NO bloqueo)
```

---

## 7. Ejemplo 2 — Salmo 23 (poesía, corto) — mismo método, OTRO foco

### Paso 0 · Perfil

```
┌─ PassageProfile ─────────────────────────────────────────────┐
│ pasaje: Salmo 23                                              │
│ género: poesía (salmo de confianza)   movimientos: 2          │
│   M1 v1-4  metáfora del PASTOR                                │
│   M2 v5-6  metáfora del ANFITRIÓN (mesa, copa, casa)          │
│                                                               │
│ features:                                                     │
│  [hard] parallelism  → "delicados pastos // aguas de reposo"  │
│  [hard] illustration → pastor, valle de sombra, mesa, copa    │
│  [soft] common-misreading → "nada me faltará" = prosperidad   │
│         ancla: v4 pasa por el valle de muerte (no es opulencia)│
│  [low]  ot-allusion  → ninguna citación directa relevante     │
└───────────────────────────────────────────────────────────────┘
        ▼ CONTRATO
   ☐ paralelismo poético   ☐ metáforas pastor/anfitrión
   ☐ confrontar "prosperidad"   ☐ 2 movimientos
```

> **Contraste clave**: aquí el Paso 5 (alusiones AT) queda **delgado** — el perfil no infló features
> inexistentes. Pero el Paso 3 carga **distinto**: en vez de "flujo de argumento" pide
> **paralelismo** y el **giro de metáfora**. Mismo paso, foco condicionado por el género.

### Pasos clave con loops

```
PASO 3 Análisis Estructural ──────────────────────────────────
  ⚙ NUDGE perfil (foco poético, NO argumentativo):
     "Es poesía. Fíjate en el PARALELISMO y el cambio de imagen.
      ¿Qué dos metáforas estructuran el salmo?"
  Pastor: "No entiendo qué es paralelismo."
        ▼ 🔵 SIMPLIFICAR (T2)
  Agente: "Paralelismo = la poesía hebrea dice lo mismo dos veces
           con palabras distintas. Ej v2: 'delicados pastos' y
           'aguas de reposo' = la misma idea de provisión, repetida.
           ¿Ves otra pareja así?"
  Pastor: "Sí. Y cambia de pastor (v1-4) a anfitrión en una mesa
           (v5-6)."
  ✅ ACEPTAR   [☑ paralelismo ☑ 2 movimientos]

PASO 5 Reconocimiento ────────────────────────────────────────
  ⚙ perfil: ot-allusion LOW → nudge mínimo
  Agente: "Este salmo no cita el AT directamente. ¿Conoces algún
           pasaje que retome la imagen del pastor?"
  Pastor: "Juan 10, el buen pastor."
  ✅ ACEPTAR  (el paso corre igual aunque sea delgado — chequear ES
              la disciplina; el perfil no lo infló)

PASO 6/7 ─────────────────────────────────────────────────────
  🔴 CONFRONTAR soft (common-misreading):
  Agente: "'Nada me faltará' suele predicarse como prosperidad
           material. Pero v4 pasa por el VALLE DE MUERTE. ¿De qué
           provisión habla realmente el pastor?"
  Pastor: "De su presencia y cuidado en todo el camino, no riqueza."
  ✅ ACEPTAR   [☑ misreading confrontada]
```

### Gate de cobertura

```
🎯 ✔ ☑ paralelismo ☑ metáforas ☑ misreading ☑ 2 movimientos
   → Estudio LISTO.
```

---

## 8. Qué validan los ejemplos

1. **Mismos 8 pasos, foco distinto**: epístola → flujo de argumento + alusiones AT; poesía →
   paralelismo + metáfora. El perfil reenfoca *dentro* del paso (`routeToStep`).
2. **Los loops son los existentes** (orientar / simplificar / confrontar / gate). El perfil solo
   inyecta nudges + checklist; cero mecánica nueva.
3. **El que no sabe contestar** entra a 🔵 T2 (pasos 2 y 3): baja jerga + ejemplo en otro pasaje, y
   vuelve.
4. **Lo que antes se perdía** (Balaam, Prov 26:11, "pierde salvación") ahora tiene nudge + ancla +
   gate.
5. **Paso delgado no se elimina** (Paso 5 en Salmo 23): corre igual, sin inflar — chequear es la
   disciplina.

---

## 9. Mantenibilidad (cómo no se vuelve deuda)

1. **Frontera hard/soft en `kind`** — solo `hard` (con ancla) entra al gate; `soft` solo sugiere. El
   límite queda codificado por feature, no por criterio difuso.
2. **Corpus de fixtures dorados** (como el vitest de extracción). 2 Pe 2:10-22 y Salmo 23 son
   fixtures con su set de features esperado. Cambio al catálogo/prompt corre contra fixtures → caza
   drift. **Mecanismo central.**
3. **Detección aislada del gate** — detectores (pueden ser LLM) tras interfaz; contrato + gate
   **puros y deterministas** (testeables sin LLM).
4. **Telemetría de huecos** (como `recommendation_gap_no_suggestions`) — feature sin entrada en
   catálogo, o fallo del perfil → se loguea. El catálogo evoluciona desde huecos reales.
5. **El gate-cobertura NO es un gate nuevo** — es un **colector/sub-reporte** sobre el agregador de
   publish-gate existente (`computeFidelitySummary` / `evaluatePublishGate`, "Motor B"), reusando su
   umbral soft/hard y su persistencia. NO se engancha al motor de testigos (`WitnessValidation`,
   "Motor A") porque cobertura no tiene nivel doctrinal ni disenso. Detalle + open question de scope
   en el doc de diseño, § "Cómo encaja el gate-cobertura".

---

## 10. Preguntas abiertas (para la revisión)

1. ¿Cuántos intentos 🟡 T1 antes de ofrecer 🔵 T2 automáticamente?
2. ¿El 🎯 gate-cobertura soft puede cerrarse sin tocar todos los ítems (solo nudge), o algún `hard`
   debería ser `must-touch` real?
3. ¿Cap de paralelos: eliminar o escalar por nº de movimientos del perfil?
4. ¿El perfil corre al activar (como `inferGenreFromBook`) o on-demand por paso?
5. Alcance v1 del catálogo (sugerido: `ot-allusion` + `common-misreading` + `movements`).

---

## Referencias

- Diseño técnico: [`passage-profile-adaptive-coverage.md`](./passage-profile-adaptive-coverage.md)
- Spine de 8 pasos: ADR-022 (6→8), ADR-002 (6 original)
- Acompañante / niveles de ayuda: ADR-025, ADR-026 (T1/T2), ADR-027 (override floor)
- Pedagogía: [`05-pedagogy-manifesto.md`](../05-pedagogy-manifesto.md), [`06-pedagogy-applied.md`](../06-pedagogy-applied.md)
- Primitivo `oldTestamentLinks` (taxonomía Hays): `CanonicalVerseAnalysis.ts`
