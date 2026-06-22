# Roadmap — lo que falta de ADR-035 (perfil del pasaje + cobertura adaptativa)

> **Estado base (2026-06-22)**: PR1 (#366) + PR2 (#367) en main. `passage_profile`
> (sombra) + `passage_profile_enforce` (enforce) **ON para 2 usuarios** (dogfood
> controlado). El v1 del lado-estudio está vivo para ellos; el lado-sermón y
> varias features del diseño **no** están hechos.
>
> **North-star de aceptación** (caso que disparó todo): estudiar **2 Pedro
> 2:10-22** y que TANTO el estudio COMO el sermón capturen: alusión a Balaam
> (Núm 22-24), "perro al vómito" (Prov 26:11), las 2 ilustraciones, y la lectura
> errónea "se pierde la salvación". Hoy el estudio las trata (parcial); el sermón
> **no**.

Cada ítem: **qué · por qué · cómo se mide · tamaño**. Orden por valor + dependencia.

---

## R1 — Eliminar el cap rígido de 3 paralelos (D2) · P0 · chico

- **Qué**: en `PastoralSeed.ts`, quitar `maxParallels: 3` del rechazo de
  `validateRecognition`; el cap efectivo pasa a ser las features `hard` con ancla
  del perfil (ADR-035 D2) + un techo de seguridad alto (8) anti-alucinación.
- **Por qué**: es el **bloqueo original** de 2 Pedro — un pasaje con 4+ alusiones
  no las puede registrar. Decidido en ADR-035, nunca implementado.
- **Mide**: en dogfood, un pastor registra >3 paralelos en 2 Pe 2:10-22 sin que el
  validador lo rechace. Test de regresión: `validateRecognition` acepta 5
  paralelos cuando el perfil ancló 5.
- **Tamaño**: ~½ día (1 archivo dominio + tests).

## R2 — Nudges in-step para alusión-AT y movimientos · P0 · medio

- **Qué**: hoy el nudge in-step solo existe para `common-misreading` (paso
  Función). Agregar nudges condicionados por el perfil en `RecognitionStepPolicy`
  (alusiones AT del paso 5) y `StructuralAnalysisStepPolicy` (movimientos del paso
  3), gated por `enforceCoverage`. Reusa `featuresForStep`.
- **Por qué**: hoy las alusiones/movimientos solo se recuerdan **al cierre**
  (colector). El valor real es surfacearlos **dentro de su paso**, cuando el
  pastor está ahí.
- **Mide**: dogfood — en el paso 5 de 2 Pe 2, el agente nombra "alude a Balaam
  (Núm 22-24)" como dato. Métrica: baja la tasa de ítems must-touch sin tratar en
  el colector de cierre (porque se tratan in-step).
- **Tamaño**: ~1-2 días (2 policies + tests + i18n).

## R3 — Lado SERMÓN: arrastrar paralelos al composer · P1 · grande

- **Qué**: `seedToExegesis` (lossy) **descarta** `recognition.parallels`. Darle a
  `ExegeticalStudy` un campo de paralelos, mapearlo en `seedToExegesis`, y que el
  prompt del composer los reciba y use (no solo el bosquejo). (Análisis inicial
  "P2".)
- **Por qué**: es **la otra mitad del dolor original** — el estudio puede tratar
  las alusiones, pero el **sermón** sigue saliendo ciego a ellas.
- **Mide**: north-star — un sermón generado desde un seed con 3 alusiones AT
  **menciona las 3** en el cuerpo. Test: el prompt del composer incluye los
  paralelos del seed.
- **Tamaño**: ~3-4 días (toca schema `ExegeticalStudy` + synth + prompt builder +
  tests). Riesgo medio (toca el pipeline del sermón).

## R4 — Más tipos de feature en el catálogo · P1 · medio (incremental)

- **Qué**: agregar al catálogo (es dato): `theological-tension` (v1.1, ya
  diseñado: 1 ronda, nunca re-confronta), luego `parallelism`, `illustration`,
  `named-entity`, `textual-crux`. Cada uno: entrada de catálogo + fragmento de
  prompt del detector + fixture dorado.
- **Por qué**: el catálogo se diseñó para crecer por dato; hoy solo 3 tipos.
  `parallelism`/`illustration` desbloquean poesía y narrativa (hoy el perfil de un
  Salmo queda flaco).
- **Mide**: precisión por tipo en sombra (≥90% ancla en los `hard`); cobertura: el
  perfil de Salmo 23 detecta paralelismo + metáfora (hoy no).
- **Tamaño**: ~1 día por tipo. Empezar por `theological-tension` (más cerca) +
  `illustration` (alto valor narrativo).

## R5 — Afinar umbrales con datos del dogfood · P2 · chico (continuo)

- **Qué**: con la señal de los 2 usuarios en enforce, afinar
  `MISREADING_MIN_SUBSTANCE_CHARS` (hoy 40) y el cap de re-confront; medir tasa de
  falsos re-confront de CA1 (Corte 2 en vivo).
- **Por qué**: los umbrales son datos editables a propósito; el diseño dijo
  "afinar con el Corte 2".
- **Mide**: **Corte 2 en vivo** — sobre los confronts reales de los 2 usuarios,
  falsos re-confront ≤10% (esp. fila D: enganchó+discrepa → debe aceptar). Si la
  fila D falla reproducible → escalar CA1 a Pro antes de ampliar usuarios.
- **Tamaño**: continuo; revisión en el recordatorio del 2026-07-02.

## R6 — Descomposición por movimiento en el schema del seed · P2 · grande

- **Qué**: hoy `structuralAnalysis` guarda **una** `mainClause`. El análisis
  inicial proponía un campo por movimiento + un campo de ilustración estructurado
  (no solo `insight.pastoralAnecdote`).
- **Por qué**: pasajes grandes siguen aplanando la estructura a una cláusula; los
  movimientos del perfil no tienen dónde vivir estructuralmente en el seed.
- **Mide**: un estudio de 2 Pe 2:10-22 captura sus 3 movimientos como datos
  separados (no un solo texto).
- **Tamaño**: ~3-5 días (migración aditiva de schema + UI + validadores). Mayor;
  hacer solo si el dogfood muestra que el aplanamiento duele.

---

## Secuencia sugerida

```
R1 (cap, ½d) → R2 (nudges in-step, 1-2d) → R3 (sermón, 3-4d)   ← cierra el dolor original
        ↘ R4 (theological-tension + illustration, 1d c/u)       ← amplía cobertura
R5 (afinar) corre en paralelo con el dogfood (continuo).
R6 (schema por movimiento) solo si el dogfood lo demanda.
```

**Hito "dolor original cerrado"** = R1 + R2 + R3: el caso 2 Pe 2:10-22 capturado
de punta a punta (estudio **y** sermón). Ese es el primer objetivo medible.

## Tablero de medición (para seguir)

| Métrica | Fuente | Meta |
|---|---|---|
| Falsos re-confront CA1 (Corte 2) | dogfood 2 usuarios (enforce on) | ≤10% |
| Precisión features `hard` (Corte 1) | `passageProfileShadow/` | ≥90% ancla válida |
| Ítems must-touch sin tratar al cierre | colector (E) | ↓ tras R2 |
| Paralelos registrables por pasaje | dogfood | >3 tras R1 |
| Alusiones en el cuerpo del sermón | revisión manual | = nº del seed, tras R3 |
| Cobertura de poesía/narrativa | shadow | features ≠ 0 tras R4 |
