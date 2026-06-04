# ADR-033 — Contra-scan como paso de confrontación independiente (no extiende el gate de fidelidad dormido)

## Estado

`accepted`

## Fecha

2026-06-04

## Contexto

Fase 4 sub-feature 2 (contra-scan) implementa el principio **P3 — Confrontación obligatoria** (Hechos 20:27, "todo el consejo de Dios") sobre el sermón: antes de publicar, el sistema surface chunks de la biblioteca del pastor que **disienten** de su idea central, y el pastor debe considerar al menos uno con una nota propia.

El [phase-4 doc](../phases/phase-4-authorship-contrascan-voice.md) (escrito al cierre de Fase 3, 2026-06-03) asumía que contra-scan **extendería** el publish gate de fidelidad (`evaluatePublishGate` + `PrePublishFidelityModal` + `FidelityReport`): "extender el mismo gate, no crear gate paralelo".

Pero entre ese cierre y hoy, tres ADRs re-scopearon el sermón:

- **[ADR-030](./ADR-030-fidelity-per-marker-belongs-to-paper-sermon-narrative.md)** — la fidelidad claim↔source per-marcador es feature del **paper exegético**, no del sermón.
- **[ADR-031](./ADR-031-sermon-narrative-verifiable-anchored-citations.md)** — el sermón cita de forma **narrativa con ancla verificable** (popover: chunk + libro + página), prioridad biblioteca personal → CORE, ≥1 cita por punto, nunca inventa.
- **[ADR-032](./ADR-032-fidelity-pass-dormant-on-sermon.md)** — el fidelity pass per-marcador queda **dormido** en el sermón (se reubica al paper en Fase 7).

Consecuencia: el gate que el phase-4 doc mandaba "extender" (`evaluatePublishGate` sobre `FidelityReport.gateStatus`) está **dormido** en el sermón. Extenderlo significaría despertar maquinaria que ADR-032 acaba de apagar deliberadamente. Hay una tensión que resolver antes de codear.

Restricciones / supuestos:

- Contra-scan **no es** mecánica de fidelidad (no evalúa si una cita respalda un claim). Es mecánica de **confrontación**: ¿el pastor consideró la posición contraria? Es conceptualmente independiente del fidelity pass.
- La infra de citación de ADR-031 (`retrieveChunks` + prioridad personal→CORE) es la base natural: misma recuperación, pero la query busca disenso en vez de respaldo.
- P2 (AI desarrolla, no origina): el LLM solo **clasifica** chunks reales de la biblioteca por su postura frente a la idea central; nunca fabrica una posición contraria. La nota del pastor es suya (AI-forbidden, igual que `centralIdea`).
- La biblioteca puede ser chica o vacía → no siempre hay disenso con qué confrontar.

## Decisión

Contra-scan se implementa como **paso de confrontación independiente pre-publish**, desacoplado del gate de fidelidad dormido:

1. **Surface propio, no extensión del gate de fidelidad.** Contra-scan tiene su propio reporte (`ContraScanReport`), su propio gate puro (`evaluateContraScanGate`), su propio modal (`ContraScanModal`) y su propio hook (`useContraScanGate`). NO se cuelga de `FidelityReport`/`evaluatePublishGate`/`PrePublishFidelityModal` (dormidos por ADR-032). Reusa el **patrón** (gate puro + override audit-logged + modal de confrontación), no la maquinaria de fidelidad.

2. **Vivo bajo sub-flag propio `contra_scan`** (bajo `pastoral_fidelity_flow`), independiente de `fidelity_pass`. Contra-scan es la confrontación **activa** del sermón mientras fidelity duerme — no se apila sobre una confrontación sin validar, la reemplaza como mecánica P3 del sermón.

3. **Recuperación reusa ADR-031.** `findDissentingChunks` (callable, App Check enforced, `ILlmClient`) recupera sobre la idea central con **prioridad personal → CORE** (mismo `retrieveChunks` core, extraído a helper compartido), y un paso LLM clasifica la postura de cada chunk (`supports` | `neutral` | `dissents`) devolviendo solo los disidentes con una línea de tensión. Nunca inventa: clasifica chunks provistos.

4. **Soft con nota obligatoria.** Si hay ≥1 chunk disidente, el pastor debe marcar ≥1 como "considerado" con nota propia ≥100 chars para publicar. Override disponible con justificación ≥100 chars audit-logged (mismo patrón `GateOverride`). No hard-block: la biblioteca chica no debe trampear el publish.

5. **Biblioteca vacía pasa + invita.** Si no hay disenso (biblioteca chica/vacía o el LLM no halla postura contraria real), el modal muestra "No encontramos posiciones contrarias en tu biblioteca" + CTA suave para sumar fuentes, y **pasa** (no bloquea — no hay con qué confrontar). Coherente con "nunca inventar" de ADR-031.

6. **Persistencia para audit P3.** El `ContraScanReport` (chunks disidentes + consideración del pastor + override) se persiste en `sermon.contraScanReport` vía `updateContraScanReport` (mirror de `updateFidelityReport`), como rastro permanente de la confrontación.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Reactivar `evaluatePublishGate`/`FidelityReport` para hospedar contra-scan (lo que mandaba el phase-4 doc) | Contradice ADR-032 (fidelity dormido). Acoplaría contra-scan a maquinaria recién apagada; despertar el gate para un propósito distinto invita drift. |
| Solo nudge inline en el editor, sin gate pre-publish | Débil frente a P3 ("confrontación obligatoria"). El pastor puede ignorarlo sin fricción. |
| Hard-block sin override | Frágil: biblioteca chica o LLM sin disenso real bloquearían publish legítimo. Decisión del fundador: soft con nota. |
| Caer a CORE para buscar disenso cuando la personal no tiene | Puede traer disenso ajeno al marco confesional del pastor. Decisión del fundador: pasar + invitar a sumar fuentes propias. |
| Query directa por la negación de la idea central | La similitud semántica sobre el tópico ya surface contra-posiciones; clasificar con LLM es más robusto que recuperar por negación (que trae no-secuiturs). |

## Consecuencias

### Positivas

- Contra-scan se vuelve LA confrontación viva del sermón sin apilarse sobre fidelity dormido (ADR-032 intacto).
- Reusa la infra de citación de ADR-031 (retrieve + prioridad personal→CORE) — bajo costo incremental, una sola fuente de recuperación.
- Patrón de gate puro + override audit-logged ya probado en Fase 3 → consistencia de UX de confrontación.
- P1/P2/P3 reforzados: el pastor engancha con vistas contrarias (P3), de su propia labor/biblioteca (P1), y la nota es suya (P2 — AI no origina la consideración).

### Negativas

- Segundo reporte sobre el sermón (`contraScanReport` además de `fidelityReport`) — más superficie en la entidad Sermon. Mitigado: ambos opt-in/aditivos, `detail.tsx` candidato a Boy-Scout decomposition (deuda heredada del phase-4 doc).
- El paso LLM de clasificación de disenso agrega latencia + costo al publish (una llamada Flash sobre ~12 chunks). Mitigado: solo corre al publicar, bajo flag.
- Calidad del disenso depende de la biblioteca del pastor — bibliotecas homogéneas surfacearán poco. Aceptado: "nunca inventar" > confrontación sintética.

### Neutrales

- El phase-4 doc queda parcialmente superado en su sección "Dependencias que Fase 4 consume" (la fila "extender evaluatePublishGate"): contra-scan extiende el **patrón**, no la **instancia** de fidelidad. Se anota en la bitácora.
- `findDissentingChunks` recupera con la misma lógica que `retrieveChunks`; se extrae un core compartido (`retrievalCore.ts`) — refactor aditivo sin cambio de comportamiento del callable existente.

## Impacto

- **Código afectado**:
  - `packages/domain/src/entities/ContraScanReport.ts` (nuevo), `services/evaluateContraScanGate.ts` (nuevo), `entities/Sermon.ts` (+`contraScanReport?`), `entities/User.ts` (+flag `contra_scan`).
  - `packages/functions/src/library/retrievalCore.ts` (nuevo, extraído), `library/retrieveChunks.ts` (refactor a helper), `sermon/findDissentingChunks.ts` (nuevo callable).
  - `packages/application` + `packages/infrastructure`: `updateContraScanReport` en repo + service.
  - `packages/web`: `useFindDissentingChunks`, `useContraScanGate`, `ContraScanModal`, wire en `detail.tsx`, i18n `contraScan`.
- **Fases impactadas**: Fase 4 (este es su PR 1). Fase 7 (exégesis) heredará el patrón de confrontación si aplica al paper.
- **Migraciones requeridas**: ninguna — `contraScanReport` es aditivo/opt-in; sermones previos lo tienen `undefined`.
- **Reversibilidad**: alta — sub-flag `contra_scan` default off; flag off ⇒ publish legacy sin gate (blast radius 0).

## Referencias

- Phase doc: `phases/phase-4-authorship-contrascan-voice.md`
- ADRs: ADR-030, ADR-031, ADR-032 (re-scope del sermón que motiva el desacople), ADR-029 (patrón de gate + override audit que se reusa)
- Manifiesto: `05-pedagogy-manifesto.md` (P3), `07-citation-policy.md` (nunca inventar)
- Memoria relacionada: `feature_pastoral_fidelity_roadmap`
- PRs relacionados: (este PR)
