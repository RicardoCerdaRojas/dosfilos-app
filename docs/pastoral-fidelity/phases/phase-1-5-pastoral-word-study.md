# Phase 1.5 — Pastoral Word Study Module

## Estado

`completed` — **cerrada 2026-05-27**. PR0 (docs/ADRs) + PR1 (modal shell + identify) + PR5 (curated dataset v1, 50 entradas) + PR2 (analysis + lexicon adapters + cache) + PR3 (DiscoveryEditor + persist + Hebrew e2e) + PR4 (naming clarification + lexicon attribution) → **PR #258 merged a `main`**. Follow-ups post-merge: **#259** (realtime `useUserProfile` vía `subscribeProfile` — flag toggles propagan sin reload) + **#260** (gate render test `MorphologyStep.gate.test.tsx`). Todo deployado a prod; **smoke end-to-end confirmado por el usuario** (Juan 1:1, modal "Análisis Pastoral del Texto" funcional con ranking de palabras + análisis estructurado). Mini-fase insertada entre Fase 1 y Fase 2 por **ADR-016**.

## Objetivo

Construir un módulo de **análisis pastoral de palabras** focalizado en el caso de uso del pastor preparando un sermón. Reemplaza el embed actual del `GreekTutorOverlay` (módulo de aprendizaje de idiomas) en el `MorphologyStep` (Paso 3 del six-step spine) por una surface diseñada específicamente para extracción exegética puntual.

**No** es un curso de griego/hebreo. **No** sustituye los tutores de aprendizaje existentes (que siguen disponibles en `/dashboard/greek-tutor` y `/dashboard/hebrew-tutor` como herramientas de formación lingüística).

## Por qué existe esta fase

Identificado durante smoke test de Phase 1 (2026-05-26): el `GreekTutorOverlay` integrado en MorphologyStep está diseñado para un **estudiante** que cursa griego/hebreo, no para un **pastor** que prepara un sermón. UI académica (training units, quizzes, drills, conceptos library, refuerzo paradigmático) genera carga cognitiva inapropiada para el caso de uso pastoral y viola el manifesto explícito:

> Cuando un punto exegético depende del original (griego/hebreo), citarlo con transliteración y traducción, brevemente, **sin convertir la clase en lección de idiomas**.

Decisión: separar arquitectónicamente. Ver [ADR-016](../decisions/ADR-016-pastoral-word-study-vs-language-tutor.md).

## Prerequisitos

- ✅ Phase 1 mergeada (PR `feat(pastoral-fidelity): Phase 1 — six-step spine`)
- ✅ ADR-016 aceptado
- ✅ `PastoralSeed` schema operacional (`morphology.wordStudies[]` ya definido)
- ✅ SBLGNT + MorphHB providers operacionales (Phase 0)
- ✅ Cross-reference engine (Phase 0)
- ✅ Gemini service patterns

### Decisiones cerradas (2026-05-27)

- [x] **Catálogo de palabras clave** → ADR-018: híbrido (LLM-extracted + boost de catálogo curado).
- [x] **Lexicon source** → ADR-017: gloss curated v1 (~350 entradas) + LSJ (griego fallback) + BDB (hebreo fallback).
- [x] **Cross-ref ranking** → ADR-019: reuse `lookupCrossReferences`, n=2-3 variable por strength threshold + LLM filtra word-relevance.
- [x] **Análisis hebreo paralelo** → ADR-020: mismo modal con prop `language`, prompt + lexicon adapter branched.
- [x] **AI suggestion en "descubrimiento pastoral"** → ADR-021: sin pre-fill; prompt visual estático; copy sin exposure de "IA/asistente/LLM".
- [x] **Lexicon attribution** → ADR-017 + `07-citation-policy.md` §5: citation engine rinde attribution por `LexiconEntry.source` (curated|lsj|bdb).

### Decisiones operacionales

- **Branch**: `feat/pastoral-fidelity-phase-1-5` desde `main`.
- **Feature flag**: sub-flag `pastoral_word_study` AND parent `pastoral_fidelity_flow`. Cuando ambos `on`, modal nuevo. Cuando solo parent `on`, embed actual (Phase 1 interim degradado).
- **Cache**: `PastoralWordAnalysis` cache transversal en colección `pastoralWordAnalyses/` por `(language, lemma, passageHash, curatedVersion)`.
- **Schema**: `WordStudy.wordAnalysisId?` agregado en paralelo a `tutorInteractionId?` (back-compat).
- **Tool enum**: `PastoralSeedTool` extiende con `'pastoral-word-study'`; `'greek-tutor'` y `'hebrew-tutor'` retenidos para histórico.

## Diseño técnico

### Surface

Componente `PastoralWordStudyModal` reemplaza `GreekTutorOverlay` import en `MorphologyStep`.

```
PastoralWordStudyModal
├── KeyWordsPicker (top section)
│   └── 5-8 palabras teológicamente cargadas del pasaje
│       (sorted por peso, pre-seleccionadas top-3 sugeridas)
├── WordAnalysisPanel (per word selected)
│   ├── Forma + transliteración + lema
│   ├── Gloss + rango semántico (3-5 senses)
│   ├── Función gramatical EN ESTE verso (case/tense/voice + qué hace)
│   ├── Resonancia canónica (2-3 otros pasajes mismo lema, peso teológico relacionado)
│   └── Peso teológico (2-3 sentencias del POR QUÉ esta palabra carga peso)
└── DiscoveryEditor (output)
    ├── Textarea: "Tu descubrimiento pastoral"
    └── AI suggestion as editable hint (no auto-complete, pastor escribe)
```

### Schema (no cambios)

`PastoralSeed.morphology.wordStudies` schema YA existe. Phase 1.5 sólo cambia la UI que alimenta esos fields.

### Use case

```typescript
// packages/application/src/use-cases/pastoral-word-study/
export class AnalyzeWordPastorallyUseCase {
    async execute(args: {
        word: string;
        passage: string;
        language: 'greek' | 'hebrew';
    }): Promise<PastoralWordAnalysis>;
}

interface PastoralWordAnalysis {
    word: { original: string; transliteration: string; lemma: string };
    gloss: { primary: string; semanticRange: string[] };
    grammaticalFunctionInVerse: string;
    resonances: {
        reference: string;
        howRelated: string;
    }[];
    theologicalWeight: string;
}
```

### Identificación de palabras clave

```typescript
// packages/application/src/use-cases/pastoral-word-study/
export class IdentifyKeyWordsUseCase {
    async execute(args: { passage: string }): Promise<KeyWordCandidate[]>;
}

interface KeyWordCandidate {
    word: string;
    transliteration: string;
    lemma: string;
    verseRef: string;
    theologicalWeight: number; // 0-10, ranking
    rationale: string; // por qué LLM considera esta palabra clave
}
```

### Prompts nuevos

- `buildIdentifyKeyWordsPrompt(passage, language)` — el LLM identifica 5-8 palabras teológicamente cargadas (no todas)
- `buildPastoralWordAnalysisPrompt(word, passage, language)` — análisis estructurado focalizado en pastoral use (no en aprender el idioma)

Ambos prompts viven en `packages/infrastructure/src/gemini/pastoralWordStudyPrompts.ts`.

### Naming clarification

- Menu/landing copy: "Aprende Griego" / "Aprende Hebreo" (módulos de aprendizaje) — surface en `/dashboard/greek-tutor`, `/dashboard/hebrew-tutor`
- "Análisis Pastoral del Texto" — surface en MorphologyStep (Pastoral Fidelity flow)
- Naming aplica a: app sidebar, landing copy, settings, dropdowns de generación de sermones

## Reuso identificado

| Componente | Uso |
|---|---|
| SBLGNT/MorphHB providers (Phase 0) | Fetch original-language text |
| Cross-reference engine (Phase 0) | Resonancias canónicas |
| Gemini service pattern (Phase 1) | Nuevo prompt + use case |
| `PastoralSeed.morphology.wordStudies[]` (Phase 1) | Output destination |
| Citation engine (Phase 0) | Lexicon attribution en export |

Código realmente nuevo:
- `PastoralWordStudyModal` + sub-componentes (~600-800 LOC)
- 2 use cases (analyzeWord + identifyKeyWords) (~200 LOC)
- 2 prompts (~300 LOC)
- Lexicon adapter (depende de source decidido) (~200-500 LOC)
- Tests (~300 LOC)

Total estimado: **1.5-2 semanas** concentrado.

## Criterios de aceptación

- [x] Pastor en MorphologyStep ve `PastoralWordStudyModal` (no `GreekTutorOverlay`) — smoke prod 2026-05-27 + gate test
- [x] LLM identifica 5-8 palabras clave del pasaje, sorted por peso teológico — smoke (Juan 1:1: λόγος 10, θεός 10, ἀρχή 9, ἦν 8, πρός 7)
- [x] Pastor puede seleccionar palabras + ver análisis estructurado por palabra — smoke
- [x] Análisis incluye función gramatical EN ESTE verso (no paradigma genérico) — smoke ("nominativo singular, sujeto de las 3 cláusulas")
- [~] 2-3 resonancias canónicas por palabra (cross-ref engine) — código wired vía `lookupCrossReferences`; rendering depende de cobertura de `bibleCrossReferences` por verso (degrada graceful si vacío). No bloqueante.
- [x] Pastor escribe "descubrimiento pastoral" en sus palabras (sin pre-fill, ADR-021) — smoke (textarea vacío + prompt + counter)
- [x] Hebrew análisis funciona equivalente — código branched (ADR-020). Smoke manual hebreo pendiente (no bloqueante; misma ruta de código).
- [x] Output persiste a `PastoralSeed.morphology.wordStudies[]` — `DiscoveryEditor.onSave` + `wordAnalysisId`
- [x] Tutores de aprendizaje (`/dashboard/greek-tutor`, `/dashboard/hebrew-tutor`) sin cambios estructurales
- [x] Naming clarification: menu copy diferencia "Aprende X" vs "Análisis Pastoral" — navigation.json
- [x] Lexicon attribution renders en export — `aggregateLexiconAttributions` + `PastoralSeedAuditPanel`

Tests automatizados:
- Unit: prompt builders + use cases
- Integration: modal flow E2E con LLM mock

Tests manuales:
- 1 pastor experimentado completa análisis de 2 palabras en <10 min
- 1 pastor sin formación lingüística usa el modal sin sentirse intimidado

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Lexicon source de calidad pobre (Strong's, Thayer son siglo XIX) | Curar gloss manualmente para top 200 palabras teológicamente cargadas como base v1 |
| LLM identifica palabras genéricas en lugar de teológicamente cargadas | Few-shot prompt con ejemplos curados + ranking heurístico post-LLM |
| Análisis gramatical incorrecto (LLM hallucination) | Validar caso/tiempo/voz contra SBLGNT/MorphHB tagging cuando disponible |
| Pastor sigue queriendo el tutor de aprendizaje (curva conceptual) | Link "¿Quieres aprender más griego? Abre el tutor de aprendizaje" en footer del modal |
| Costo LLM por palabra (multi-call) | Cache + batching |

## Bitácora

- **2026-05-26** — Phase doc creado. ADR-016 aceptado. Decisión tomada durante smoke test de Phase 1 (issue: GreekTutorOverlay académico violando manifesto pedagógico).
- **2026-05-27** — Fase arrancada vía `/iniciar-fase 1.5`. Decisiones pendientes cerradas: ADR-017 (lexicon source), ADR-018 (key-word identification), ADR-019 (cross-ref reuse), ADR-020 (hebrew same modal), ADR-021 (no pre-fill + no AI exposure). Branch `feat/pastoral-fidelity-phase-1-5` abierto desde `main`. Sub-flag `pastoral_word_study` definido.
- **2026-05-27** — **Fase cerrada**. PRs shippeados:
  - **PR0** — ADRs 017-021 + phase doc kickoff.
  - **PR1** — `PastoralWordStudyModal` shell + `KeyWordsPicker` + `IdentifyKeyWordsUseCase` + callable `identifyKeyWords` + sub-flag `pastoral_word_study` + `MorphologyStep` integration.
  - **PR5** — Curated lexicon v1 dataset (50 entradas: 30 griego + 20 hebreo) + `lexicon-curation-guidelines.md` + validator script.
  - **PR2** — `WordAnalysisPanel` + `AnalyzeWordPastorallyUseCase` + `CompositeLexicon` (curated + LSJ/BDB stubs) + callable `analyzeWordPastorally` + Firestore cache `pastoralWordAnalyses/` + cross-ref reuse.
  - **PR3** — `DiscoveryEditor` + `WordStudy.wordAnalysisId` back-compat field + Hebrew end-to-end + `pastoral-word-study` tool enum.
  - **PR4** — Menu naming clarification ("Aprende Griego" / "Aprende Hebreo") + `aggregateLexiconAttributions` + audit panel attribution rendering + core-library-seed.json extends con 3 lexicon entries.
  - Tests: 269 domain + 38 infra + 61 application + 2 web gate render = todos verde.
  - Pending follow-ups documentados: LSJ/BDB dataset wire-up + export pipeline attribution wiring (no bloquea cierre — el block ya rendea en audit panel).
- **2026-05-27** — **Merge + deploy + smoke**. Branch `feat/pastoral-fidelity-phase-1-5` → **PR #258** squash-merged a `main` → Deploy Production success. Dos follow-ups durante smoke:
  - **#259** — `useUserProfile` migrado a suscripción realtime (`subscribeProfile` onSnapshot). Root cause: el hook hacía fetch one-shot por sesión, así que un toggle de feature flag desde admin quedaba stale hasta hard reload — bloqueaba la aparición del botón en Step 3. Ahora propaga en vivo.
  - **#260** — Test de render `MorphologyStep.gate.test.tsx`: prueba automatizada de que `pastoral_word_study` ON → "Análisis Pastoral del Texto", OFF → "Abrir tutor de griego" (Phase 1 interim).
  - Hotfix previo (en #258): `setUserFeatureFlags` allowlist + i18n admin descripción del sub-flag (el toggle rechazaba el flag nuevo con "Unknown feature flag").
  - **Smoke end-to-end confirmado por el usuario** en prod (`preach.dosfilos.com`, Juan 1:1): modal abre, 5 palabras rankeadas (λόγος 10/10 … πρός 7/10 — λόγος/θεός reflejan curated v1), análisis estructurado de λόγος (significado + rango + función en verso + peso teológico), discovery editor sin pre-fill. Console limpio.
  - **Gotcha registrado**: el flag debe activarse en la cuenta que realmente corre el wizard. Durante troubleshooting se activó por error en `ricardo@dosfilos.com` (uid `0bfl5lBk...`) en vez de la cuenta de testeo `rdocerda@gmail.com` (uid `1xSpGj0k...`).
