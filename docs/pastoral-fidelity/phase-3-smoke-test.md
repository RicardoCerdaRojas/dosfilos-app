# Smoke Test — Fase 3 (Claim↔Source Fidelity) — PROD

**Objetivo**: validar end-to-end en producción los 5 PRs de Fase 3 antes de declarar la fase
*deployed + validated* y antes de flippear `fidelity_pass` a default-on. Cubre ADR-029 Q1-Q10.

**Duración estimada**: ~30-40 min.

**Resultado esperado para cerrar**: los 6 casos PASS. Si alguno falla → la fase NO está validada en
prod; documentar el fallo y corregir antes del flip.

---

## Pre-requisitos

1. **Cuenta de prueba correcta**. Activar el flag en la MISMA cuenta con la que vas a abrir el wizard.
   Gotcha histórico (Fase 1.5): no confundir `ricardo@dosfilos.com` (uid `0bfl5lBk…`) con
   `rdocerda@gmail.com` (uid `1xSpGj0k…`). Usá una sola cuenta para todo el smoke.
2. **Flags ON** (Admin → Users → [tu usuario] → tab **Feature Flags**):
   - `pastoral_fidelity_flow` = **on** (parent, requerido)
   - `fidelity_pass` = **on**
   - (opcional, si querés ver el panel completo de la fase) `three_witnesses` / `study_depth` on.
   - Sin `pastoral_fidelity_flow`, `fidelity_pass` no surface nada (el panel hace `if (!gate.enabled) return null`).
3. **Recargar** la app tras togglear (los flags propagan vía `subscribeProfile`; si no aparece, hard-refresh).
4. **Un sermón generado** con citas de biblioteca (markers `[N]`). Lo más realista: generar uno nuevo
   por el wizard. Para forzar los casos de gate vas a editar el borrador (ver cada caso).

---

## Caso 1 — Fidelity pass core + panel de verdicts (PR 1, #287 · ADR-029 Q1/Q2)

**Pasos**
1. Abrí un sermón con flag on → en el panel de revisión, click **"Revisar fidelidad"**.
2. Observá el modal de progreso → al terminar, el panel lista los verdicts por marcador.
3. Click en un verdict.

**PASS si**
- [ ] El callable corre y persiste el report (recargar la página → los verdicts siguen ahí).
- [ ] Cada marcador `[N]` tiene un verdict: `supports` / `partial` / `unrelated` / `contradicts` + reasoning.
- [ ] Click en un verdict **salta al marcador** en el editor.
- [ ] (Q1) Algún verdict `partial`/`contradicts`, si aparece, muestra que fue escalado a tier fino (Sonnet);
      el resto resueltos por Flash. (Verificable por `modelUsed` en el verdict / latencia mayor.)

---

## Caso 2 — Publish gate: hard-block + soft-block (PR 2, #289 · ADR-029 Q3)

Forzar verdicts editando el borrador: insertar oraciones cuyo marcador cite un verso que NO las respalda.

**2a. Hard-block (>20% `unrelated|contradicts`, SIN override)**
1. Editá el borrador para que **>20%** de los markers citen versos no relacionados con su oración
   (ej. una oración sobre el amor de Dios con marcador citando una genealogía).
2. Re-corré "Revisar fidelidad" → intentá **Publicar**.

**PASS si**
- [ ] Aparece `PrePublishFidelityModal` con banner **hard-block**.
- [ ] **NO** hay path de override — solo opción "Revisar marcadores". No se puede publicar.

**2b. Soft-block (>10% `partial`, override con justificación)**
1. Ajustá el borrador para caer en soft-block (`partial` >10%, sin pasar el umbral hard).
2. Intentá Publicar → debe pedir justificación.

**PASS si**
- [ ] Banner **soft-block** + formulario de override.
- [ ] Justificación <100 chars → **rechazada** (counter visible).
- [ ] Justificación ≥100 chars → **publica**.
- [ ] El override queda audit-logged: recargar → `gateOverride` con tu uid + timestamp + reason en el report.

---

## Caso 3 — Plurality / no-proof-texting (PR 3, #290 · ADR-029 Q4)

**Pasos**
1. En el borrador, escribí una afirmación doctrinal **substantiva** (`core`/`distinctive`) apoyada en
   **un solo** pasaje. Ej: *"Cristo es preexistente a la creación [1]"* con `[1]` = solo **Juan 1:1**.
2. Re-corré "Revisar fidelidad" → sección **"Pluralidad bíblica"** en el panel.

**PASS si**
- [ ] La afirmación aparece como fallo de pluralidad (<2 pasajes distintos).
- [ ] El gate marca **soft-block** por pluralidad.
- [ ] CTA **"Añadir paralelo canónico"** abre el lookup cross-ref y **propone** paralelos
      (ej. Col 1:16, Heb 1:3) — read-only, NO auto-inserta.
- [ ] Una afirmación `open-evangelical` (materia de libertad) con un solo pasaje **NO** dispara fallo.

---

## Caso 4 — Authority subordination (PR 4, #298 · ADR-006 §8)

**Pasos**
1. Escribí una oración que use una confesión como autoridad final. Ej:
   *"La Confesión de Westminster enseña la predestinación, por tanto es doctrina obligatoria [1]"*
   con `[1]` = chunk de la WCF.
2. Re-corré "Revisar fidelidad" → sección **"Autoridad subordinada"**.

**PASS si**
- [ ] Surface la violación de autoridad (credo usado como autoridad final, no el texto).
- [ ] Muestra **sugerencia de reformulación** (apelar al texto bíblico).
- [ ] Click-to-replace inserta la reformulación.
- [ ] (Prompt clause) Un sermón generado *después* del PR 4 produce **menos** violaciones de autoridad
      que el patrón previo (chequeo cualitativo).

---

## Caso 5 — Attribution footer + AttributionReport (PR 5, #300 · ADR-029 Q7)

**Pasos**
1. Usá un sermón que cite **SBLGNT** (griego del NT) en su `citationManifest`.
2. **Exportá a PDF**. Repetí con **Docx**. Mirá también la **vista web publicada**.

**PASS si**
- [ ] PDF: última sección **"Atribuciones"** con el bloque **SBLGNT base text — CC BY 4.0** (copyright
      notice + license URL). Holmes 2010.
- [ ] Docx: misma sección "Atribuciones".
- [ ] Vista web publicada: sección "Atribuciones" tras la bibliografía.
- [ ] El bloque **MorphGNT CC BY-SA 4.0** NO aparece (correcto: latente — ningún path rendea morfología hoy).
- [ ] Si hay una fuente con licencia CC BY/copyright **sin** líneas de atribución en el manifest →
      el panel muestra **"Atribución de fuentes"** con `AttributionMissingRow` (bandera pre-publish, no bloquea export).

---

## Caso 6 — Blast radius 0 con flag OFF (control)

**Pasos**
1. En OTRA cuenta (o togglear `fidelity_pass` **off**), abrí/publicá un sermón normal.

**PASS si**
- [ ] El panel de fidelidad **no aparece**.
- [ ] Publicar funciona **sin** gate (no hay `fidelityReport` ⇒ `enforceFidelityGate` no muerde).
- [ ] Los exports siguen renderizando "Atribuciones" igual (la compliance legal NO depende del flag —
      `attributionReport` se computa del manifest, independiente del LLM).

---

## Post-smoke (al pasar los 6)

1. **Flip del flag**: decidir default-on de `fidelity_pass` (Q10) — o mantener dogfooders y flippear tras
   1-2 usuarios reales más. Documentar la decisión.
2. **Update docs**: en `phase-3-claim-source-fidelity.md` (Estado) y `README.md` cambiar
   "smoke pendiente" → "DEPLOYED + SMOKE OK (fecha)".
3. **Update memoria** `feature_pastoral_fidelity_roadmap`: estado Fase 3 → CERRADA + DEPLOYED + SMOKE OK.
4. Recién ahí Fase 3 queda *validated*; habilita arrancar Fase 4 sin apilar confrontaciones sin validar.

## Si algo falla

Documentar en la bitácora del phase-3 doc qué caso falló + repro. NO flippear el flag. Abrir fix-PR
antes de re-correr el smoke.
