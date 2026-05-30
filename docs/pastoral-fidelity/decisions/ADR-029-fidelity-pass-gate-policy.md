# ADR-029 — Fidelity pass gate policy + LLM tiering + override semantics

## Estado

`accepted` — aceptado 2026-05-30 al arrancar Fase 3 con `/iniciar-fase 3`. Formaliza las 10
decisiones (Q1-Q10) tomadas en sesión de planning con el fundador.

## Fecha

2026-05-30

## Contexto

Fase 3 (Pass de fidelidad claim↔source en borrador) extiende el citation engine (Fases B+C en main)
con un segundo-pass LLM que evalúa, para cada marker `[N]` del borrador generado, si el chunk citado
respalda la oración a la izquierda. Suma 3 validators de
[ADR-006](./ADR-006-rights-aware-citation-system.md):

- **Plurality** (no-proof-texting)
- **Attribution** (CC BY/BY-SA compliance en render final)
- **Authority** (confesión subordinada al texto, no autoridad final)

El phase doc anterior dejaba TBD: modelo LLM, granularidad del claim, threshold exacto, UX overrides,
re-run caching, scope del attribution footer, manejo de SBLGNT hardcoded, ordenamiento de PRs, y
default del sub-flag. Esta ADR fija las 10 decisiones de una vez para no parar después.

Restricciones asumidas:

- Costo LLM por sermón debe quedar bajo $0.10 (ballpark Phase 2.5 SDS classifier ~$0.02/sesión).
- Modo experto de Fase 2.5 (self-service ganado SDS>80 + N sermones) ya existe; no se duplica.
- Gate de publish vive en `SermonService.publishSermon` (no Firebase trigger).
- Hard-block sin override es coherente con el manifiesto (P3: confrontación obligatoria) — pero
  soft-block con justificación >100 chars es coherente con ADR-027 (suaviza no silencia).

## Decisión

### Q1 — Modelo LLM evaluator (tiering)

**Gemini Flash batched** para evaluar todos los markers de un sermón en un solo callable; **escalar a
Sonnet 4.6** solo para verdicts inicialmente clasificados como `partial` o `contradicts`, donde el
razonamiento más fino justifica el costo.

- Cost ballpark: 30 markers × $0.001/marker (Flash) + 6 escalados × $0.005/marker (Sonnet)
  ≈ $0.06/sermón.
- `FidelityReport.modelTier`: `'flash' | 'sonnet' | 'mixed'`.
- `FidelityVerdict.modelUsed`: tracking per-verdict para debugging.

### Q2 — Granularidad del claim a evaluar

**Oración completa antes del marker** (regex de fin de oración: `[.!?]\s`).

- NO claim semántico extraído (evitaría LLM extra).
- NO sub-oración (claims múltiples por oración son raros y el costo de extracción no se justifica).

### Q3 — Threshold del gate de publish

- **>20% verdicts `unrelated|contradicts`** del total → **hard-block sin override**.
- **>10% verdicts `partial`** → **soft-block con justificación ≥100 chars audit-logged**.
- **Plurality/Authority failures** → soft-block con sugerencia inline (no contribuyen al ratio).

**Admin toggle** (`adminFidelityThresholds` collection) permite calibrar los porcentajes post-launch
con corpus real. Default valores quedan fijos arriba.

### Q4 — Detección de claim sustantiva (PR 3)

**LLM tagger en el mismo batch del fidelity pass** (no llamada separada).

- El prompt del evaluator clasifica cada claim con `detectedLevel: 'core' | 'distinctive' |
  'open-evangelical'` además del verdict de fidelidad.
- Reusa el sistema de tres niveles del manifiesto (06-pedagogy-applied §4).
- Plurality validator solo aplica a `core` + `distinctive` (no `open-evangelical`).

### Q5 — Modo experto / skip fidelity pass

**Reusa el gate experto de Fase 2.5** ([ADR-027](./ADR-027-override-and-expert-mode-policy.md)).

- Mismo threshold: N sermones con SDS≥80 publicados → toggle disponible.
- Mismo super-admin escape hatch.
- NO se crea un toggle expert-mode separado para fidelity. Una sola política de paternalismo.

### Q6 — Re-run y cache invalidation

**Invalidar solo verdicts del marker afectado** cuando el pastor re-cita o re-genera una oración.

- `FidelityVerdict.stale: boolean` se set cuando el marker es modificado.
- Próximo run del fidelity pass evalúa solo `stale + new` markers.
- Resto del report permanece intacto.
- Cache key: `(sermonId, markerN, claimHash, chunkId)`.

### Q7 — Attribution footer scope

**TODOS los surfaces** que renderean el sermón publicado:

- PDF (`PdfExportService`)
- Docx (`exportSermonToDocx`)
- Web view publicada (`SermonPublishedView`)

Compliance CC BY/BY-SA es legalmente vinculante; no diferenciar por surface.

### Q8 — SBLGNT hardcoded constant

**Dejar como está** en `aggregateRequiredAttributions.ts:30-42` durante Fase 3.

- Memoria nueva `tech_debt_sblgnt_hardcoded` al cerrar PR 5.
- Mover al catálogo CORE Library se hace con la próxima ingesta confesional Fase 0 (post-Fase 3).
- Resolver discrepancia `CC BY 4.0` (docs) vs `CC BY-SA 4.0` (código) con el fundador antes de
  publicar PR 5 — el render es público.

### Q9 — PR ordering

**Secuencial estricto**: PR 1 → PR 2 → PR 3 → PR 4 → PR 5.

- NO priorizar PR 5 (attribution footer = compliance) antes de fidelity core, aunque sea
  compliance: el motor de fidelity es prerequisito conceptual del resto.
- Cada PR es unidad funcional testeable end-to-end en UI (`feedback_pr_complete_units`).

### Q10 — Sub-flag `fidelity_pass` default

**Default off** en PRs 1-4. **Flip a default on** tras smoke con 1-2 usuarios reales (post-PR 5).

- Requiere `pastoral_fidelity_flow` on (consistente con sub-flags de Fases 1.5/1.6/2/2.5).
- Allowlist server-side en `setUserFeatureFlags` (gotcha heredado de Fase 2).

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Sonnet 4.6 para TODOS los markers** | $0.10+/sermón × scale = cost prohibitivo. Flash batched + escalación selectiva da ~40% del costo con ~90% de la calidad. |
| **Flash-only sin escalación** | Verdicts `partial`/`contradicts` con razonamiento Flash → frustración pastor cuando la decisión es la importante. Costo extra de Sonnet vale la pena solo en los marginales. |
| **Claim semántico extraído por LLM (no oración completa)** | Doble LLM call por marker. Marginalmente más preciso pero ~2× costo. Phase doc original consideraba esto; rechazado por costo y simplicidad. |
| **Threshold único (cualquier `unrelated` → hard-block)** | Cero tolerancia es punitivo y entrega zero edge para revisión humana. 20% absorbe falsos positivos del evaluator. |
| **Override universal con justificación** (incluso para hard-block) | Erosionaría el gate. Hard-block es el único bloqueo de la fase; override solo en soft-block respeta P3 sin paralizar. |
| **Toggle expert-mode separado para fidelity** | Doble paternalismo. Pastor ganó modo experto en Fase 2.5 con SDS>80; no debe re-ganárselo aquí. |
| **Re-run full report cada vez** | $$ extra cada edit del editor. Marker-level invalidation es 90% más cheap. |
| **Attribution footer solo en PDF** | Compliance CC BY/BY-SA aplica a "distribuciones" — web view publicado cuenta. No-diferenciar simplifica auditoría legal. |
| **PR 5 first (compliance priority)** | Compliance es real pero el core (PR 1) habilita los otros 3 validators que también afectan publish (Plurality/Authority bloquean en soft). Sin PR 1, PR 5 es estético. |
| **Default `fidelity_pass: on` desde PR 1** | Smoke con 0 usuarios reales = riesgo de regresión silenciosa en sermones existentes. Off + flip post-smoke es coherente con sub-flag pattern de Fase 1.5/1.6/2/2.5. |

## Consecuencias

### Positivas

- Plan locked, cero TBDs entrando a PR 1.
- Costo LLM acotado y predecible (~$0.06/sermón).
- Override semantics coherente con manifiesto (P3 confronta) y ADR-027 (suaviza no silencia).
- Modo experto reusado → consistencia UX cross-fase, no doble paternalismo.
- Attribution footer en todos los surfaces → compliance defendible legalmente.
- Cache invalidation marker-level → editor responsive sin quemar tokens.

### Negativas

- Sonnet escalation introduce dos providers/configs en la misma callable; complejidad ligeramente
  mayor. Mitigación: el evaluator agrupa por verdict tier antes de escalar.
- 20% threshold puede ser too lax o too strict — admin toggle existe pero requiere calibración post-launch.
- SBLGNT hardcoded sigue siendo tech debt; documentado pero no resuelto en esta fase.
- Default off + flip post-smoke significa que PRs 1-4 son code-complete sin tráfico real → riesgo de
  bugs descubiertos en smoke. Mitigación: tests de integración + corpus piloto interno.

### Neutrales

- Sub-flag pattern (`fidelity_pass` bajo `pastoral_fidelity_flow`) es consistente con fases
  anteriores. Allowlist server-side: gotcha conocido, no novedad.
- Discrepancia CC BY vs BY-SA en SBLGNT existe en código vs docs; resolver antes de PR 5.

## Impacto

- **Código afectado**:
  - `packages/domain/src/entities/FidelityReport.ts` (new)
  - `packages/domain/src/services/computeFidelitySummary.ts` (new, pure thresholds)
  - `packages/domain/src/entities/Sermon.ts` (edit, add `fidelityReport?`)
  - `packages/application/src/use-cases/RunFidelityPassUseCase.ts` (new)
  - `packages/application/src/services/SermonService.ts` (edit, `publishSermon` gate)
  - `packages/infrastructure/src/gemini/fidelityEvaluatorPrompt.ts` (new)
  - `packages/functions/src/sermon/evaluateClaimSourceFidelity.ts` (new)
  - `packages/functions/src/sermon/publishSermonWithFidelity.ts` (new, PR 2)
  - `packages/web/src/features/sermon/editor/FidelityReviewPanel.tsx` + 5 row components (new)
  - `packages/web/src/features/sermon/publish/PrePublishFidelityModal.tsx` (new)
  - `packages/web/src/features/sermon/preview/SermonAttributionsSection.tsx` (new, PR 5)
  - `packages/infrastructure/src/export/PdfExportService.ts` (edit, PR 5)
  - `packages/web/src/lib/sermon/exportSermonToDocx.ts` (edit, PR 5)
  - `packages/infrastructure/src/gemini/prompts.ts` (edit, PR 4 — AUTHORITY SUBORDINATION clause)
  - `packages/domain/src/featureFlags.ts` (edit, add `fidelity_pass`)
  - `packages/functions/src/users/setUserFeatureFlags.ts` (edit, allowlist)
- **Fases impactadas**:
  - Fase 3 entera (esta fase)
  - Posible: Fase 4 (contra-scan) consume el `FidelityReport` y los thresholds como input
- **Migraciones requeridas**: ninguna (campo opcional aditivo en `Sermon` doc)
- **Reversibilidad**: alta — todo detrás de sub-flag `fidelity_pass`; rollback = flag off
- **Costo runtime estimado**: $0.06/sermón con la mezcla Flash+Sonnet del Q1

## Referencias

- Phase doc: [phase-3-claim-source-fidelity.md](../phases/phase-3-claim-source-fidelity.md)
- ADR base de citation engine rights-aware: [ADR-006](./ADR-006-rights-aware-citation-system.md)
- ADR override + modo experto reusado: [ADR-027](./ADR-027-override-and-expert-mode-policy.md)
- Manifesto P3 (confrontación obligatoria): [05-pedagogy-manifesto.md §7](../05-pedagogy-manifesto.md)
- Política de citas: [07-citation-policy.md](../07-citation-policy.md)
- Tres niveles de doctrina (Q4): [06-pedagogy-applied.md §4](../06-pedagogy-applied.md)
- Citation engine actual: PRs Phase B.1-B.5 + C.1 (commits `a174ac05`, `b15dfcf5`, `248c40d6`, `2b74237a`, `21ba44c9`)
- Memorias: `feature_pastoral_fidelity_roadmap`, `tech_debt_llm_provider_abstraction`
- Memoria nueva al cerrar PR 5: `tech_debt_sblgnt_hardcoded`
