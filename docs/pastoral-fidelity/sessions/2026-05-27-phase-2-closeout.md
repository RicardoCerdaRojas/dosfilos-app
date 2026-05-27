# Session log — Phase 2 closeout (Tres Testigos)

**Fecha**: 2026-05-27
**Fase**: 2 — Tres testigos para validar la semilla pastoral
**Estado al cierre**: `completed` — PR #262 (`cde288db`) squash-merged a main + callable deployado a prod + smoke OK.

## Resumen de lo entregado

Mecanismo de tres testigos (ADR-011) que valida los claims del `pastoralSeed` (idea central + observaciones + aplicación doxológica) antes de generar el borrador. Detrás del sub-flag `three_witnesses` (requiere `pastoral_fidelity_flow`), default off.

- **Domain** — `WitnessValidation.ts`: tipos (`WitnessVerdict`/`WitnessedClaim`/`WitnessResult`/`WitnessReview`), escalado puro (`escalateClaim`, `escalateWitnessedClaim`, `aggregateWitnessResult`, `canProceedFromWitnesses`), `collectSeedClaims`, `CORE_DOCTRINE_CLAIMS`, `WITNESS_THRESHOLDS`. `PastoralSeed.witnessReview?` aditivo. 11 tests.
- **Functions** — `validateSeedWitnesses` callable thin (3 llamadas gemini-2.5-flash, verdicts crudos, cache `witnessResults/`) + `prompts.ts` (T1/T2/T3, T3 batchea tradiciones vía `collectionGroup('sections')`).
- **Web** — `useWitnessValidation` (mapea verdicts crudos → `WitnessResult` vía domain) + `WitnessGate` (7º paso "Validación") + sub-flag `useThreeWitnessesGate` + intercept en `PastoralSeedWizard.handleAdvance` + `saveWitnessReview`. 3 gate tests.
- **Infra** — rules `witnessResults/` + index `sections.doctrineLevel` + flag `three_witnesses` (domain + `setUserFeatureFlags` allowlist).
- **Boy-Scout** — fix de ref muerto `BibleReaderPanel`→`ScrollArea` (warning de consola).

### Escalado (ADR-011, supersede tabla por-conteo de ADR-001)

`escalateClaim(detectedLevel, dissentCount)`: `core`+disenso → `absolute-block` (sin override); `distinctive`/null → pass/note/soft/hard por conteo; `open-evangelical` cap nota. Disenso cuenta solo con `confidence ≥ 0.6`. T3 multi-witness (ADR-010): core siempre, distinctive/open si `useConfessionalWitnesses` on.

### Smoke prod (flag-on)

- core (niega Trinidad en Juan 1:1) → `absolute-block`, bloquea publish ✅
- distinctive 2/3 → `soft-block` (respuesta ≥50) ✅
- observación ortodoxa → `pass` ✅

## Bloque 3 — Handoff a Fase 2.5 (Study Depth Copilot)

**Dependencias satisfechas que 2.5 consume**:
- `WitnessResult`/`WitnessedClaim` (domain) → evidence D4 (canon) + D6 (historia). `detectedLevel` + verdicts ya computados.
- `pastoralSeed.witnessReview` → señal de engagement con confrontación (D7).
- Callable `validateSeedWitnesses` + cache `witnessResults/` → patrón de classifier batcheado reusable para `DimensionClassifier`.
- Sub-flag pattern `three_witnesses` → mismo patrón para sub-flag de Study Depth.

**Dependencias NO satisfechas / deuda intencional heredada**:
- **D1** — T3 `distinctive` delgado: solo 4 credos tienen `sections` con `doctrineLevel`. Content-fill de 7 confesiones grandes = follow-up (parsers CCEL, pendiente desde Fase 0). No bloquea 2.5.
- **D3** — Faculty launcher fold-simple (link a `/dashboard/faculty`, sin pre-seed de prompt). Pre-seed = follow-up.
- **Smoke `hard-block` (3/3)** no ejecutado explícitamente (cubierto por test domain).
- **Renumeración ADR**: 2.5 reservaba ADR-011/012/013; 011 lo consumió Fase 2 → renumerados a **022/023/024**.
- **Gotcha**: flags nuevos deben ir también en la allowlist de `setUserFeatureFlags` (functions), no solo en `FEATURE_FLAG_NAMES` (domain).

Phase doc de 2.5 actualizado: prereqs Fase 1/2 marcados ✅ con PR links, ADRs renumerados, bitácora + insumos concretos agregados.

## Bloque 4 — Retrospective

**1. Qué fue mejor que estimado.** El estimado era ~1.5-2 semanas; la implementación funcional salió en una sola sesión. Razón: ~70% reuso real (patrón callable+cache de Fase 1.5, `useCrossReferences` como template del hook, gate-test pattern de Fase 1.5, confession repo + cross-ref engine ya live). La decisión de mantener el escalado como función pura en domain hizo que los tests fueran triviales y el callable quedara delgado.

**2. Qué tomó más tiempo / fricción.** Dos cosas no-técnicas: (a) el deploy bloqueado por el classifier de permisos (correcto — producción necesita OK explícito), y (b) el bug de `setUserFeatureFlags` con su propia allowlist server-side, que no se detecta en build porque functions no importa domain. También un artefacto del entorno: el Write tool dejó tags `</content>` al final de archivos nuevos, que rompían el transform de esbuild hasta limpiarlos.

**3. Qué cambió del plan original.** (a) ADR-010 ya había reescrito el modelo de Testigo 3 (anchor único → multi-witness plural), así que el plan tuvo que abandonar la firma `validateSeed(seed, confession)` del phase doc original. (b) El escalado migró de "por conteo" (ADR-001) a "nivel×conteo" (ADR-011). (c) Faculty quedó fold-simple (link) en vez de integración rica, por decisión del fundador para testear pronto. (d) Decisión de no tocar `FirebaseConfessionRepository` (web) — la fuente confesional se lee server-side vía `collectionGroup`, lo que eliminó un PR-touchpoint.

**4. Aprendizajes para fases futuras.** (a) **Duplicación de allowlists**: cualquier flag nuevo necesita domain `FEATURE_FLAG_NAMES` + functions `setUserFeatureFlags` — agregar a un checklist de "nuevo sub-flag". (b) **ADR numbering**: los placeholders de números ADR en phase docs futuros (2.5 reservaba 011-013) colisionan cuando una fase intermedia consume números; conviene reservar rangos altos o no pre-numerar. (c) **Functions↔domain decoupling**: mantener el LLM-call thin en functions + la lógica pura en domain (corriendo client-side) funcionó muy bien — replicable en Fase 2.5 `DimensionClassifier` y Fase 3 fidelity pass. (d) El patrón "gate como fase N+1 dentro del wizard, sin tocar el step-machine del domain" mantuvo `evaluatePastoralSeed` limpio — buen molde para futuros gates pre-publish.

## Sanity check (Bloque 5)

- Onboarding mental: un agente que abra `/iniciar-fase 2.5` mañana tiene prereqs ✅, insumos concretos, ADRs renumerados y gotchas en el phase doc + memoria. ✅
- Git: PR #262 merged, branch borrado, main sincronizado.
- Production: callable + rules + index + flag deployados; flag default off (blast radius 0).
- Docs de cierre (este log) ⟶ pendiente commit junto con los updates de docs/memoria.
