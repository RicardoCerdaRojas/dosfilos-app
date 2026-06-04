# ADR-030 — Fidelity claim↔source por-marcador vive en el paper/estudio; el sermón cita de forma narrativa

## Estado

`accepted` — refina y supersede parcialmente [ADR-029](./ADR-029-fidelity-pass-gate-policy.md) (que subordinó el fidelity pass per-marcador al sermón).

## Fecha

2026-06-03

## Contexto

El smoke en prod de Fase 3 (2026-06-03) reveló que el fidelity pass per-marcador **no surface verdicts**
sobre sermones generados por el flujo principal de la iniciativa (estudio→genera). Causa raíz
(`tech_debt_fidelity_marker_emission`): el generador instruye marcadores `[Sn]` inline + `ragSources`,
pero el modelo frecuentemente llena `ragSources` (→ bibliografía "Fuentes consultadas") **sin anclar
`[Sn]` en la prosa**. `validateCitations` renumera los marcadores que existen pero no inserta los que
faltan → sermón con bibliografía pero 0 citas inline → el fidelity pass per-marcador no tiene qué evaluar.

El análisis encontró que la contradicción ya estaba en nuestro propio spec. **07-citation-policy §4**
mapea cada tipo de artefacto a un estilo de cita:

- **`sermon`** → estilo **`sermon` (pastoral, narrativo)**: *"Como resume la Confesión de Westminster
  1.1, Dios quiso dejar su revelación por escrito…"* — tejido en la prosa.
- **`exegetical-paper`** → estilo **`essay_or_article`**: footnote `[N]` + bibliografía.

El fidelity pass per-marcador (ADR-029) asumió marcadores `[N]` — el estilo del **paper académico** —
y lo aplicó al **sermón**, cuyo estilo canónico (§4) es narrativo pastoral. Es un modelo de paper
aplicado al artefacto equivocado. Un sermón con footnotes `[N]` por oración además choca con el ethos
de la iniciativa (P1/P2: "formar predicadores fieles, no producir sermones sintéticos") — un sermón
predicado no lleva notas al pie por afirmación.

## Decisión

1. **La validación claim↔source por-marcador (`[N]` → chunk) es feature del PAPER / estudio exegético,
   NO del sermón.** Vive donde el pastor ancla fuentes con marcadores legítimos: el paper. El claim↔source
   fidelity se relocaliza al módulo de exégesis (territorio de Fase 7), no al sermón.

2. **El sermón cita de forma NARRATIVA pastoral (07 §4).** El generador produce atribución tejida en la
   prosa (*"Como enseña Subukjian…"*, *"Como resume la Confesión…"*), NO marcadores `[Sn]` de footnote ni
   una bibliografía-volcado al final. El generador deja de intentar emitir `[Sn]` para el fidelity pass.

3. **El sermón hereda fidelidad del estudio/paper que lo originó.** No corre un fidelity pass per-marcador
   propio. La garantía de fidelidad se establece aguas arriba (el pastor estudió y ancló fuentes en el
   paper), no aguas abajo sobre prosa sin anclas.

4. **Alcance preciso de lo que se mueve / se queda** (evita sobre-demoler Fase 3):
   - **Se relocaliza al paper / se desactiva en el sermón**: PR 1 (verdicts per-marcador) + el hard-block
     per-marcador de PR 2 (`>20% unrelated|contradicts`). Sin `[N]` en el sermón, esa sección queda inerte.
   - **Se queda en el sermón** (no dependen de marcadores per-claim):
     - **Attribution (PR 5)** — se computa del `citationManifest`, es compliance legal; rendea en todo
       export sin importar markers. **Correcto que viva en el sermón.**
     - **Plurality (PR 3)** — detecta afirmaciones doctrinales sobre la **prosa** y exige ≥2 pasajes
       bíblicos distintos. No depende de markers de biblioteca. Puede quedarse.
     - **Authority (PR 4)** — detecta credo-como-autoridad-final sobre la **prosa**. No depende de markers.
       Puede quedarse.
   - El publish gate (PR 2) degrada con gracia: su hard-block per-marcador nunca dispara en sermones (0
     verdicts), pero los soft-blocks de plurality/authority siguen operando.

5. **`fidelity_pass` NO se flipea a default-on** en su forma actual (per-marcador sobre sermón). Lo que
   eventualmente se prenda para el sermón es el subconjunto prose-based (plurality/authority) + attribution.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **A — El sermón lleva ancla `[N]` por-claim, renderizada como cita narrativa** | El sermón pastoral igual necesitaría una ancla por afirmación; choca con el ethos (predicar no es footnotear) y el modelo resiste emitir las anclas de forma confiable. El render narrativo no resuelve que el artefacto correcto para anclas es el paper. |
| **B — Evaluador semántico claim↔source en el sermón (sin `[N]`, match por significado)** | Caro de construir y, sobre todo, el lugar correcto del claim↔source es el paper (donde las citas SON `[N]` legítimas). Deferida; si alguna vez el sermón necesita validación propia, es semántica, pero no es la prioridad. |
| **C (elegida) — Per-marcador en el paper; sermón narrativo** | Alinea con 07 §4 + el ethos pastoral + el flujo de la iniciativa (estudia→ancla en paper→genera sermón hereda). |

## Consecuencias

### Positivas

- El claim↔source fidelity vive donde las citas `[N]` son legítimas (el paper), no forzado sobre un
  artefacto cuyo estilo canónico es narrativo.
- El sermón se alinea con 07 §4 y con el ethos P1/P2: cita pastoral, no aparato académico.
- Flujo coherente: el pastor estudia y ancla fuentes en el paper → el sermón hereda fidelidad.
- Resuelve `tech_debt_fidelity_marker_emission` por reencuadre, no por pelear con la adherencia del modelo.

### Negativas

- Fase 3 cableó la maquinaria per-marcador (panel de verdicts + hard-block) sobre el **sermón**. Hay
  trabajo de remediación: relocalizar al paper + desactivar/ocultar la sección per-marcador en el sermón.
- El generador de sermón necesita cambiar de "emite `[Sn]` + bibliografía" a "cita narrativa §4" — cambio
  de prompt + validación.
- El sermón pierde validación claim↔source propia (mitigado: la hereda del estudio/paper).

### Neutrales

- Plurality / authority / attribution permanecen en el sermón; hay que confirmar en código que ninguno
  depende del marcador per-claim para renderizar (el análisis indica que no).
- Fase 7 (exégesis reform) hereda el claim↔source fidelity como prereq/feature. Actualizar su phase doc.
- El flag `fidelity_pass` cambia de significado: deja de ser "per-marcador sobre sermón".

## Plan de remediación (PRs, no incluidos en este ADR)

1. Generador de sermón → citas narrativas (07 §4); dejar de instruir `[Sn]`/bibliografía-volcado.
2. Sermón: ocultar/retirar la sección de verdicts per-marcador del `FidelityReviewPanel`; conservar
   plurality + authority + attribution.
3. Relocalizar el claim↔source per-marcador al paper/exégesis (diseño + Fase 7).
4. Actualizar phase-3 doc (alcance real), phase-7 doc (hereda fidelity), ADR-029 (estado → superseded en
   parte por ADR-030).

## Referencias

- [ADR-029](./ADR-029-fidelity-pass-gate-policy.md) — refinado/superseded en parte por este ADR.
- [07-citation-policy.md §4](../07-citation-policy.md) — estilos de cita por artefacto (sermón narrativo vs paper footnote).
- [05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md) — ethos P1/P2.
- `tech_debt_fidelity_marker_emission` (memoria) — hallazgo raíz del smoke.
- § "Hallazgos del smoke (2026-06-03)" en [phase-3 doc](../phases/phase-3-claim-source-fidelity.md).
