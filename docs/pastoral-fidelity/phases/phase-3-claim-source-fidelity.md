# Phase 3 — Pass de fidelidad claim↔source en borrador

## Estado

`planning` — prereqs actualizados al cerrar Fase 2.5 (2026-05-29). Lista de dependencias
satisfechas + no satisfechas + preguntas emergentes + riesgos cross-fase abajo.

## Objetivo

Implementar segundo-pass LLM que evalúa, para cada marcador `[N]` del borrador generado, si el chunk citado realmente respalda la oración a la izquierda del marcador. Surface al pastor los marcadores dudosos antes de publish. Gate de publish si >20% son `unrelated` o `contradicts`.

Cierra el gap más grande del motor de citas actual: validamos identidad, no fidelidad.

## Prerequisitos

### Satisfechos (al cierre Fase 2.5, 2026-05-29)

| Prereq | De dónde viene | Estado |
|---|---|---|
| Fase 1 (six-step → 8-step spine canónico) | Fase 1.6 PR #265 (ADR-022) | ✅ |
| Fase 2 (tres testigos para validar semilla) | Fase 2 PR #262 (ADR-011) | ✅ |
| Fase 1.5 (Pastoral Word Study — usabilidad pastoral lexicon) | Fase 1.5 PR #258 | ✅ |
| Fase 2.5 (Study Depth Copilot — coverage model 1:1 con seed) | Fase 2.5 PRs #267–#285 (ADR-025/026/027/028) | ✅ |
| Motor de citas Fases B+C en producción | Pre-Pastoral Fidelity (branch `feat/phase-c1-export-with-citations`) | ✅ |
| `citationManifest` persistido por sermón | PR #213 | ✅ |
| `studyDepthSnapshot` embedded en `Sermon.ts` | Fase 2.5 PR #269 | ✅ — disponible como contexto para ajustar threshold de fidelity pass por cobertura del estudio que originó el borrador |
| `pastoralSeed.witnessReview` (respuestas del pastor a confrontaciones) | Fase 2 PR #262 + Fase 2.5 PR #269 | ✅ — signal de engagement con confrontación, útil para el authority check |
| `AiAssistLog` cobertura completa (8 pasos + `stepOrientation`) | Fase 1.6 PR #265 + Fase 2.5 PR #267 | ✅ — base para "% tuyo" del sermón generado |
| `ILlmClient` port + `GeminiLlmClient` adapter | Fase 2.5 PR #267 (Q7) | ✅ — **usar este port** para el fidelity evaluator callable nuevo, NO `GoogleGenerativeAI` directo |
| `WitnessOrchestrator` + cache pattern `witnessResults/` | Fase 2 + Fase 1.6 | ✅ — patrón de classifier batcheado reusable para fidelity pass per-marker |
| `confessionsCatalog` + multi-witness pattern | Fase 0 (ADR-010) | ✅ — base para `AuthorityReport` (detectar uso de credo como autoridad final) |

### No satisfechos (deuda heredada o intencional)

- **PD content trasfondo histórico** — Fase 1.6 dejó la infra RAG; contenido sigue sin ingestar
  por el fundador. **Fase 3 NO depende** de esto (fidelity pass evalúa claim vs chunk
  real cited; si el chunk es bíblico o de la biblioteca del pastor, no necesita PD). Documentado
  para visibilidad.
- **LLM provider abstraction** — `tech_debt_llm_provider_abstraction`. ~34 callers directos a
  Gemini SDK. **Fase 3 debe usar `ILlmClient`** (patrón de 2.5) para el fidelity evaluator, no
  importar `@google/generative-ai` directo. Si Fase 3 toca callables legacy, no rebrandeo
  obligatorio — eso es track separado.
- **Cache `orientStudy`/`buildStructuralPuzzle`** — propuesto para PR post-2.5 (subcolección por
  seed con clave estructural `hash(passage + stepKey + pastorInput + simplify)`). **Fase 3 debería
  shippear con cache análogo** desde el día 1 (fidelity pass per-marker es naturalmente cacheable:
  clave = `hash(claim + chunkContent + evaluatorPromptVersion)`).
- **Cleanup duplicación Bible parser** — `tech_debt_bible_parser_duplication`. **Fase 3 NO
  depende** salvo que toque referencias bíblicas dentro del fidelity evaluator; si las toca, leer
  la memoria + verificar receta `grep` post-build en BOTH `BibleContext-*.js` Y `index-*.js`.
- **Tier 3 v2 dependency-diagram puzzle** — propuesta abierta (PR #278) para Sprint 2. NO es
  prereq de Fase 3.

### Riesgos cross-fase

| Riesgo | Mitigación |
|---|---|
| Fidelity pass introduce nuevo callable LLM con Gemini directo en lugar de `ILlmClient` → cementa deuda | Code review: cualquier `import { GoogleGenerativeAI }` en `packages/functions/src/` nuevo es red flag. Usar `ILlmClient` mirror local pattern (ver `LlmClient.ts` + `GeminiLlmClient.ts`). |
| Fidelity pass per-marker sin cache → costo explota (N markers × M sermones × dinero) | Diseñar el cache desde el día 1, no agregarlo después. Patrón `witnessResults/` + key estructural. Ver § "Detalle TBD". |
| Pre-gen gate (2.5) + fidelity pass (3) confunden al pastor con dos confrontaciones secuenciales | Decisión de UX al iniciar fase: ¿el fidelity pass es parte del mismo gate de 2.5 (segundo bloque post-generar), o es un gate independiente pre-publish (tercero)? Ver § "Decisiones pendientes". |
| Fidelity pass marca como `unrelated` un claim que el `studyDepthSnapshot` muestra que el pastor SÍ cubrió en profundidad | Considerar el snapshot como input al prompt del evaluador (no como gate, como contexto). Pastor con cobertura `profundo` en D5 + claim marcado `unrelated` por el LLM = posible falso positivo del evaluador. |
| Cambios en `BibleService` para fidelity pass tocan parser → deben mirrorearse web↔infra | Leer `tech_debt_bible_parser_duplication` antes de cualquier cambio en `packages/{web,infrastructure}/.../bible/repositories/`. JSDoc warnings ya están en los archivos. |

### Preguntas nuevas que surgieron en Fase 2.5 (para decidir al iniciar Fase 3)

1. **¿Fidelity pass usa `studyDepthSnapshot` como input al prompt?** Pastor con cobertura
   `profundo` en una dim relacionada al claim merece mayor benefit-of-the-doubt; pastor con
   cobertura `iniciado` merece evaluación estricta.
2. **¿Pre-gen gate (2.5) y fidelity pass (3) son secuenciales o el fidelity pass es post-gen
   block?** El gate de 2.5 confronta antes de generar; el fidelity pass es naturalmente post-gen
   (necesita el sermón ya generado para evaluar markers). Probable orden: gate 2.5 → genera →
   fidelity pass → publish.
3. **¿El Tier 3 puzzle estructural produce artefacto consumible por el fidelity pass?** El puzzle
   genera `StructuralPuzzle` con clauses + canonical roles. Si Fase 3 quiere validar que un claim
   se apoya en la cláusula CORRECTA del pasaje, el puzzle podría exponer esa estructura como
   evidencia. Decisión de scope al iniciar.
4. **¿Tier 3 v2 (dependency-diagram) cambia esto?** Si v2 ship en Sprint 2 antes de empezar Fase
   3, el output (`StructuralDiagram` con esqueleto + roleLabel) es más rico — fidelity pass
   podría usar el `roleLabel` ("apositivo", "subordinada causal") para detectar claims que
   apoyan una cláusula subordinada como si fuera la principal.

## Decisiones tomadas

- [ADR-006](../decisions/ADR-006-rights-aware-citation-system.md) — citation engine rights-aware. Esta fase **extiende** el fidelity pass con:
  - **Validador de atribución required**: para cada chunk citado, verificar que su `requiredAttribution[]` esté presente en el render final
  - **No-proof-texting validator**: para claims `doctrinaSustantiva` con solo 1 cita bíblica → bloqueo blando "necesita testimonio plural"
  - **Authority subordination check**: detectar y flagear cuando el sermón cita una confesión/credo como autoridad final ("la WCF dice X, por tanto X") en vez de como resumen del texto bíblico

## Decisiones pendientes (TBD al iniciar fase)

- Modelo LLM para evaluación (Sonnet 4.6 vs Opus 4.7 — tradeoff costo/calidad)
- Granularidad de la oración a evaluar (oración completa antes del marcador vs. claim semántico)
- Threshold exacto del gate (¿20% es correcto? testear con corpus piloto)
- UX para revisar marcadores dudosos en el editor
- Re-run del fidelity pass después de re-citar (caching invalidation)

## Arquitectura propuesta (alto nivel)

```typescript
interface FidelityPass {
  run(sermon: Sermon, manifest: CitationManifest): Promise<FidelityReport>;
}

interface FidelityReport {
  verdicts: FidelityVerdict[];
  summary: {
    supports: number;
    partial: number;
    unrelated: number;
    contradicts: number;
    totalMarkers: number;
  };
  pluralityCheck: PluralityReport;       // NEW (ADR-006)
  attributionCheck: AttributionReport;   // NEW (ADR-006)
  authorityCheck: AuthorityReport;       // NEW (ADR-006)
  gateStatus: 'pass' | 'soft-block' | 'hard-block';
}

interface FidelityVerdict {
  marker: number;
  claim: string;                  // sentence_before(marker)
  citedSource: ChunkRef;
  verdict: 'supports' | 'partial' | 'unrelated' | 'contradicts';
  reasoning: string;
  confidence: number;
  evaluatedAt: timestamp;
}

// NEW — ADR-006 extensions

interface PluralityReport {
  // For claims tagged doctrinaSustantiva, verify >= 2 distinct biblical sources
  substantiveClaims: SubstantiveClaim[];
  failures: SubstantiveClaim[];   // claims with only 1 biblical source
}

interface AttributionReport {
  // For sources with requiredAttribution[], verify presence in artifact render
  requiredAttributions: AttributionEntry[];
  missingAttributions: AttributionEntry[];
}

interface AuthorityReport {
  // Detect claims that cite confession/creed as final authority instead of as summary
  authorityViolations: AuthorityViolation[];
}

interface AuthorityViolation {
  claim: string;
  citedSource: ChunkRef;  // confessional source
  reasoning: string;       // "Phrase 'por tanto X' positions WCF as ground; reformulate apelando al texto bíblico"
}
```

## Reuso identificado

- `citationManifest` (existente)
- `validateCitationManifest` server-side hook (existente, se extiende)
- Editor del sermón (UI surface para verdicts)

## Detalle TBD

- Prompt del fidelity evaluator
- Caching strategy
- Reporting dashboard
- Re-evaluation triggers

## Bitácora

- **2026-05-29 (prereqs actualizados al cerrar Fase 2.5)** — Fase 2.5 cerrada (19 PRs #267–#285,
  ADRs 025-028 accepted). Prereqs duros para Fase 3 ahora incluyen: `studyDepthSnapshot` en
  `Sermon.ts`, `AiAssistLog` cobertura completa (8 pasos), `ILlmClient` port + `GeminiLlmClient`
  adapter como base para callable nuevo, `WitnessOrchestrator` + cache pattern como referencia
  para fidelity pass per-marker batcheado. Deuda heredada explícita: PD content sin ingestar
  (Fase 3 no depende), LLM provider abstraction (Fase 3 debe usar `ILlmClient` sí o sí), cache
  pattern obligatorio desde día 1 para evitar explosión de costo per-marker, duplicación bible
  parser (cualquier cambio en `BibleService` mirrorearse web↔infra). 4 preguntas nuevas
  documentadas para responder al iniciar fase. Ver
  [sessions/2026-05-29-phase-2.5-closeout.md](../sessions/2026-05-29-phase-2.5-closeout.md).
- **2026-05-22** — Placeholder creado.
