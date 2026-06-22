# ADR-035 — Perfil del pasaje + cobertura adaptativa sobre spine determinista

## Estado

`accepted` — aceptado 2026-06-22 (5 decisiones cerradas por el fundador).
Diseño de detalle: [`../proposals/passage-profile-adaptive-coverage.md`](../proposals/passage-profile-adaptive-coverage.md)
+ walkthrough [`../proposals/passage-profile-methodology-walkthrough.md`](../proposals/passage-profile-methodology-walkthrough.md).
**Sin implementar** — este ADR fija las decisiones; las verificaciones §"Criterios de aceptación" son
vinculantes para el PR de implementación.

## Fecha

2026-06-22

## Contexto

El estudio guiado (`PastoralSeed`, 8 pasos) trata el pasaje como string opaco y sub-captura pasajes
grandes (15+ versos). Caso disparador: 2 Pedro 2:10-22 perdió alusiones AT (Balaam, Prov 26:11),
ilustraciones y la lectura errónea "se pierde la salvación". El primitivo correcto (`oldTestamentLinks`,
taxonomía Hays) existe en el canonical analyzer académico pero está desconectado.

Solución: spine determinista intacto + **perfil del pasaje** (lee el texto) → **contrato de cobertura**
→ **nudges por paso + verificación al cierre**. NO estocástico: cobertura condicionada por el pasaje.
Catálogo de features como **dato** (no código). Detalle completo en la propuesta.

## Decisión

### D1 — Gate `hard`: dos casos separados, NO una sola regla "hard = nudge fuerte"

- **Omisión de cobertura** (alusión AT no abordada, ilustración no tratada): **nudge fuerte al cierre,
  no bloqueo**. Olvidar tratar una alusión es omisión de cobertura, no error doctrinal. Alineado con
  override floor (ADR-027).
- **Confrontación de lectura errónea** (`common-misreading`): mantiene el comportamiento ya fijado —
  **confront in-step retenido**, 1 ronda + máx 1 re-confront → override floor. NO es "nudge fuerte".

Línea limpia: **omisión de cobertura → nudge fuerte al cierre; confrontación de misreading →
retención in-step**. No colapsar ambos, o se diluye el confront de misreading.

### D2 — Cap de paralelos: lo fija el perfil, no un entero ni el nº de movimientos

- **Eliminar** el techo rígido `maxParallels: 3` (`PASTORAL_SEED_THRESHOLDS.recognition`). Existía
  porque no había perfil; ahora es redundante.
- **Cap efectivo = las features `hard` con ancla verificable que el perfil detectó.** Ancló 2
  alusiones → cap 2; ancló 5 → cap 5. El `kind: hard` + requisito de ancla ya es la defensa
  anti-proof-texting; no hace falta un número.
- "Escalar por movimientos" descartado (proxy tosco: un movimiento puede tener 4 alusiones y otros
  ninguna).
- **Salvaguarda** (sub-decisión confirmada): techo absoluto **alto (8)** como guarda anti-alucinación
  del perfil, **no** como cap de diseño. Vive como dato en `PASTORAL_SEED_THRESHOLDS`.

### D3 — El perfil corre AL ACTIVAR (no on-demand por paso)

- **Reproducibilidad + cristalización**: un detector LLM on-demand daría features distintas en cada
  entrada al paso → rompe la reproducibilidad (principio de marco). Al activar, el perfil se
  **cristaliza en el seed** (`schemaVersion`) y se congela como cualquier asset del Estudio Madre.
- **Costo**: una llamada única y medible por estudio (cuenta para el seguimiento de costo por
  estudio), vs multiplicar llamadas + latencia por paso.

### D4 — Alcance v1 del catálogo: `ot-allusion` + `common-misreading` + `movements`

- Son el dolor exacto del caso 2 Pedro. El resto (`parallelism`, `illustration`, `theological-tension`,
  `named-entity`, `textual-crux`) entra **por dato** en iteraciones, sin tocar el pipeline.
- `theological-tension` → v1.1, salvo que el primer fixture distinto a 2 Pedro lo demande.

### D5 — Gate-cobertura: opción (b), agregador hermano seed-scoped

- Un agregador seed-scoped que **importa el MISMO módulo puro de agregación + umbrales** que
  `computeFidelitySummary` (no una copia).
- Razón — **timing**: `FidelityReport` está dormante hasta Fase 7 (ADR-032); la opción (a) (extender
  `evaluatePublishGate`) ataría esto detrás de Fase 7 sin necesidad. (b) desacopla el timing.
- **Invariante**: un agregador, un lugar de umbral (soft/hard), una forma de persistencia. Sigue
  siendo **colector sobre el Motor B**, nunca gate paralelo. (Cobertura NO va al Motor A de testigos:
  no tiene nivel doctrinal ni disenso → corromper `escalateClaim` sería category error.)

## Criterios de aceptación (vinculantes para el PR — verificaciones del fundador)

- **CA1 — `"engancha ancla"` = engagement, no corrección.** El agente acepta cuando el pastor
  **trabajó el ancla de forma sustantiva aunque discrepe**, NO cuando coincide con lo que el ancla
  dice. Juzga engagement, no acierto. Requiere prompt dedicado + fixture que distinga "discrepa
  habiendo trabajado el ancla" de "ignoró el ancla". (Criterio más delicado de implementar.)
- **CA2 — Tope de re-confront por clase como DATO.** `theological-tension = 0`, `common-misreading = 1`
  (genre-mismatch conserva su comportamiento de hecho duro). Vive en `PASTORAL_SEED_THRESHOLDS` o en
  la entrada de catálogo de la feature, **nunca** como constante hardcodeada en el confront loop (hoy
  `METHOD_ERROR_CONFIDENCE_THRESHOLD = 0.65` es el anti-patrón a no repetir). Aceptar siempre se
  compone con el GATE-MÍNIMO de sustancia existente.
- **CA3 — Fixture de los 3 ramales de misreading.** El corpus dorado incluye ≥1 caso que ejerza:
  (i) `< sustancia` → GATE-MÍNIMO "profundiza" (no cuenta como re-confront); (ii) sustantiva + engancha
  ancla → acepta; (iii) sustantiva pero contradice ancla → re-confront → override floor. No solo el
  camino feliz.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| `hard = nudge fuerte` unificado (D1) | Diluye el confront in-step de misreading recién blindado. Separar omisión-de-cobertura de confrontación-de-misreading. |
| Cap de paralelos = entero fijo / nº de movimientos (D2) | Entero fijo era el bug original; movimientos es proxy tosco. El cap lo da el perfil (features hard con ancla). |
| Perfil on-demand por paso (D3) | Rompe reproducibilidad (features distintas por entrada) + multiplica costo/latencia. |
| Catálogo v1 completo (D4) | Sobre-alcance; el resto entra por dato sin tocar pipeline. v1 = el dolor del caso 2 Pedro. |
| Gate-cobertura extendiendo `evaluatePublishGate` (D5 opción a) | Ata al timing dormante de `FidelityReport` (Fase 7). (b) desacopla. |
| Gate-cobertura como gate paralelo propio | Duplica umbral+persistencia → dos gates divergen en ~6 meses. |
| Gate-cobertura como colector del Motor A (testigos) | Cobertura no tiene nivel doctrinal ni disenso; corrompe `escalateClaim`. |

## Consecuencias

### Positivas

- Pasajes grandes dejan de sub-capturarse (estructura por movimiento, alusiones AT por texto,
  ilustraciones, lecturas erróneas confrontadas).
- Reproducibilidad: perfil cristalizado en el seed.
- Extensible por dato (catálogo) + protegido por fixtures dorados.
- Cero divergencia de gates (colector sobre Motor B, no gate paralelo).

### Negativas

- Una llamada LLM adicional por estudio (medible, acotada por D3).
- CA1 (engagement-no-corrección) es difícil de implementar y de testear — riesgo de falsos
  accept/re-confront.
- Curación inicial del catálogo de misreadings.

### Neutrales

- `schemaVersion` en el perfil + back-compat para seeds viejos.
- Salvaguarda de techo 8 es arbitraria; revisar si la telemetría de huecos muestra perfiles que la
  rozan legítimamente.
- D5 queda atada conceptualmente a la reubicación de `FidelityReport` (Fase 7) solo para eventual
  convergencia, no para el timing de implementación.

## Referencias

- Propuesta + walkthrough: `../proposals/passage-profile-adaptive-coverage.md`,
  `../proposals/passage-profile-methodology-walkthrough.md`
- Spine 8 pasos: ADR-022 (6→8), ADR-002
- Override floor / modo experto: ADR-027
- Acompañante / niveles de ayuda T1/T2: ADR-025, ADR-026
- Fidelity dormante → reubicación al paper: ADR-032
- Motores de gate (A testigos / B publish-gate): `WitnessValidation.ts`,
  `computeFidelitySummary` + `evaluatePublishGate`
