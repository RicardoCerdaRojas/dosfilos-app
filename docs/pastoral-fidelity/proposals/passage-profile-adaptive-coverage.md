# Proposal — Perfil del pasaje + cobertura adaptativa sobre spine determinista

> **Diseño técnico.** Para la explicación narrativa de la metodología + dos ejemplos gráficos
> completos (2 Pedro 2:10-22 y Salmo 23), ver el par:
> [`passage-profile-methodology-walkthrough.md`](./passage-profile-methodology-walkthrough.md).

**Estado**: las 5 decisiones de diseño quedaron **cerradas en
[ADR-035](../decisions/ADR-035-passage-profile-adaptive-coverage.md)** (2026-06-22, `accepted`). Este
doc conserva el diseño de detalle; las § "Pendiente de decidir" se resolvieron allí (ver D1-D5 + CA1-CA3).
**Sin implementar.** Origen: 2026-06-21, tras detectar que el método sub-captura pasajes grandes (15+
versos). Caso disparador: 2 Pedro 2:10-22 — alusiones AT (Balaam, ángeles caídos), ilustraciones (perro/vómito,
cerda/lodo = Prov 26:11) y una lectura errónea frecuente ("pierde la salvación") que el estudio y el
sermón **no capturaron**.

## Contexto

El estudio guiado (`PastoralSeed`, 8 pasos) es **determinista**: siempre los mismos pasos, y trata el
pasaje como **un string opaco** sin descomposición por verso ni por movimiento. Auditoría
(2026-06-21) confirmó cuatro sub-capturas en pasajes grandes:

1. **Estructura colapsa a UNA cláusula** — `StructuralAnalysisStepData.mainClause` es un solo
   `{reference, pastorNote≥30}` para todo el pasaje (`PastoralSeed.ts:158-167`). Un argumento de 13
   versos no tiene dónde vivir.
2. **Cross-refs con techo duro de 3 + sesgo anti-cita** — `maxParallels: 3` rechazado por validador
   (`PastoralSeed.ts:314-318`, `validateRecognition`); y `RecognitionStepPolicy.ts:64` confronta el
   "eco verbal sin conexión teológica" como proof-texting — filtra justo las citas AT verbales.
3. **Los motores de cross-ref reciben la REFERENCIA, no el TEXTO** — `suggestCanonicalParallels.ts` y
   el TSK (12 versos curados, sin 2 Pedro) no pueden detectar "como perro que vuelve a su vómito" =
   Prov 26:11. Imposible sin leer el texto.
4. **El sermón se arma SIN los cross-refs** — `seedToExegesis.ts` (lossy) los descarta (no hay campo
   en `ExegeticalStudy`); el bosquejo se genera ciego; recién en el borrador se inyectan como
   "PRIMARY VOICE" advisory que el modelo ignora (`StepDraft.tsx:805`).

El primitivo correcto (análisis verso-por-verso con `oldTestamentLinks`, taxonomía Hays) **ya existe**
en el canonical analyzer académico (`CanonicalVerseAnalysis.ts:439-463`) pero está **desconectado** del
estudio guiado y **rechaza capítulos completos**.

### Restricción de marco

El fundador preguntó si el flujo podría ser "estocástico". **No** — aleatorizar rompería
reproducibilidad y formación pastoral. Lo correcto es **cobertura condicionada por el pasaje**: el
método histórico-gramatical es invariante, pero qué sub-disciplinas pesan **varía por género**
(narrativa→trama; epístola→flujo lógico; poesía→paralelismo; pasaje con citas AT→intertextualidad).
"El camino se adapta al género" ya es buena hermenéutica.

### Antecedente a respetar

Fase 2.5 (Option B) **rechazó** un "classifier batch + passive tracker" para profundidad de estudio.
Esta propuesta **no lo contradice**: aquello era un clasificador por-mensaje pasivo para *profundidad*;
esto es **un** perfil del pasaje **al inicio** (una llamada), para *cobertura de features exegéticas*.

## Decisión propuesta

Spine determinista **intacto** + tres capas nuevas. **Nunca salta pasos**; solo enriquece + verifica
al cierre.

### Capa 1 — `PassageProfile` (pre-análisis que LEE EL TEXTO)

Un paso determinista (verificador-orientador, no autoridad) que produce un perfil estructurado:

```ts
interface PassageProfile {
  schemaVersion: number;
  passage: string;
  genres: LiteraryGenre[];        // mixto explícito
  movements: Movement[];          // n bloques (reusa segmentación de PreachableUnit)
  features: DetectedFeature[];    // ver catálogo
}

interface DetectedFeature {
  typeKey: FeatureTypeKey;        // del catálogo
  kind: 'hard' | 'soft';
  summary: string;                // qué se detectó
  anchor?: VerifiableAnchor;      // OBLIGATORIO si kind==='hard'
  routeToStep: PastoralSeedStepKey;
}
```

El perfil se **persiste en el seed** (`schemaVersion` → back-compat, reproducible).

### Capa 2 — Contrato de cobertura

Del perfil sale un checklist de "temas que ESTE pasaje demanda" — derivado de lo detectado, no
aleatorio. Para 2 Pe 2:10-22: `{ot-allusion×3, illustration×2, common-misreading: perder-salvación,
movements:3}`.

### Capa 3 — Nudges por paso + gate de completitud

Cada uno de los 8 pasos recibe nudges condicionados por el perfil + su subconjunto del checklist. Al
cierre, la cobertura se verifica como **un colector más sobre el agregador de publish-gate existente**
(ver § "Cómo encaja el gate-cobertura"). Faltante → el Acompañante nudge ("todavía no abordaste la
alusión a Balaam"). No bloquea en features `soft`.

> **Los 8 pasos son invariantes.** El perfil cambia el **foco / profundidad / checklist DENTRO de
> cada paso**, nunca el número. Los features se enrutan a un paso existente (`routeToStep`); no crean
> pasos. Ver § "¿Por qué 8 pasos?" para cuándo el spine sí puede crecer (es un cambio de spine, no del
> perfil).

> **El gate-cobertura NO es un gate paralelo.** Es un **sub-reporte componible** (`coverageReport`)
> con un hook booleano (`coverageHasGaps`) que alimenta el **mismo** agregador puro de publish-gate
> (`computeFidelitySummary` / `evaluatePublishGate`), reusando su lugar único de umbral (soft/hard) y
> su forma de persistencia. **NO** se engancha al motor de escalación de testigos (`WitnessValidation`)
> — cobertura no tiene nivel doctrinal ni disenso, y falsearlos corrompería la escalación. Ver § "Cómo
> encaja el gate-cobertura".

## ¿Por qué 8 pasos? (y cuándo el spine puede crecer)

El "8" **no es un máximo ni una herencia ciega del modelo determinista**. Es el estado actual de una
revisión metodológica iterativa — y **ya creció una vez**:

- Empezó en **6** (ADR-002), derivado de la metodología del tutor griego/hebreo.
- Creció a **8** (ADR-022) agregando dos **operaciones no-opcionales** de la hermenéutica
  histórico-gramatical que no tenían casa o estaban colapsadas: **Contexto/Género** (el género
  gobierna las reglas de lectura → antes de la estructura) y **Principio atemporal** (puente
  exégesis→homilética; antes se conflacionaba dentro de `insight.centralIdea`). Más rename de dos
  mal nombrados (`syntax`→`structuralAnalysis`, `morphology`→`wordStudies`).

### Criterio: paso nuevo vs cobertura dentro de un paso

- **Paso nuevo** se justifica SOLO si existe una **operación interpretativa distinta, no-opcional**,
  validada contra el manifiesto de pedagogía, que hoy no tiene casa o se conflaciona con otra. (Así
  entraron Contexto/Género y Principio atemporal.)
- **Feature de contenido** (alusiones AT, ilustraciones, lecturas erróneas, paralelismos) **NO**
  justifica un paso nuevo — es cobertura *dentro* de una operación existente. Por eso enrutan vía
  `routeToStep`.

### Costo de crecer (por qué es raro y deliberado)

ADR-022 muestra que añadir un paso es una migración real: rename de keys + labels, discriminated
union type-safe, validators propios, `PASTORAL_SEED_THRESHOLDS`, `PASTORAL_SEED_AI_FORBIDDEN_FIELDS`,
componentes UI, prompt builder (`buildPastoralSeedBlock`), tests, migración Firestore, y orden
no-invertible. Por eso el spine crece **raro, deliberado y vía ADR** — nunca por acumulación de
features.

### Implicancia para esta propuesta

El perfil + cobertura adaptativa **NO agrega pasos**: agrega cobertura dentro de los 8. Si en el
futuro la metodología requiere una **operación** nueva (no un tema nuevo), ese es un **cambio de
spine** (su propia ADR, con rename/migración), independiente de esta propuesta. El catálogo de
features y el spine de pasos son dos ejes distintos: el catálogo crece seguido (dato); el spine crece
casi nunca (operación + migración).

## Cómo encaja el gate-cobertura con la arquitectura de gates existente

Hay **dos** patrones "motor único + N colectores" ya locked, distintos por naturaleza. El gate-cobertura
debe ser un **colector**, no un tercer gate con mecánica propia (umbral + persistencia duplicados →
divergen en 6 meses).

| Motor | Archivo | Naturaleza | Colectores hoy | Umbral |
|---|---|---|---|---|
| **A — escalación de testigos** | `WitnessValidation.ts` | confrontación de *claims* con nivel doctrinal + disenso → escalación | 3 testigos, examen del corazón, gate doxológico | `WITNESS_THRESHOLDS` (único) |
| **B — agregador de publish-gate** | `computeFidelitySummary` + `evaluatePublishGate` | completitud/calidad agregada → veredicto soft/hard | plurality, authority, attribution (hooks booleanos) | `FIDELITY_*_RATIO` (único) |

**El gate-cobertura va al Motor B, NO al A.**

- **Por qué NO el Motor A**: cobertura no tiene nivel doctrinal, ni disenso, ni testigos. Forzarla ahí
  obliga a falsear `detectedLevel`/`dissents` para "tema no tocado" → corrompe la matemática de
  escalación (`escalateClaim`). Category error.
- **Por qué SÍ el Motor B**: cobertura ES un chequeo de completitud, igual que plurality/authority/
  attribution. Se modela como **sub-reporte componible** `coverageReport` + hook `coverageHasGaps`,
  alimenta el **mismo** agregador puro, con soft/hard en el **mismo** módulo de umbrales. Cero
  persistencia nueva (viaja en el reporte), cero función de gate nueva.

### Open question — scope (a decidir antes de implementar)

`FidelityReport` es **sermón-scoped y está DORMANTE** (ADR-032; se reubica al paper en Fase 7). El
gate-cobertura es **estudio/seed-scoped al cierre**. Dos opciones, ambas válidas mientras NO se
duplique mecánica:

- **(a)** extender `evaluatePublishGate` directo con el hook de cobertura, o
- **(b)** un agregador hermano seed-scoped que **importa el MISMO módulo puro de agregación +
  umbrales** que `computeFidelitySummary` (no una copia).

Invariante a respetar en cualquier caso: **un agregador, un lugar de umbral (soft/hard), una forma de
reporte/persistencia.** Nunca un gate paralelo con su propia mecánica.

## Catálogo de tipos de feature (DATO, no código)

El pipeline (perfil → contrato → nudges → gate) es **genérico e itera sobre un catálogo**. Agregar o
ajustar una feature = editar una entrada, **nunca tocar el pipeline**. Espejea `StepPolicyRegistry` y
la composabilidad de `FidelityReport`.

```ts
interface FeatureType {
  key: FeatureTypeKey;            // 'ot-allusion' | 'theological-tension'
                                  // | 'common-misreading' | 'parallelism'
                                  // | 'illustration' | 'named-entity' | 'textual-crux' | ...
  kind: 'hard' | 'soft';         // hard = ancla verificable → elegible al gate
  detector: 'rule' | 'llm' | 'curated';
  routeToStep: PastoralSeedStepKey;
  coverageRule: 'must-touch' | 'nudge-only';
  nudgeTemplate: string;         // socrático; NO da la respuesta
}
```

### Feature `common-misreading` (lecturas erróneas frecuentes)

Clase **soft/interpretativa**, enrutada a **confrontación socrática** (reusa el mecanismo de
confrontación existente: genre-mismatch, proof-texting).

```ts
interface CommonMisreading {
  claim: string;                 // "el pasaje enseña que se pierde la salvación"
  whyWrong: string;              // "describe falsos maestros que apostatan (v.22:
                                 //  la naturaleza nunca cambió), no regenerados"
  correctiveAnchor: VerifiableAnchor[];  // [v.22 metáfora, Jn 10:28-29, 1 Jn 2:19]
  routeToStep: PastoralSeedStepKey;      // function | timelessPrinciple
}
```

**Regla dura anti-alucinación**: una lectura errónea solo se emite si trae **ancla correctiva
verificable** (hecho de género, cross-ref, rasgo gramatical). Sin ancla → no se emite. El nudge es
socrático: *"Este pasaje suele leerse como X. ¿Tu lectura lo sostiene o lo confronta? ¿Qué en el texto
lo decide?"* — cero contenido AI en pasos formativos.

Origen del catálogo de misreadings: **híbrido**. LLM propone en el perfil, filtrado por el requisito
de ancla; las recurrentes y peligrosas (perder salvación, prosperidad, legalismo) se **curan** en
catálogo para no depender del LLM.

**Comportamiento in-step (spec fija — tabla completa en el walkthrough §4):**

- **Aceptar = pasar el GATE-MÍNIMO de sustancia**, no una pulsación. El confront se compone con el
  umbral existente: respuesta sustantiva (trabajada), no necesariamente correcta.
- **`theological-tension`**: 1 ronda, postura consciente → avanza. **Nunca re-confronta** (no hay
  "mal"; re-confrontar sería imponer).
- **`common-misreading`**: 1 ronda + **máx 1 re-confront** si la postura sustantiva **aún contradice
  el ancla verificable**; luego **override floor (ADR-027)** — insistir queda registrado, no bloquea.
  Tope bajo a propósito: es `soft` con ancla, no un hecho duro como genre-mismatch.
- **El confront in-step es la red principal**; el gate-cobertura del cierre es **solo red de
  seguridad** para rutas de borde que no dispararon el in-step, no un segundo punto de fricción.

## Mantenibilidad / extensibilidad (mecanismos)

1. **Frontera dura/blanda en `kind`.** Solo `hard` (con ancla verificable) entra al gate; `soft` solo
   sugiere. El límite queda codificado por feature, no por criterio difuso.
2. **Corpus de fixtures dorados** (como el vitest corpus de extracción). 2 Pe 2:10-22 = fixture con
   features esperadas. Cualquier cambio al catálogo/prompt corre contra los fixtures → caza drift.
   **Mecanismo central de mantenibilidad.**
3. **Detección aislada del gate.** Detectores (pueden ser LLM) detrás de interfaz; contrato + gate son
   **puros y deterministas**. Se afinan prompts sin tocar el gate; se testea el gate sin LLM.
4. **Telemetría de huecos** (como `recommendation_gap_no_suggestions`). Feature detectada sin entrada
   en catálogo, o fallo del perfil → se loguea. La telemetría dice qué feature agregar después: el
   catálogo evoluciona desde huecos reales.

Esto evita repetir la deuda de hardcode (ej. `tech_debt_sblgnt_hardcoded`): un solo SSOT (el catálogo).

## Reuso (no greenfield)

| Pieza existente | Uso |
|---|---|
| `oldTestamentLinks` (Hays) — `CanonicalVerseAnalysis.ts` | detector de citas/alusiones AT |
| `PreachableUnit` segmentación por movimiento | `movements[]` del perfil |
| `inferGenreFromBook` + paso de género | `genres[]` |
| modelo de cobertura ⊂ `pastoralSeed` (Fase 2.5) | contrato de cobertura |
| `computeFidelitySummary` / `evaluatePublishGate` (Motor B) | el gate-cobertura es un **colector/sub-reporte** aquí, no un gate nuevo |
| `orientStudy` verificador-orientador | filosofía del perfil |
| mecanismo de confrontación (genre-mismatch / proof-texting) | nudge de `common-misreading` |

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Flujo estocástico/aleatorio | Rompe reproducibilidad + formación pastoral. No es lo que se quiere. |
| Pasos nuevos dinámicos por pasaje | Rompe el spine determinista y la migración de 8 pasos (ADR-022). |
| Subir solo el cap de paralelos | Parche; no cubre estructura, ilustraciones, ni lecturas erróneas. |
| Conectar el canonical analyzer académico directo al estudio guiado | Rechaza capítulos completos; es otro producto con otra UX. Reusar el *primitivo* `oldTestamentLinks`, no el pipeline. |
| Catálogo de features hardcoded en el pipeline | Deuda garantizada (cf. SBLGNT). Catálogo como dato + fixtures. |
| Gate-cobertura como gate paralelo con umbral+persistencia propios | Duplica mecánica de gate → dos sistemas divergen en ~6 meses. Va como colector sobre el Motor B. |
| Gate-cobertura como colector del motor de testigos (Motor A) | Cobertura no tiene nivel doctrinal ni disenso; falsearlos corrompe `escalateClaim`. Category error. |

## Consecuencias

### Positivas

- Pasajes grandes dejan de sub-capturarse: estructura por movimiento, alusiones AT por texto,
  ilustraciones, lecturas erróneas confrontadas.
- Garantía de cobertura sin sacrificar el spine determinista ni la formación.
- Extensible por dato (catálogo) + protegido por fixtures.

### Negativas

- Costo LLM adicional (un perfil por estudio).
- El perfil puede alucinar features `soft` → mitigado por gate soft + requisito de ancla en `hard`.
- Trabajo de curación inicial del catálogo de misreadings.

### Neutrales

- Requiere `schemaVersion` en el perfil y back-compat para seeds viejos.
- Probable nueva ADR (ADR-035) si se acepta; este doc es la propuesta previa.

## Pendiente de decidir (para la revisión)

1. ¿El gate `hard` (must-touch) bloquea publicación o solo nudgea fuerte? (sugerido: nudge fuerte,
   no bloqueo, alineado con override floor de ADR-027).
2. ¿Cap de paralelos: eliminar o escalar por nº de movimientos del perfil?
3. ¿El perfil corre al activar (como `inferGenreFromBook`) o on-demand al entrar a cada paso?
4. Alcance v1 del catálogo: ¿qué features entran primero? (sugerido: `ot-allusion` + `common-misreading`
   + `movements`, que son el dolor del caso 2 Pedro).
5. **Scope del gate-cobertura** (ver § "Cómo encaja"): ¿(a) extender `evaluatePublishGate` directo, o
   (b) agregador hermano seed-scoped que importa el mismo módulo puro de umbrales? Decisión de scope,
   no de mecánica — en ambos casos es colector sobre el Motor B, nunca gate paralelo. Atado a la
   reubicación de `FidelityReport` al paper (Fase 7, ADR-032).
