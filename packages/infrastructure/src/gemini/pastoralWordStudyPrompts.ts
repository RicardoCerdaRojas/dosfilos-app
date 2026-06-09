/**
 * Pastoral Fidelity Phase 1.5 — Gemini prompt builders for the Pastoral
 * Word Study module. These prompts are deliberately focused on PASTORAL
 * extraction (sermon prep) rather than language-learning. See ADRs
 * 016-021 for the design boundaries the prompts enforce.
 */

import type { WordStudyLanguage } from '@dosfilos/domain';

export interface IdentifyKeyWordsPromptArgs {
    passage: string;
    language: WordStudyLanguage;
    /** Original-language text of the passage when available (SBLGNT / MorphHB). */
    originalText?: string;
    /** Pastor's preferred translation context for verse references. Default RV1960. */
    translationName?: string;
}

export interface PastoralWordAnalysisPromptArgs {
    word: string;
    lemma: string;
    verseRef: string;
    passage: string;
    language: WordStudyLanguage;
    /** Lexicon entry context (curated v1 preferred, LSJ/BDB fallback). */
    lexicon: {
        primaryGloss: string;
        semanticRange: string[];
        theologicalNote?: string;
        source: string;
    };
    /** Pre-fetched cross-reference parallels (book/chapter/verse strings). */
    crossRefs: Array<{ reference: string; topic?: string; strength?: number }>;
}

export const IDENTIFY_KEY_WORDS_SYSTEM_PROMPT = `Eres un asistente exegético para pastores hispanohablantes que preparan sermones.

Tu único trabajo en este turno: identificar 5-8 palabras teológicamente cargadas del pasaje original, ordenadas por peso teológico para el sermón.

REGLAS DURAS:
- Devuelve SIEMPRE JSON válido — sin Markdown, sin prosa, sin code fences.
- Ignora artículos, preposiciones, conjunciones, partículas y verbos comunes (εἰμί, אמר) SALVO que carguen peso teológico explícito en este verso.
- Cada palabra debe aparecer literalmente en el pasaje original.
- "lemma" es la forma de diccionario (no la forma flexionada).
- "gloss": traducción literal BREVE (1-3 palabras) en español, para escaneo rápido. Ej. δικαιοσύνη → "justicia"; ἀγοράζω → "comprar, redimir".
- "theologicalWeight" 0-10: 10 = idea central del texto, 5 = sustantiva pero secundaria, 1-2 = relevante pero menor.
- "rationale" en una frase pastoral en español (no académico).

NO eres profesor de griego/hebreo. NO enseñes paradigmas. El pastor va a usar esta lista para profundizar palabra por palabra.
`;

export const PASTORAL_WORD_ANALYSIS_SYSTEM_PROMPT = `Eres un asistente exegético para pastores hispanohablantes que preparan sermones.

Tu trabajo en este turno: producir un análisis pastoral de UNA palabra del pasaje original. Recibirás contexto léxico curado y cross-references; integrarás todo en un análisis que el pastor pueda absorber rápido y usar para predicar.

REGLAS DURAS:
- Devuelve SIEMPRE JSON válido — sin Markdown, sin prosa, sin code fences.
- "grammaticalFunctionInVerse": describe la función gramatical EN ESTE verso (caso/tiempo/voz + qué hace en la oración). NO un paradigma genérico.
- "resonances": elige 2-3 de las cross-references provistas que se relacionen temáticamente con el lema. Genera un "howRelated" pastoral en español (1-2 frases) — NO copies texto del engine.
- "theologicalWeight": 2-3 frases sobre POR QUÉ esta palabra carga peso en este verso. Pastoral, no académico.
- "gloss.primary": prefiere la gloss curated cuando esté provista; de lo contrario destila el rango semántico.
- "gloss.semanticRange": 3-5 sentidos, ordenados por relevancia al verso.

NO enseñes griego/hebreo. NO expliques cómo memorizar la forma. El pastor está cerrando su estudio para predicar, no estudiando para un examen.
`;

export function buildIdentifyKeyWordsPrompt(args: IdentifyKeyWordsPromptArgs): string {
    const { passage, language, originalText, translationName = 'RV1960' } = args;
    const langLabel = language === 'greek' ? 'griego (NT)' : 'hebreo (AT)';
    const originalBlock = originalText
        ? `\nTexto original (${langLabel}):\n${originalText}\n`
        : '';

    return `Pasaje: ${passage}
Traducción de referencia del pastor: ${translationName}
Idioma original: ${langLabel}${originalBlock}

Identifica 5-8 palabras del pasaje original con peso teológico para el sermón.

Schema de salida JSON:
{
  "candidates": [
    {
      "word": "δικαιοσύνη",
      "transliteration": "dikaiosynē",
      "gloss": "justicia",
      "lemma": "δικαιοσύνη",
      "verseRef": "Romanos 8:4",
      "theologicalWeight": 9,
      "rationale": "Pablo enmarca todo el argumento del capítulo en torno a la justicia que el Espíritu produce."
    }
  ]
}

Solo el JSON. No expliques tu razonamiento fuera del campo "rationale".`;
}

export function buildPastoralWordAnalysisPrompt(args: PastoralWordAnalysisPromptArgs): string {
    const { word, lemma, verseRef, passage, language, lexicon, crossRefs } = args;
    const langLabel = language === 'greek' ? 'griego' : 'hebreo';
    const crossRefBlock = crossRefs.length === 0
        ? '(sin cross-references disponibles)'
        : crossRefs
            .map((p) => `- ${p.reference}${p.topic ? ` [tema: ${p.topic}]` : ''}${p.strength !== undefined ? ` (strength ${p.strength.toFixed(2)})` : ''}`)
            .join('\n');
    const theologicalNoteBlock = lexicon.theologicalNote
        ? `Nota teológica curada: ${lexicon.theologicalNote}\n`
        : '';

    return `Pasaje: ${passage}
Verso donde aparece la palabra: ${verseRef}
Palabra original (${langLabel}): ${word}
Lema: ${lemma}

Contexto léxico (source: ${lexicon.source}):
- Gloss primaria: ${lexicon.primaryGloss}
- Rango semántico: ${lexicon.semanticRange.join('; ')}
${theologicalNoteBlock}
Cross-references disponibles del engine:
${crossRefBlock}

Produce un análisis pastoral estructurado. Schema de salida JSON:
{
  "word": {
    "original": "${word}",
    "transliteration": "...",
    "lemma": "${lemma}"
  },
  "gloss": {
    "primary": "...",
    "semanticRange": ["...", "...", "..."]
  },
  "grammaticalFunctionInVerse": "...",
  "resonances": [
    { "reference": "Gálatas 5:1", "howRelated": "..." },
    { "reference": "Romanos 6:18", "howRelated": "..." }
  ],
  "theologicalWeight": "..."
}

Selecciona 2-3 resonancias DE LA LISTA PROVISTA (no inventes referencias). Solo el JSON.`;
}
