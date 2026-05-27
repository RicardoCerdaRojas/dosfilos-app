# ADR-020 — Hebrew handling: mismo `PastoralWordStudyModal`, prompt branched por language

## Estado

`accepted`

## Fecha

2026-05-27

## Contexto

`MorphologyStep` actual (Phase 1) embed `GreekTutorOverlay` para griego y abre link-out a `/hebrew-tutor` para hebreo (líneas 88-94 de `MorphologyStep.tsx`). El hebreo queda como ciudadano de segunda clase en el flow Pastoral Fidelity actual.

Phase 1.5 reemplaza ambos por `PastoralWordStudyModal`. La arquitectura puede ser:

- **Un modal universal**: `<PastoralWordStudyModal language="greek|hebrew" />` con prompts branched + lexicon adapter branched + UI adaptada (typography, dirección de texto, transliteración).
- **Modales separados**: `<GreekPastoralWordStudyModal />` y `<HebrewPastoralWordStudyModal />` con código compartido vía hooks/utilities.
- **Componentes hermanos con shell común**: shell renderiza sub-componente por idioma.

## Decisión

Adoptamos **un solo `PastoralWordStudyModal`** con prop `language: 'greek' | 'hebrew'`. Internamente:

- **Prompt builder branched**: `buildPastoralWordAnalysisPrompt({ language, ... })` produce variantes específicas (e.g., hebrew prompt instruye sobre vocalización, raíces triliterales, parallelismo poético).
- **Lexicon adapter branched**: `CompositeLexicon.lookup(lemma, language)` delega a `BdbLexiconAdapter` cuando `language === 'hebrew'`, `LsjLexiconAdapter` cuando `greek`. Curated v1 sirve a ambos.
- **UI adaptaciones**:
  - Typography: griego `font-serif` continuo; hebreo `direction: rtl` para mostrar palabra original.
  - KeyWordsPicker rinde palabras hebreas RTL.
  - WordAnalysisPanel rinde transliteración en script latino siempre (forma original mantiene su dirección).
- **Cross-ref engine**: idéntico (ya soporta AT/NT vía `lookupCrossReferences`).
- **Persistencia**: `PastoralSeed.morphology.wordStudies[].language` ya existe (`'greek' | 'hebrew'`); modal lo stampa.

El modal recibe `passage` como prop y deriva `language` heurísticamente del libro (NT → greek, AT → hebrew). Si pericope es ambiguo (caso raro, e.g., AT citado en NT), el modal expone un toggle UI.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Modales separados** | Duplicación de shell (Dialog, header, footer, save flow, DiscoveryEditor). 2x mantenimiento sin beneficio claro. |
| **Componentes hermanos con shell común** | Sobrediseño. Si solo divergen prompt + lexicon + typography, no justifica composition pattern adicional. |
| **Solo griego en v1, hebreo en v1.5** | Fragmenta entrega. Hebrew users del flow Pastoral Fidelity quedarían con link-out indefinido. Manifesto cubre AT y NT equivalentes. |

## Consecuencias

### Positivas

- **Single source of truth de UX**: ajustes al modal (e.g., layout, save flow, hint copy) aplican a ambos idiomas sin sincronización.
- **Surface más simple para el pastor**: una sola UI que aprender; el toggle de idioma se infiere del libro.
- **Reuso de hooks**: `useIdentifyKeyWords`, `useAnalyzeWordPastorally` son idioma-agnósticos en su API; el adapter branched corre internamente.
- **Hebrew first-class**: paridad de experiencia con griego.

### Negativas

- **Prompt branched complica testing**: prompt builder requiere unit tests por idioma. Mitigación: snapshot tests por language path.
- **Lexicon dataset hebreo (BDB) ~10MB**: peso server-side. Mitigación: lazy load + lemma index.
- **Typography RTL en hebreo**: posible bug de overflow/alignment en `KeyWordsPicker` chips. Mitigación: CSS testing manual ambos idiomas antes de merge PR1.

### Neutrales

- Detección heurística de idioma por libro: hardcoded en helper `inferLanguageFromBook(book)`. Reusable cross-feature.

## Impacto

- **Código afectado**:
  - `packages/web/src/pages/sermons/generator/pastoralSeed/wordStudy/PastoralWordStudyModal.tsx` — único componente, prop `language`
  - `packages/infrastructure/src/gemini/pastoralWordStudyPrompts.ts` — branched builders
  - `packages/infrastructure/src/lexicon/CompositeLexicon.ts` — delega por language
  - Helper: `packages/domain/src/bible/inferLanguageFromBook.ts` (nuevo)
- **Fases impactadas**: Fase 1.5. Posible reuse en Fase 7 (exégesis reform aplica patrón).
- **Migraciones requeridas**: ninguna; `wordStudies[].language` field ya en schema.
- **Reversibilidad**: alta. Split a modales separados es refactor mecánico.

## Referencias

- Phase doc: `phases/phase-1-5-pastoral-word-study.md`
- ADR relacionado: ADR-016 (separación pastoral vs tutor), ADR-017 (lexicon source — BDB para hebreo)
