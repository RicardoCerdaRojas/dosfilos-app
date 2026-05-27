# ADR-018 — Key-word identification: híbrido LLM + boost de catálogo curado

## Estado

`accepted`

## Fecha

2026-05-27

## Contexto

Fase 1.5 expone al pastor 5-8 palabras teológicamente cargadas del pasaje para análisis. La fuente de esa lista puede ser:

- **LLM-extracted**: el modelo identifica candidatos del pasaje y los rankea por peso teológico. Pros: escala, cubre cualquier pericope, no requiere catálogo. Contras: puede sugerir palabras genéricas (artículos, conjunciones, verbos comunes) o pasar por alto palabras teológicamente cargadas pero menos frecuentes.
- **Catálogo curado pre-canonicalizado por pericope**: dataset que mapea pericope → palabras clave seleccionadas manualmente. Pros: calidad máxima en pericopes cubiertas. Contras: no escala (miles de pericopes posibles); cobertura desigual entre testamentos/libros.
- **Híbrido**: LLM extrae candidatos del pasaje; se aplica boost de ranking cuando el lema coincide con catálogo curado (gloss v1 de ADR-017 o catálogo pericope-specific futuro).

El manifesto exige **plurality** + **peso teológico claro** sobre frequency. Confiar puramente en LLM podría producir listas inconsistentes; confiar puramente en catálogo curado limita escala.

## Decisión

`IdentifyKeyWordsUseCase` opera en dos pasos:

1. **Extracción LLM**: prompt construye 5-8 candidatos con `theologicalWeight` inicial (0-10), `rationale`, `transliteration`, `lemma`, `verseRef`. Prompt explícito de ignorar conectores/artículos/verbos comunes salvo carga teológica del verso.
2. **Boost del catálogo curado** (post-LLM): si `candidate.lemma` ∈ `lexicon-curated-v1.json` (lemma index), `theologicalWeight += boost` (default `+2`, configurable). Re-sort por weight final.

El boost no remueve candidatos LLM-only; solo eleva los curated cuando coinciden. Si LLM omite una palabra que el catálogo considera high-weight para el pasaje (futuro: catálogo pericope-specific), una expansión v2 puede agregar candidatos catálogo-only forzados.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **LLM puro** | Inconsistencia entre runs. Tendencia a surface palabras frecuentes pero no teológicas. |
| **Catálogo curado puro pre-canonicalizado** | No escala. Cobertura desigual (Romanos sí, Hageo no). Bloqueante para Fase 1.5. |
| **Catálogo curado + LLM como fallback** | Igualmente bloqueante: pericopes sin curated viven sólo del fallback → calidad heterogénea pero invisible al pastor. Inverso del hybrid pero peor UX. |
| **Híbrido elegido** | Curated boost amplifica calidad cuando aplica; LLM cubre cola larga; el pastor ve lista coherente independiente del libro/pericope. |

## Consecuencias

### Positivas

- **Escalabilidad inmediata**: cualquier pasaje produce 5-8 candidatos sin curación previa por pericope.
- **Calidad creciente con curación**: cada entrada curada adicional eleva ranking de su lema en cualquier pasaje donde aparezca.
- **Telemetría guía expansión**: log de palabras LLM-extracted con weight alto pero no en curated → candidatos para curación v1.1.
- **Override pastor**: pastor puede seleccionar palabra fuera de la lista propuesta (futuro UI). MVP: lista de 5-8 es sugerida, no exclusiva.

### Negativas

- **Ranking sensible al prompt**: cambios al prompt LLM mueven el ranking. Mitigación: snapshot tests con corpus de pericopes representativas.
- **Boost mágico**: el valor `+2` es heurístico. Mitigación: configurable; ajustable basado en telemetría.
- **LLM hallucination**: posible que extraiga "lemma" que no aparece en el pasaje. Mitigación: validation post-LLM contra SBLGNT/MorphHB tokens del pasaje.

### Neutrales

- Catálogo pericope-specific (forzar candidatos catálogo-only) queda **diferido** a v2 con telemetría como evidencia.

## Impacto

- **Código afectado**:
  - `packages/application/src/use-cases/pastoral-word-study/IdentifyKeyWordsUseCase.ts` (nuevo)
  - `packages/infrastructure/src/gemini/pastoralWordStudyPrompts.ts` (`buildIdentifyKeyWordsPrompt`)
  - `packages/infrastructure/src/lexicon/CompositeLexicon.ts` (`hasCurated(lemma)` helper)
- **Fases impactadas**: Fase 1.5. Telemetría feed para curación v1.1 post-Phase 2.
- **Migraciones requeridas**: ninguna.
- **Reversibilidad**: alta. Apagar boost = retornar a LLM puro.

## Referencias

- Phase doc: `phases/phase-1-5-pastoral-word-study.md`
- ADR relacionado: ADR-017 (lexicon source — define curated dataset usado en boost)
- Manifesto: `05-pedagogy-manifesto.md` § "Privilegiar pasajes con peso teológico claro"
