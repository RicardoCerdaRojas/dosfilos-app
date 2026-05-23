# Phase 3 — Pass de fidelidad claim↔source en borrador

## Estado

`planning` — placeholder. Detalle se completa al cierre de Fase 2.

## Objetivo

Implementar segundo-pass LLM que evalúa, para cada marcador `[N]` del borrador generado, si el chunk citado realmente respalda la oración a la izquierda del marcador. Surface al pastor los marcadores dudosos antes de publish. Gate de publish si >20% son `unrelated` o `contradicts`.

Cierra el gap más grande del motor de citas actual: validamos identidad, no fidelidad.

## Prerequisitos

- Fase 1 + Fase 2 completas (seed + tres testigos producen borradores fundamentados sobre seed válido)
- Motor de citas Fases B+C en producción (ya está, branch `feat/phase-c1-export-with-citations`)
- `citationManifest` persistido por sermón (ya implementado, PR #213)

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

- **2026-05-22** — Placeholder creado.
