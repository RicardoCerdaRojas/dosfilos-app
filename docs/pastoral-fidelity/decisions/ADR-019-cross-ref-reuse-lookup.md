# ADR-019 — Cross-references: reuse `lookupCrossReferences` con n=2-3 variable por strength

## Estado

`accepted`

## Fecha

2026-05-27

## Contexto

`WordAnalysisPanel` (Fase 1.5) muestra 2-3 resonancias canónicas por palabra analizada. La pregunta es: ¿de dónde vienen?

Phase 0 ya entregó:

- `BibleCrossReferenceDoc` (`packages/domain/src/bible/cross-references/CrossReference.ts:47`) — schema verse→parallels.
- `lookupCrossReferences` callable (`packages/functions/src/admin/cross-references/lookupCrossReferences.ts:19`) — TSK-based engine entregado por ADR-008.
- `useCrossReferences` hook ya en uso por `RecognitionStep.tsx:16-39`.

`CrossReferenceLink` incluye `targetBook`, `type`, `strength` (ranking score). El engine actual rankea por strength.

Opciones para la integración Phase 1.5:

1. **Reusa `lookupCrossReferences` callable existente**: pedir cross-refs del passage rango; agrupar resonancias por palabra clave si posible.
2. **Construir nuevo engine word-specific**: indexar cross-refs por lemma + passage (no solo passage), surface paralelos donde mismo lemma aparece con peso teológico relacionado.
3. **Reuse + filtrado post-call**: usa el callable existente; filtra resonancias por relevancia heurística word-specific (LLM o regex sobre lema).

El cross-ref engine actual NO indexa por lemma — indexa por reference. Construir indexación por lemma sería trabajo significativo y duplicaría datasets.

## Decisión

`AnalyzeWordPastorallyUseCase` invoca `lookupCrossReferences` existente con el `passageRef` del verso donde aparece la palabra. Devuelve N parallels rankeados por strength.

Selección final de resonancias por palabra:

- **n = 2-3 variable por strength threshold**: tomar parallels con `strength >= 0.6` (umbral configurable, default razonable basado en distribución TSK), cap en 3, mínimo 2 cuando hay suficientes.
- **LLM filtra word-relevance**: el `buildPastoralWordAnalysisPrompt` recibe el set de cross-refs como context y elige 2-3 cuyo contenido se relaciona temáticamente con el lema. Output incluye `howRelated` (texto pastoral generado por LLM, no extraído del engine).

Esta combinación reusa la infraestructura existente y delega word-specific filtering al LLM (que ya tiene context del passage + palabra + lexicon entry).

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Nuevo engine word-specific por lemma** | Trabajo significativo (~1-2 semanas extra). Duplica dataset. Beneficio incremental incierto sin validación. Diferible si telemetría muestra resonancias pobres. |
| **N fijo (siempre 3)** | Cuando hay 1-2 parallels strong y resto weak, forzar 3 incluye basura. Variable evita este caso. |
| **Cross-refs verbatim sin filtro LLM** | El engine actual no filtra por relevance al lema específico. Sin filtro, resonancias pueden ser temáticamente irrelevantes para la palabra estudiada. |

## Consecuencias

### Positivas

- **Reuso máximo**: ~0 código de cross-ref engine nuevo. Solo wiring + threshold.
- **Filtrado contextual LLM**: el modelo ve passage + palabra + lexicon entry + cross-refs y selecciona resonancias coherentes con el peso teológico del lema en el verso.
- **Generación de `howRelated` pastoral**: el LLM redacta una nota pastoral explicando por qué la resonancia importa, no extracto académico.
- **Threshold ajustable**: si telemetría muestra que pastores ignoran resonancias, subir threshold.

### Negativas

- **Dependencia indirecta del LLM**: si LLM filter falla (selecciona irrelevantes), pastor ve resonancias pobres. Mitigación: prompt few-shot con ejemplos de buena selección.
- **No indexa por lemma**: pastor estudiando δικαιοσύνη en Rom 8:4 ve cross-refs de Rom 8:4 (verse-level), no cross-refs donde δικαιοσύνη aparece en otros contextos canónicos con peso teológico relacionado. Limitación aceptada para v1.
- **Costo LLM mayor**: el prompt incluye lista de cross-refs adicional. Mitigación: cache transversal (ADR no escrito pero ya decidido), batching.

### Neutrales

- Indexación por lemma queda como mejora futura. Telemetría dirá si vale la pena.

## Impacto

- **Código afectado**:
  - `packages/application/src/use-cases/pastoral-word-study/AnalyzeWordPastorallyUseCase.ts` — invoca callable
  - `packages/infrastructure/src/gemini/pastoralWordStudyPrompts.ts` — prompt incluye cross-refs context
- **Fases impactadas**: Fase 1.5. Sin cambios al cross-ref engine de Phase 0.
- **Migraciones requeridas**: ninguna.
- **Reversibilidad**: alta. Si decisión se revierte, swap por engine nuevo word-specific.

## Referencias

- Phase doc: `phases/phase-1-5-pastoral-word-study.md`
- ADR relacionado: ADR-008 (cross-ref TSK-based engine — fuente reusada)
- Hook existente: `useCrossReferences` (`packages/web/src/hooks/useCrossReferences.ts`)
