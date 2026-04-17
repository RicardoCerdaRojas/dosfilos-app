/**
 * Hebrew Prompt Builder
 *
 * Constructs the Gemini prompt for verse analysis by combining:
 *  1. System role and language instructions
 *  2. Selected Farfán grammar knowledge chunks
 *  3. The professor's pedagogical methodology (from 3_prompt-analisis-versiculos.md)
 *  4. The Hebrew verse text from morphhb
 *  5. Expected JSON output schema
 *
 * The morphhb data (OSHB codes) is provided as optional context for
 * cross-validation but is explicitly NOT presented as authoritative.
 */

import type { HebrewVerse } from '@dosfilos/domain';
import type { KnowledgeChunk } from '../knowledge/farfan-chunks.js';

// ── Expected output schema (as TypeScript comment for LLM) ───────────────────
const OUTPUT_SCHEMA = `
Return ONLY a valid JSON object with the following structure (no markdown, no extra text):

{
  "reference": "string — human-readable reference, e.g. 'Jonás 2:3'",
  "hebrewText": "string — full vocalized Hebrew text",
  "transliteration": "string — full academic transliteration of the verse",
  "literalTranslation": "string — word-for-word translation",
  "fluidTranslation": "string — natural, fluent Spanish translation",
  "words": [
    {
      "hebrewText": "string — vocalized Hebrew of this word",
      "transliteration": "string",
      "root": "string — trilateral root in Hebrew",
      "rootMeaning": "string — basic meaning of root, e.g. 'arrojar, lanzar'",
      "lemmaGloss": "string — lexical gloss in Spanish",
      "category": "VERB | NOUN | ADJECTIVE | PRONOUN | PERSONAL_PRONOUN | DEMONSTRATIVE_PRONOUN | RELATIVE_PRONOUN | PREPOSITION | CONJUNCTION | DEFINITE_ARTICLE | PARTICLE | ADVERB | INTERJECTION | PROPER_NOUN | OBJECT_MARKER | INTERROGATIVE | NEGATIVE_PARTICLE",
      "syntacticFunction": "string — syntactic role in the clause",
      "translation": "string — contextual translation of this word",
      "explanation": "string — detailed pedagogical explanation (morphology, recognition clues, typology, temporal/aspectual value)",
      "verbMorphology": {
        "binyan": "QAL | NIFAL | PIEL | PUAL | HITPAEL | HIFIL | HOFAL",
        "verbForm": "PERFECT | IMPERFECT | WAYYIQTOL | WEQATAL | IMPERATIVE | COHORTATIVE | JUSSIVE | INF_CONSTRUCT | INF_ABSOLUTE | PARTICIPLE_ACTIVE | PARTICIPLE_PASSIVE",
        "verbType": "STRONG | I_ALEF | I_NUN | I_YOD_WAW | II_WAW_YOD | III_HE | III_ALEF | GEMINATE | GUTURAL_R1 | GUTURAL_R2 | GUTURAL_R3",
        "person": 1 | 2 | 3 | null,
        "gender": "M | F | C | null",
        "number": "S | P | D | null",
        "temporalValue": "string — e.g. 'pasado narrativo secuencial'",
        "recognitionClues": ["string — e.g. 'וַיִּ preformativo del wayyiqtol 3ms'"]
      },
      "nominalMorphology": {
        "gender": "M | F | C | null",
        "number": "S | P | D | null",
        "state": "ABSOLUTE | CONSTRUCT | null"
      },
      "morphemes": [
        {
          "text": "string — Hebrew text of this segment",
          "role": "PREFIX_STEM | PREFORMATIVE | ROOT_R1 | ROOT_R2 | ROOT_R3 | THEME_VOWEL | DAGESH_FORTE | AFFORMATIVE | PRONOMINAL_SUFFIX | DEFINITE_ARTICLE | CONSTRUCT_ENDING | PLURAL_ENDING | DUAL_ENDING | FEMININE_ENDING | WAW_CONJUNCTIVE | WAW_CONSECUTIVE | PREPOSITION_PREFIX | CONJUNCTION_PREFIX",
          "label": "string — short tooltip label in Spanish"
        }
      ]
    }
  ],
  "verbTable": [
    {
      "hebrewForm": "string",
      "transliteration": "string",
      "root": "string",
      "rootTranslation": "string",
      "binyan": "QAL | NIFAL | PIEL | PUAL | HITPAEL | HIFIL | HOFAL",
      "verbForm": "PERFECT | IMPERFECT | WAYYIQTOL | ...",
      "verbType": "STRONG | I_NUN | ...",
      "temporalValue": "string",
      "pgn": "string — e.g. '3ms', '2fp'"
    }
  ],
  "exegeticalNotes": ["string — optional observations"]
}

CRITICAL RULES:
- Every key must be present. Use null for unknown optional fields.
- verbMorphology is REQUIRED for VERB words; nominalMorphology for all others.
- morphemes array must include ALL morpheme segments for visual color rendering.
- Do NOT include markdown, code fences, or any text outside the JSON object.
`;

// ── Knowledge context formatter ───────────────────────────────────────────────

function formatKnowledgeContext(chunks: readonly KnowledgeChunk[]): string {
  if (chunks.length === 0) return '';

  const sections = chunks.map((c) => c.content.trim()).join('\n\n---\n\n');
  return `
## GRAMÁTICA DE REFERENCIA (Farfán + Material del Profesor)

Estas reglas son tu AUTORIDAD MORFOLÓGICA. Aplícalas estrictamente.

${sections}
`;
}

// ── OSHB cross-reference context ──────────────────────────────────────────────

function formatOshbContext(verse: HebrewVerse): string {
  const hasOshb = verse.words.some((w) => w.oshbMorphCode && w.oshbMorphCode.length > 0);
  if (!hasOshb) return '';

  const rows = verse.words
    .map((w) => `  • "${w.text}" | OSHB: ${w.oshbMorphCode || '—'} | Lemma: ${w.lemma || '—'}`)
    .join('\n');

  return `
## REFERENCIA OSHB (solo para verificación, NO es autoridad morfológica)

Los siguientes códigos morfológicos son de la Open Scriptures Hebrew Bible.
Puedes usarlos como SEGUNDO CRITERIO de comparación, pero tu análisis debe
basarse SIEMPRE en las reglas gramaticales de Farfán y del profesor.
Si hay discrepancia, indica en la explicación por qué la gramática de Farfán
difiere del código OSHB.

${rows}
`;
}

// ── Main prompt builder ───────────────────────────────────────────────────────

/**
 * Builds the complete Gemini prompt for morphological verse analysis.
 *
 * @param verse - The Hebrew verse with text and OSHB tokens
 * @param knowledgeChunks - Relevant grammar chunks from the knowledge selector
 * @param language - Response language; currently only "es" is supported
 */
export function buildVerseAnalysisPrompt(
  verse: HebrewVerse,
  knowledgeChunks: readonly KnowledgeChunk[],
  language = 'es',
): string {
  const langInstruction =
    language === 'es'
      ? 'IMPORTANT: Respond entirely in Spanish. Use clear academic Spanish appropriate for a Chilean seminary student.'
      : `IMPORTANT: Respond in ${language}.`;

  const knowledgeContext = formatKnowledgeContext(knowledgeChunks);
  const oshbContext = formatOshbContext(verse);

  return `
You are an expert Biblical Hebrew tutor at seminary level, specialized in grammatical and exegetical analysis (BHS/BHQ text).

${langInstruction}

Your task is to perform a complete morphological and syntactic analysis of the Hebrew verse provided below.
You MUST analyze EVERY SINGLE WORD — including particles (אֶת, כִּי, וְ, הַ, etc.).
You MUST follow the pedagogical methodology of Farfán's Hebrew grammar and the professor's lessons.

${knowledgeContext}

${oshbContext}

## METODOLOGÍA PEDAGÓGICA (del profesor)

Para CADA palabra debes:
1. Identificar la RAÍZ antes que el BINYAN
2. Determinar el Binyan por sus elementos característicos (prefijos, dagesh forte, vocales características)
3. Explicar en detalle:
   - Prefijos (וַ, ה, י, ב, ל, מ, נ, etc.)
   - Sufijos (תָּ, וּ, נִי, etc.)
   - Dagesh (asimilación o duplicación)
   - Vocales características (jireq, jolem, qameṣ, etc.)
4. Si es verbo: siempre indicar si es FUERTE o DÉBIL, y el tipo de debilidad
5. Relacionar la forma morfológica con su valor temporal/aspectual en el contexto
6. Si hay ambigüedad, declararla explícitamente

REGLAS ABSOLUTAS:
- NUNCA omitir una palabra
- NUNCA asumir sin explicar
- Aplicar SOLO las reglas del hebreo bíblico (no hebreo moderno)
- Mantener terminología consistente (según Farfán)
- Dar claridad pedagógica, no solo etiquetas

## VERSO A ANALIZAR

Referencia: ${verse.displayReference}
Texto hebreo: ${verse.hebrewText}

## FORMATO DE RESPUESTA

${OUTPUT_SCHEMA}
`.trim();
}
