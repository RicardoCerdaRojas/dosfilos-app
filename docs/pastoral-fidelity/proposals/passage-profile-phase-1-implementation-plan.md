# Plan de implementación — Fase 1 de ADR-035 (perfil del pasaje + cobertura adaptativa)

> **DRAFT para revisión.** No es código. Implementa [ADR-035](../decisions/ADR-035-passage-profile-adaptive-coverage.md)
> (D1-D5 + CA1-CA3). Aprobar antes de tocar código.

## 0. Principios que ordenan el plan

- **Shadow antes de enforcement** (precedente: grieta doxológica, `recordDoxologicalGateShadow.ts`):
  el detector corre en sombra y mide precisión (falsos positivos) sobre muestra real ANTES de que un
  nudge/gate toque al usuario.
- **PR = unidad testeable** (feedback locked). Los PRs de sombra se testean vía admin/telemetría (no
  UI de usuario), igual que el shadow doxológico. Donde un PR es solo back-end sin superficie, se
  pliega a su PR consumidor.
- **functions NO depende de domain**: detector LLM = callable fino en `functions`; ensamblado/contrato/
  gate = puros en `domain`. Mismo patrón que testigos/examen.

## 1. Orden de capas y commits

Confirmo el orden del doc (Capa 1 → 2 → 3) con dos ajustes: **(i)** Capa 2 es demasiado delgada para
PR propio → commit dentro del PR de Capa 3; **(ii)** intercalo el gate shadow→enforce entre detección
y nudges.

| PR | Capa | Entrega | Flag / estado | Testeable por |
|---|---|---|---|---|
| **PR1** | Capa 1 (detección + SHADOW) | `PassageProfile` schema + `schemaVersion` + catálogo v1 (3 keys) + callable `profilePassage` (Flash) + `recordPassageProfileShadow` + wire en activación (solo persiste sombra) + corpus dorado (lado detección) | `passage_profile` off; solo telemetría | admin dashboard de precisión (sin cambio de usuario) |
| — | *gate de adjudicación* | medir precisión de features sobre muestra real; decidir flip | — | readout de falsos positivos |
| **PR2** | Capa 3a (nudges + confront) | contrato de cobertura (Capa 2, commit interno) + nudges por paso + confront de `common-misreading` (**CA1**) + tope re-confront como dato (**CA2**) + eliminar `maxParallels` + cap del perfil + techo 8 (**D2**) | `passage_profile` enforce, gated | flujo guiado (nudges + confront en vivo) |
| **PR3** | Capa 3b (colector de cobertura) | `computeCoverageSummary` hermano (Motor B, D5-b) + nudge al cierre (omisión de cobertura → nudge fuerte, **D1**) | enforce, gated | cierre del estudio (nudge "no abordaste X") |

Commits internos sugeridos por PR: ver §3 (caen junto a los CA).

**Por qué este orden**: detección primero y en sombra (mide antes de molestar); luego el confront
in-step (red principal, D1) ya con precisión adjudicada; el colector de cobertura al final (red de
seguridad, depende de que el contrato + detección sean confiables).

## 2. Reuso vs nuevo (contra la tabla del design doc)

| Capa | Reusa (primitivo existente) | Greenfield (nuevo) |
|---|---|---|
| **1 detección** | `inferGenreFromBook` (domain) → `genres[]`; `PreachableUnit`/segmentación (domain) → `movements[]`; `oldTestamentLinks` + taxonomía Hays de `analyzerPrompts.ts` (infra) → prompt del detector de `ot-allusion`; patrón callable fino de `suggestCanonicalParallels`/`validateSeedWitnesses` (functions, `gemini-2.5-flash`) | `PassageProfile` type + `schemaVersion` (domain); catálogo `FeatureType` (domain, dato); callable `profilePassage` (functions); `recordPassageProfileShadow` (functions, espeja `recordDoxologicalGateShadow`) |
| **2 contrato** | modelo de cobertura ⊂ `pastoralSeed` (Fase 2.5) | `buildCoverageContract(profile)` puro (domain) |
| **3a nudges/confront** | mecanismo de confront existente (genre-mismatch/proof-texting en `RunSocraticTurnUseCase` + step policies); `GATE-MÍNIMO` de sustancia; `PASTORAL_SEED_THRESHOLDS` (home del tope CA2); override floor (ADR-027) | detector de engagement-vs-corrección (**CA1**, lo más nuevo); nudges por paso derivados del contrato; quita de `maxParallels` + cap dinámico (D2) |
| **3b colector cobertura** | **módulo puro** de `computeFidelitySummary` + `evaluatePublishGate` (domain/services) — Motor B | `computeCoverageSummary` hermano seed-scoped (D5-b) + `coverageReport`/`coverageHasGaps` |

Greenfield real y arriesgado = **solo CA1** (el detector de engagement). Todo lo demás es ensamblado
de primitivos.

## 3. Dónde caen CA1-CA3 (commit + fixture)

- **CA1 — engagement, no corrección** → PR2, commit "misreading confront detector".
  **Fixture PRIMERO, antes del detector** (el founder lo pidió explícito). Caso 2 Pe 2:22, ancla =
  v22 (la naturaleza nunca cambió) + Jn 10:28-29. La tabla **separa dos variables** —¿enganchó el
  ancla? y ¿contradice el ancla?— para no confundir engagement con acierto:

  | Input del pastor | ¿enganchó ancla? | ¿contradice ancla? | sustancia | camino | resultado |
  |---|---|---|---|---|---|
  | **A** "Trabajé v22 y Jn10; la naturaleza no cambió → advertencia a falsos maestros (con la tensión de 'habían escapado')." | sí | **no** | sí | — | ✅ ACEPTA |
  | **D** "Cité y razoné v22 y Jn10 a fondo, y **aun así** concluyo que sí se puede perder la salvación." | sí | **sí** | sí | 1 re-confront → sostiene | ✅ **ACEPTA vía override floor (registra la discrepancia)** |
  | **B** "Sí, se pierde la salvación, el texto lo dice." (no toca v22/Jn10) | **no** | sí | sí | re-confront surface el ancla | 🔴 RE-CONFRONT |
  | **C** "es complicado" | no | — | **no** | — | ⛔ GATE-MÍNIMO "profundiza" (no cuenta como re-confront) |

  **La fila D es la garantía de la tesis.** A y D difieren **solo** en *¿contradice ancla?* y **ambas
  ACEPTAN** (D vía override floor que registra la discrepancia) → el detector juzga **engagement, no
  corrección**. B y D difieren **solo** en *¿enganchó ancla?* → el detector **keya en engagement**.
  Sin D, B confunde ambas variables (es a la vez ignoró-ancla Y conclusión-equivocada) y alguien
  implementaría el detector re-confrontando por conclusión equivocada sin que el fixture lo cace.
  Las 4 filas (A/B/C/D) entran al corpus dorado de **CA3** (no solo a esta tabla) — la fila D corre en
  CI como el caso que mide si el detector juzga engagement y no corrección.

- **CA2 — tope re-confront como dato** → PR2, commit "re-confront tope (data)". `theological-tension=0`,
  `common-misreading=1` en `PASTORAL_SEED_THRESHOLDS` (o entrada de catálogo). Test: el loop lee el
  tope del dato, no de constante; cambiar el dato cambia el comportamiento sin tocar el loop.

- **CA3 — fixture de los ramales** → es el mismo fixture de CA1 (filas **A/B/C/D**, incluida la fila D
  que de-confunde engagement de acierto) elevado a caso dorado del corpus. Vive desde PR2 y corre en
  CI. Adicional: el corpus arranca en PR1 con el lado detección (2 Pe 2:10-22 y Salmo 23 con su set de
  features esperado).

## 4. Migración y back-compat

- `passageProfile?: PassageProfile` = **campo opcional aditivo** en el seed. **Cero migración Firestore**
  (mismo patrón aditivo que ADR-022).
- **Seeds viejos sin perfil**: NO se re-perfilan. Decisión: **se quedan en flujo clásico (sin cobertura
  adaptativa)**, `coverageMode: 'none'` implícito por ausencia de `passageProfile`. Degradación
  elegante: corren los 8 pasos sin nudges del perfil ni gate-cobertura.
- **Descartado** `lazy al reabrir`: re-perfilar a mitad de estudio cambiaría features → rompe la
  cristalización/reproducibilidad (D3). **Descartado** `sin_auditar`: no es un estado de error, es
  ausencia legítima.
- **Opcional (no v1)**: opt-in admin para re-perfilar un seed viejo que aún no pasó del paso 4 (antes
  de que el perfil importe). Default off.
- **Shadow** vive en colección aparte `passageProfileShadow/` con TTL (espeja doxológico); no toca el
  seed.

## 5. Shadow antes de enforcement (espeja la grieta doxológica)

**PR1 corre el perfil en sombra**: al activar, `profilePassage` genera features, `recordPassageProfileShadow`
las persiste segmentadas; **nada se surface ni bloquea**. Se loguea:

1. **Precisión de features** (falsos positivos del detector): cada feature `hard` con ancla →
   ¿el ancla resuelve de verdad? (alusión AT cuyo `sourcePassage` existe y es citable; ilustración que
   está en el texto). Métrica = % de features con ancla inválida.
2. **Telemetría de huecos** (como `recommendation_gap_no_suggestions`): pasaje donde el perfil no
   detectó NINGUNA feature conocida, o falló → candidato a catálogo.
3. **Distribución**: nº de features por estudio, por género, contra el techo 8 (¿lo roza alguien
   legítimamente?).
4. **Segmento** server-side: leer el delta solo sobre `real` (input de superadmin/embajador no
   representa población).

**Gate de adjudicación antes del flip** — número y cortes explícitos (mismo patrón que el flip
doxológico: ≥20 Insights + ≥7 días + dos cortes). Para el perfil:

- **Volumen**: **≥20 estudios reales** (segmento `real`, no superadmin/embajador) con perfil generado.
- **Ventana**: **≥7 días** de corridas (evita sesgo de un solo día/usuario).
- **Dos cortes de datos** (ambos deben pasar para flipear):
  1. **Corte de features (por estudio)** — precisión de features `hard`: **≥90 %** con ancla válida
     (alusión AT cuyo `sourcePassage` existe y es citable; ilustración presente en el texto). Mide la
     alucinación del detector de features (Flash).
  2. **Corte de engagement CA1 (por turno)** — **muestra adjudicada manualmente** de ≥30 turnos de
     confront de `common-misreading`, etiquetados contra el fixture A/B/C/D: falsos re-confront
     (acepta-debería-confrontar o confronta-debería-aceptar, esp. la fila D) **≤10 %**. Mide el juicio
     fino del detector CA1, que es distinto de la precisión de features.

Recién con **ambos** cortes bajo umbral sobre el volumen+ventana se flipea `passage_profile` a enforce
(PR2/PR3). Purga del shadow = manual al decidir el flip (TTL 90d solo backstop). El corte 2 puede
tardar más en juntar volumen (los confronts de misreading son un subconjunto de los estudios) → su N
es menor a propósito (30 turnos, no 30 estudios).

**Importante**: el confront de `common-misreading` (PR2) NO es shadow una vez flipeado — es la red
principal. Lo que el shadow valida es la **precisión del detector** que alimenta esos nudges, para no
confrontar sobre features alucinadas.

## 6. Costo — DOS líneas distintas (perfil ≠ adjudicación CA1)

El estimado anterior solo cubría el perfil. Hay dos costos con naturaleza y modelo distintos:

### (i) Perfil de features — 1 llamada por estudio, al activar (D3)

- Modelo: **`gemini-2.5-flash`** (detección de alusiones/ilustraciones/movimientos es **mecánica**).
- **Input** ~4k tok (texto del pasaje 600-1000 + catálogo v1 + taxonomía Hays + few-shot).
  **Output** ~1-2k tok (JSON de features).
- **~US$0.005-0.01 por estudio**, una vez (cristalizado). A 1.000 estudios/mes ≈ **US$5-10/mes**.

### (ii) Juicio de engagement CA1 — por TURNO de confront de misreading (no por estudio)

- **No es una llamada nueva**: monta sobre la llamada per-turn que el confront **ya hace** hoy en
  `RunSocraticTurnUseCase`. Lo nuevo es (a) el contrato en el prompt (engagement-no-corrección) y (b)
  **el modelo de esa llamada en turnos con misreading activo**.
- **Modelo: NO tiene que ser Flash.** Distinguir "trabajó el ancla y discrepa" (fila D) de "ignoró el
  ancla" (fila B) es **razonamiento fino**, no mecánico. Flash detecta features; CA1 merece tier más
  fuerte. **Precedente en código**: `evaluateClaimSourceFidelity.ts` ya hace **Flash → Sonnet
  escalation** (`modelTier: 'flash'|'sonnet'|'mixed'`) — Flash para detección, Sonnet solo para los
  casos `partial`/`contradicts`. CA1 reusa ese patrón: el turno de misreading-contradicción escala a
  **Sonnet** (o `gemini-2.5-pro`, el que use el canonical analyzer).
- **Cuándo dispara**: solo en estudios cuyo perfil tiene una feature `common-misreading` (subconjunto)
  y solo en el turno (o el re-confront) de ese paso → **~0-2 turnos por estudio afectado**.
- **Costo del delta** (subir ese turno de Flash a Sonnet): ~US$0.01-0.03 por turno escalado. En
  agregado, pequeño (subconjunto de estudios × ~1-2 turnos).

### Total por estudio (orden de magnitud)

- Estudio sin misreading: **~1 centavo** (solo perfil).
- Estudio con misreading: **~perfil + 1-2 turnos Sonnet ≈ US$0.02-0.07**.

Cifras de planeación; el shadow (PR1) emite tokens reales del perfil, y la muestra de adjudicación CA1
del corte 2 mide el costo real del tier escalado antes de enforce.

**Decisión cerrada (founder, 2026-06-22): tier de CA1 = Sonnet en v1.** Razones: (a) ya cableado vía
`modelTier` en `evaluateClaimSourceFidelity` — Pro metería un proveedor nuevo en ruta nueva, superficie
innecesaria; (b) CA1 y `evaluateClaimSourceFidelity` hacen el mismo tipo de juicio (¿el ancla respalda
lo afirmado?) → mismo modelo = comportamiento coherente, una sola superficie a afinar; (c) el fixture
A/B/C/D lo mide. **Criterio de escalación a Pro**: solo si Sonnet falla la fila D de forma
**reproducible** en el corpus dorado. Así el tier es decisión medible, no apuesta por adelantado.

## 7. Riesgos

- **CA1 es el riesgo central**: distinguir "discrepa trabajando el ancla" de "ignora el ancla" es
  juicio fino del LLM → falsos re-confront frustran, falsos accept diluyen. Mitigación: fixture A/B/C
  como contrato + shadow mide precisión del detector antes de enforce.
- **Alucinación de features** → mitigado por requisito de ancla verificable (`hard`) + shadow + techo 8.
- **Segmentación de muestra**: a baja escala, juntar N estudios reales para adjudicar puede tomar
  semanas (igual que el piso de ≥20 Insights del doxológico). TTL del shadow holgado.

## 8. Resumen de PRs

1. **PR1** — Capa 1 + shadow + corpus (detección). Flag off. → adjudicar precisión.
2. **PR2** — Capa 2 (interno) + Capa 3a nudges/confront (CA1+CA2) + D2 cap. Enforce gated.
3. **PR3** — Capa 3b colector de cobertura (D5-b) + nudge de cierre (D1). Enforce gated.

3 PRs. CA1-CA3 concentrados en PR2 (+ corpus iniciado en PR1). Shadow entre PR1 y PR2.
