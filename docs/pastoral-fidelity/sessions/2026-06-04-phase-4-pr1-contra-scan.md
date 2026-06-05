# Session log — 2026-06-04 — Fase 4 PR 1 (contra-scan)

> Cierre del **milestone contra-scan** (sub-feature 2 de Fase 4). Fase 4 **NO** cerrada:
> sub-features 1 (autoría verbatim) y 3 (voice fingerprint) siguen `planning`.

## Entregado

Contra-scan: la confrontación P3 (Hechos 20:27, "todo el consejo de Dios") sobre el sermón.
Antes de publicar, el sistema surface fragmentos de la biblioteca del pastor que **disienten**
de su idea central y le exige considerar ≥1 con una nota propia (soft-block, override audit-logged).

Validado **en vivo en prod** por el fundador: "Anclados en la Verdad" (2 Pedro 1:16-21) →
contra-scan surface 2 fragmentos reales del Comentario de Kistemaker (1-2 Pedro y Judas, p.224)
que tensionan βεβαιότερον ("hecha más segura" vs "más confiable") + la dirección de confirmación
AT↔apostólico. Retrieve real + clasificación de disenso real + nunca inventa.

## PRs mergeados

- **#315** — `feat(pastoral-fidelity): Phase 4 PR1 — contra-scan pre-publish confrontation (ADR-033)`.
  Core: domain `ContraScanReport` entity + `evaluateContraScanGate` puro (mirror de `evaluatePublishGate`)
  + 12 tests; callable `findDissentingChunks` (App Check enforced, `ILlmClient`, exporta `embedQuery` de
  `retrieveChunks`); `ISermonRepository.updateContraScanReport` + (de)serialización Firestore;
  `SermonService.recordContraScan` + `enforceContraScanGate`; web `useFindDissentingChunks` +
  `useSermonContraScan` + `ContraScanModal` en sermón detail; `useContraScanGate` flag hook; i18n es/en;
  admin Feature Flags label.
- **#316** — `feat(pastoral-fidelity): contra-scan in wizard publish path (ADR-033 follow-up)`.
  El wizard (`StepDraft` → `publishSermonAsCopy`) bypasseaba contra-scan. Cableado como 1er gate del
  wizard + `enforceContraScanGate` en `publishSermonAsCopy` (defense-in-depth).
- **#317** — `feat(pastoral-fidelity): clarify contra-scan modal — central idea + sermon-vs-library labels`.
  Smoke feedback: el modal no mostraba la idea central. Ahora la destaca arriba + etiqueta procedencia
  ("tu biblioteca"/"biblioteca base") + "en qué tensiona tu idea" + cita textual apartada + hint de los
  dos caminos (registrar reflexión, o volver y ajustar el punto).

## Decisiones

- **ADR-033** (`accepted`) — contra-scan = paso de confrontación INDEPENDIENTE del fidelity gate dormido
  (ADR-032). Reusa el **patrón** (gate puro + override audit) + la infra de recuperación de ADR-031
  (personal→CORE), no la **instancia** de fidelidad. Esto **matiza** el handoff de Fase 3 ("Fase 4 debe
  extender `evaluatePublishGate`"): con fidelity dormido en el sermón, contra-scan trae su propia maquinaria.
- **3 decisiones de producto del fundador**: (1) step propio pre-publish vivo siempre (no atado a
  `fidelity_pass`); (2) soft con nota obligatoria ≥100 chars + override audit-logged, NO hard-block;
  (3) biblioteca sin disenso → pasa + invita a sumar fuentes (NO cae a CORE).

## Tests al cierre

domain 430 · application 77 · infrastructure 55 · web 96 — todos verde. tsc limpio en los 4 paquetes.
Flag `contra_scan` (⊂ `pastoral_fidelity_flow`) default off, on en la cuenta del fundador.

## Handoff a las sub-features restantes de Fase 4

### Dependencias satisfechas (consumibles por verbatim / voice)

- **Patrón de gate independiente**: `evaluateContraScanGate` + `ContraScanReport` + `recordContraScan` +
  `enforceContraScanGate` en AMBOS paths (`publishSermon` detalle + `publishSermonAsCopy` wizard). El
  verbatim tracker (sub-feature 1) puede mirrorear este patrón en vez de despertar el fidelity gate.
- **`findDissentingChunks` / retrieval reuse**: `embedQuery` exportado de `retrieveChunks`; patrón
  retrieve personal→CORE + LLM-classify reusable.
- **`ContraScanModal` + `useSermonContraScan`**: surface de confrontación pre-publish reusable; el orden
  hoy es contra-scan → verificador de citas → publish. Sub-feature 1 (verbatim) debería insertarse en la
  MISMA cadena, no abrir un 3er modal aparte.
- **Sub-flag pattern** (`useContraScanGate`) + admin allowlist (`setUserFeatureFlags`) + label i18n.

### Dependencias NO satisfechas / deuda

- **Sub-features 1 (autoría verbatim ≥50%) y 3 (voice fingerprint)**: NO empezadas, siguen `planning`.
  Decisiones pendientes en el phase-4 doc (algoritmo de diff, threshold, técnica de voice, corpus mínimo,
  privacidad).
- **`detail.tsx` 633 líneas** (god component): Boy-Scout pendiente ANTES de inyectar el badge de autoría
  verbatim (sub-feature 1 toca el mismo archivo).
- **`useFindDissentingChunks` importa firebase/functions directo** (patrón consistente con
  `buildSermonCitationManifest`); deuda del track LLM/firebase abstraction.
- **Calidad del disenso depende de la biblioteca**: bibliotecas homogéneas surfacean poco. Aceptado
  ("nunca inventar" > confrontación sintética).

## Retro

### Mejor que estimado
- Reusar la infra de ADR-031 (`retrieveChunks` + prioridad personal→CORE) hizo el callable de contra-scan
  barato — solo `embedQuery` + 2 findNearest + 1 clasificación LLM.
- El patrón de gate puro + override de Fase 3 se replicó 1:1, UX de confrontación consistente sin diseño nuevo.

### Tomó más tiempo / fricción
- El gap del wizard: #315 gateó solo el detalle, pero el fundador publica desde el wizard. Costó un PR extra
  (#316). Aprendizaje: **el surface canónico de publish del wizard es `publishSermonAsCopy`, no
  `publishSermon`** — gatear ambos desde el inicio.
- Claridad del modal: el primer diseño no mostraba la idea central, el fundador no entendía el contraste
  (#317). Aprendizaje: en un modal de confrontación, mostrar SIEMPRE "lo tuyo" junto a "lo que lo tensiona".

### Cambió del plan
- El handoff de Fase 3 mandaba "extender `evaluatePublishGate`". ADR-030/031/032 (post-cierre Fase 3)
  dejaron el fidelity gate dormido → ADR-033 lo desacopló. El plan del phase-4 doc quedó matizado.

### Aprendizajes para fases futuras
- Cuando un ADR posterior cambia el supuesto de un handoff, emitir ADR nuevo que lo matice explícitamente
  (no silenciosamente desviarse).
- Gatear TODOS los surfaces de publish (detalle + wizard) en el mismo PR para evitar gaps de confrontación.
- Modales de confrontación: contraste explícito (tuyo vs fuente) + copy que diga qué hacer con el hallazgo.
