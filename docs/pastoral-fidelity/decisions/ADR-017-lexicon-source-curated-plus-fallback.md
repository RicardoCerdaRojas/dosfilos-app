# ADR-017 — Lexicon source: gloss curated v1 + LSJ (griego) + BDB (hebreo) fallback

## Estado

`accepted`

## Fecha

2026-05-27

## Contexto

Fase 1.5 (Pastoral Word Study) requiere una fuente léxica para análisis pastoral de palabras del pasaje. El `WordAnalysisPanel` rinde forma, transliteración, lema, gloss, rango semántico, función gramatical EN ESTE verso, resonancias canónicas y peso teológico.

BDAG (gold standard NT) está bajo copyright y no se puede ingerir legalmente. Las alternativas open-access tienen trade-offs significativos:

- **Strong's**: open, ubicuo, pero siglo XIX y atado a KJV; glosas teológicamente sesgadas en palabras complejas.
- **Thayer**: open, NT focus, pero siglo XIX y solo griego (no cubre AT).
- **LSJ** (Liddell-Scott-Jones): open, exhaustivo griego clásico (incluye Homero, Platón, papiros). Denso. Glosas pueden ser irrelevantes para uso pastoral NT. Solo griego.
- **BDB** (Brown-Driver-Briggs): open, gold standard PD para hebreo bíblico. Solo hebreo.
- **Gloss curated v1**: ~350 entradas (200 griego + 150 hebreo) redactadas internamente. Control de calidad. Trabajo upfront pero queda como activo del producto.

El manifesto pedagógico (`05-pedagogy-manifesto.md`) exige:

> Cuando un punto exegético depende del original (griego/hebreo), citarlo con transliteración y traducción, brevemente, **sin convertir la clase en lección de idiomas**.

Esto requiere glosas pastorales (no académicas) en las palabras teológicamente cargadas. Las top ~200 palabras NT y ~150 AT cubren el 80% del trabajo pastoral.

## Decisión

Adoptamos un **lookup compuesto** (`CompositeLexicon`):

1. **Primary — gloss curated v1**: `packages/infrastructure/src/data/lexicon-curated-v1.json`. Entradas redactadas internamente, alineadas con manifesto. Cubre top palabras teológicamente cargadas.
2. **Fallback griego — LSJ** (Perseus open dataset, dominio público). Para palabras griegas fuera del curated set.
3. **Fallback hebreo — BDB** (Brown-Driver-Briggs, dominio público). Para palabras hebreas fuera del curated set.

`AnalyzeWordPastorallyUseCase` invoca `CompositeLexicon.lookup(lemma, language)`, recibe `LexiconEntry` con `source: 'curated' | 'lsj' | 'bdb'` + attribution metadata. El LLM recibe la entrada léxica como context primario; la voz pastoral final emerge del análisis LLM + cross-references + el descubrimiento del pastor.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Solo Strong's** | Calidad pastoral baja. Sesgo KJV. Glosas datadas en palabras teológicas centrales. |
| **Solo Thayer** | NT-only (no resuelve AT). Siglo XIX. Inferior en palabras complejas vs gloss curado moderno. |
| **Solo LSJ + BDB** (sin curated) | Calidad léxica sólida pero densa/académica. LLM debe destilar todo para uso pastoral → más latencia + riesgo de gloss inappropriado para pastor en español. |
| **BDAG ingestion** | Copyright. Bloqueado legalmente. |
| **Gloss curated 1000+ entradas** | Scope creep. Cap v1 en ~350 mantiene shipping rate. Cola larga vive en LSJ/BDB. |

## Consecuencias

### Positivas

- **Calidad pastoral garantizada en palabras frecuentes**: las top palabras teológicas (δικαιοσύνη, ἀγάπη, λόγος, σάρξ, חֶסֶד, אֱמוּנָה, צֶדֶק…) tienen gloss redactada por nosotros con framing pastoral.
- **Cola larga cubierta**: cuando LLM identifica palabra fuera del curated set, LSJ/BDB suplen base léxica suficiente para análisis pastoral.
- **Atribución correcta por source**: cada `LexiconEntry` declara su `source` → citation engine puede rendir attribution distinta por origen.
- **Activo del producto**: el curated v1 es propiedad nuestra (licencia `Internally created`); diferenciador vs competidores que descansan en Strong's.
- **Telemetría de cobertura**: gap entre identificación LLM y cobertura curated guía expansión v1.1/v1.2 post-launch.

### Negativas

- **Trabajo upfront ~2-3 días** de curación para v1 (~350 entradas). Mitigación: dataset queda como activo permanente; expansión incremental.
- **Calidad heterogénea**: una entrada curated puede tener mejor framing que su contraparte LSJ/BDB. Lectores del análisis ven distinta densidad según source. Mitigación: prompt LLM smooth-out el output.
- **Mantenimiento de tres adapters**: `CuratedGlossLexiconAdapter`, `LsjLexiconAdapter`, `BdbLexiconAdapter`.
- **LSJ/BDB datasets tamaño**: ~10-20 MB cada uno raw. Server-side adapter (no cliente). Indexable por lemma.

### Neutrales

- Catálogo CORE Library (`core-library-seed.json`) debe agregar 3 entries: `curated-gloss-v1` (Internally created), `lsj-perseus` (Public Domain), `bdb-open` (Public Domain) con `citation` templates correctas.

## Impacto

- **Código afectado**:
  - `packages/domain/src/lexicon/LexiconEntry.ts` (nuevo)
  - `packages/infrastructure/src/lexicon/CuratedGlossLexiconAdapter.ts` (nuevo)
  - `packages/infrastructure/src/lexicon/LsjLexiconAdapter.ts` (nuevo)
  - `packages/infrastructure/src/lexicon/BdbLexiconAdapter.ts` (nuevo)
  - `packages/infrastructure/src/lexicon/CompositeLexicon.ts` (nuevo)
  - `packages/infrastructure/src/data/lexicon-curated-v1.json` (nuevo, ~350 entradas)
  - `docs/pastoral-fidelity/data/core-library-seed.json` (extend con 3 lexicon entries)
- **Fases impactadas**: Fase 1.5 (esta). Fase 3 (claim↔source fidelity) consumirá lexicon attribution. Fase 7 (exégesis reform) reusará composite lookup.
- **Migraciones requeridas**: ninguna; data nueva.
- **Reversibilidad**: alta. Swap source = swap adapter; sin reshape de datos pastor-generados.

## Referencias

- Phase doc: `phases/phase-1-5-pastoral-word-study.md`
- ADR relacionado: ADR-006 (rights-aware citation), ADR-016 (pastoral word study separation)
- Política: `07-citation-policy.md` §5 (required attribution)
- Manifesto: `05-pedagogy-manifesto.md` § "Sobre los pasajes y las disciplinas teológicas"
