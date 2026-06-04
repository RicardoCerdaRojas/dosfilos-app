# ADR-032 — El fidelity pass per-marcador queda DORMANTE en el sermón (no se desmonta)

## Estado

`accepted` — complementa [ADR-031](./ADR-031-sermon-narrative-verifiable-anchored-citations.md) y
[ADR-030](./ADR-030-fidelity-per-marker-belongs-to-paper-sermon-narrative.md).

## Fecha

2026-06-04

## Contexto

El fidelity pass per-marcador de Fase 3 (`evaluateClaimSourceFidelity` callable, `FidelityReport`,
`FidelityReviewPanel`, publish gate, sub-flag `fidelity_pass`) verifica, por cada `[N]`, si el chunk
citado respalda la afirmación. ADR-030/031 ya decidieron que **el claim↔source per-marcador pertenece
al PAPER/estudio, no al sermón** (el sermón cita narrativo + ancla verificable).

El test runtime de "resucitar el fidelity pass en el sermón" (Opción A) reveló un **mismatch de forma**:
el callable espera `content` ESTRUCTURADO (`content.introduction`/`content.body[]` + `content.citationManifest`),
pero el sermón **publicado** persiste `content` como **string markdown** (de `getFullContent()`) y el
manifest vive en `sermon.citationManifest` (top-level). Resultado: `joinProse(string)` → `''` y
`content.citationManifest` → undefined → "Este sermón no tiene marcadores de cita para revisar", aunque
los `[N]` SÍ estén en el markdown.

Las citas del sermón ya están protegidas por TRES capas sin el fidelity pass:
1. **Injector** (`injectNarrativeCitationAnchors`) — nunca inventa, ancla solo fuentes reales del manifest.
2. **Popover** (`CitationMarker`) — el lector verifica el chunk + página.
3. **Verificador pre-publish** (`VerifySermonCitationsUseCase`) — caza comillas textuales inventadas.

## Decisión

1. **NO se desmonta** el fidelity pass. La maquinaria (`evaluateClaimSourceFidelity`, `FidelityReport`,
   `computeFidelitySummary`, `evaluatePublishGate`, `FidelityReviewPanel`) se **reubicará al paper/exégesis**
   en Fase 7 (per ADR-030/031). Desmontar ahora = reconstruir después.

2. **Queda DORMANTE en el sermón**: el sub-flag `fidelity_pass` permanece **default off** (ya lo está) y
   NO se flipea para el sermón. No se cablea su evaluación per-marcador sobre el sermón.

3. **Blindaje anti-zombie** (para que no quede como "feature sin alma"):
   - Marcadores `🛑 DORMANT (ADR-032)` en los 3 puntos de entrada: la entrada `fidelity_pass` en
     `User.ts FEATURE_FLAG_NAMES`, el `FidelityReviewPanel`, y el callable `evaluateClaimSourceFidelity`.
   - Guard defensivo en `FidelityReviewPanel`: si el flag se enciende pero el sermón no tiene markers
     evaluables, NO renderiza el panel roto ("no tiene marcadores") — retorna null.
   - Memoria de proyecto `tech_debt_fidelity_pass_dormant` con el estado + camino de revival.

## Condición de revival

Encender el fidelity pass requiere, EN ESTE ORDEN, revisitar este ADR y:
- **Para el paper (Fase 7)**: reubicar el callable al artefacto paper, cuyo `content` y citas `[N]` son
  estructurados y académicos (su hábitat correcto).
- **Para el sermón (si alguna vez)**: arreglar el mismatch de forma — el callable debe (a) leer el
  manifest de `sermon.citationManifest` (top-level), no solo `content.citationManifest`, y (b) manejar
  `content` string (usarlo como prosa, extraer los `[N]`). Recién entonces flipear como QA advisory
  (gate suave, no hard-block — las anclas por solope léxico son más flojas que las nombradas).

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Desmontar todo** | La maquinaria se reusa en el paper (Fase 7). Tirarla = trabajo perdido + rebuild. |
| **Flag off y nada más** | Quedaría como feature zombie sin trazabilidad → confunde a futuros devs ("¿qué es esto que no hace nada?"). |
| **Arreglar + flipear ahora (Opción A)** | Las 3 capas existentes ya protegen las citas; la 4ª (per-claim) es nice-to-have, no justifica el fix + costo LLM ahora. |

## Consecuencias

### Positivas
- Cero feature zombie: dormante documentado, con propósito (paper/Fase 7) + camino de revival.
- La maquinaria de Fase 3 se preserva para su hábitat correcto (el paper).
- Las citas del sermón quedan protegidas por las 3 capas vigentes.

### Negativas
- El sermón no tiene verificación per-claim por-LLM hasta Fase 7 (mitigado: injector nunca inventa +
  popover + verificador pre-publish).

### Neutrales
- El `FidelityReviewPanel` sigue montado en `detail.tsx` pero gated off + con guard → invisible/seguro.

## Referencias
- [ADR-030](./ADR-030-fidelity-per-marker-belongs-to-paper-sermon-narrative.md), [ADR-031](./ADR-031-sermon-narrative-verifiable-anchored-citations.md)
- `tech_debt_fidelity_pass_dormant` (memoria de proyecto)
