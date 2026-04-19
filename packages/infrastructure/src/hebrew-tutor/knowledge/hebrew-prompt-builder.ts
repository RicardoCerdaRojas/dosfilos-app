/**
 * Hebrew Prompt Builder
 *
 * Constructs the Gemini prompt for verse analysis by combining:
 *  1. System role and language instructions
 *  2. Selected Farfán grammar knowledge chunks
 *  3. The professor's pedagogical methodology (from 3_prompt-analisis-versiculos.md)
 *  4. The Hebrew verse text from morphhb
 *  5. [NEW] Lexical glossary entries relevant to this verse (Level 2 RAG)
 *  6. Expected JSON output schema (includes lexicalNotes)
 *
 * The morphhb data (OSHB codes) is provided as optional context for
 * cross-validation but is explicitly NOT presented as authoritative.
 */

import type { HebrewVerse } from '@dosfilos/domain';
import type { LexicalEntry } from '@dosfilos/domain';
import type { KnowledgeChunk } from '../knowledge/farfan-chunks.js';

// ── Expected output schema (as TypeScript comment for LLM) ───────────────────
const OUTPUT_SCHEMA = `
Return ONLY a valid JSON object with the following structure (no markdown, no extra text):

{
  "reference": "string — human-readable reference, e.g. 'Jonás 2:3'",
  "hebrewText": "string — full vocalized Hebrew text",
  "transliteration": "string — full academic transliteration of the verse",
  "literalTranslation": "string — STRICT word-for-word translation. DO NOT apply idiomatic meaning here. Even if a phrase is an idiom, translate each word literally.",
  "fluidTranslation": "string — natural, fluent Spanish translation using IDIOMATIC equivalents where applicable. Use the lexical glossary when provided.",
  "words": [
    {
      "hebrewText": "string — vocalized Hebrew of this word",
      "transliteration": "string",
      "root": "string — trilateral root in Hebrew",
      "rootMeaning": "string — basic meaning of root, e.g. 'arrojar, lanzar'",
      "lemmaGloss": "string — lexical gloss in Spanish",
      "category": "VERB | NOUN | ADJECTIVE | PRONOUN | PERSONAL_PRONOUN | DEMONSTRATIVE_PRONOUN | RELATIVE_PRONOUN | PREPOSITION | CONJUNCTION | DEFINITE_ARTICLE | PARTICLE | ADVERB | INTERJECTION | PROPER_NOUN | OBJECT_MARKER | INTERROGATIVE | NEGATIVE_PARTICLE",
      "syntacticFunction": "string — syntactic role in the clause",
      "translation": "string — contextual translation of this word. IMPORTANT: Active and passive participles MUST have this translation field filled, functioning as the noun/adjective meaning in context.",
      "explanation": "string — detailed pedagogical explanation (morphology, recognition clues, typology, temporal/aspectual value). FORMATTED WITH MARKDOWN. Use bold text, bullet points, and short paragraphs to make it highly structured and readable.",
      "verbMorphology": {
        "binyan": "QAL | NIFAL | PIEL | PUAL | HITPAEL | HIFIL | HOFAL",
        "verbForm": "PERFECT | IMPERFECT | WAYYIQTOL | WEQATAL | IMPERATIVE | COHORTATIVE | JUSSIVE | INF_CONSTRUCT | INF_ABSOLUTE | PARTICIPLE_ACTIVE | PARTICIPLE_PASSIVE",
        "verbType": "STRONG | I_ALEF | I_NUN | I_YOD_WAW | II_WAW_YOD | III_HE | III_ALEF | GEMINATE | GUTURAL_R1 | GUTURAL_R2 | GUTURAL_R3",
        "person": 1 | 2 | 3 | null,
        "gender": "M | F | C | null",
        "number": "S | P | D | null",
        "temporalValue": "string — e.g. 'pasado narrativo secuencial'",
        "recognitionClues": ["string — Pistas visuales. OBLIGATORIO: Debe seguir el formato exacto 'Descripción gramatical + Letra(s) hebrea(s) + (transliteración)'. Ejemplo: 'Preformativo de participio Piel מְ (mə-)'. NO omitir ninguna de las 3 partes."]
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
          "label": "string — Etiqueta detallada. OBLIGATORIO: Debe tener la misma información exacta que recognitionClues (Descripción gramatical + Letra(s) + transliteración). Ejemplo: 'Preformativo de participio Piel מְ (mə-)'."
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
  "exegeticalNotes": ["string — optional observations"],
  "lexicalNotes": [
    {
      "hebrewPhrase": "string — the Hebrew phrase or word",
      "literalMeaning": "string — the word-for-word meaning (e.g. 'criatura viviente del campo')",
      "idiomaticMeaning": "string — the dynamic-equivalent meaning (e.g. 'animales salvajes')",
      "explanation": "string — academic explanation of why the meanings differ, at seminary level",
      "type": "idiom | semantic_range | cultural_note | false_friend | grammatical_note"
    }
  ]
}

CRITICAL RULES:
- Every key must be present. Use null for unknown optional fields.
- verbMorphology is REQUIRED for VERB words; nominalMorphology for all others.
- morphemes array must include ALL morpheme segments for visual color rendering.
- The concatenation of "text" for all "morphemes" MUST EXACTLY MATCH the original "hebrewText" of the word. DO NOT omit ANY vowel (nikkud) or cantillation mark (te'amim).
- Do NOT include markdown, code fences, or any text outside the JSON object.
- lexicalNotes MUST be an array. Return [] if no idiomatic observations exist.
- literalTranslation MUST remain literal even when a phrase is an idiom. Do not apply idiomatic meaning there.
- PASEQ (Unicode U+05C0, the vertical bar cantillation separator): When this character appears after a word in the source text, include it at the END of the "hebrewText" string for that word. Do NOT strip it. Example: if the source has the word for "he said" followed by a paseq, the hebrewText must end with that U+05C0 character.
- MAQAF (Unicode U+05BE, the Hebrew hyphen that joins words): Words connected by a maqaf MUST be split into separate word objects in the "words" array, one object per lexical unit. The maqaf character (U+05BE) MUST be appended to the end of the "hebrewText" of the FIRST word. The second word is a normal independent entry. This preserves lexical granularity while keeping the prosodic bond visible.
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

// ── Lexical glossary context (Level 2 RAG) ────────────────────────────────────

const LEXICAL_TYPE_LABELS: Record<LexicalEntry['type'], string> = {
  idiom:            'MODISMO',
  semantic_range:   'RANGO SEMÁNTICO',
  cultural_note:    'NOTA CULTURAL',
  false_friend:     'FALSO AMIGO',
  grammatical_note: 'NOTA GRAMATICAL',
};

/**
 * Formats a single lexical entry as a prompt-injectable bullet.
 */
function formatLexicalBullet(entry: LexicalEntry): string {
  const typeTag = LEXICAL_TYPE_LABELS[entry.type];
  const verseTag = entry.verseRefs?.length
    ? ` [${(entry.verseRefs as string[]).join(', ')}]`
    : '';
  return `• [${typeTag}]${verseTag} ${entry.hebrewPhrase}\n  Literal: "${entry.literalMeaning}"\n  Idiomático: "${entry.idiomaticMeaning}"\n  Explicación: ${entry.explanation}`;
}

/**
 * Formats the curated lexical entries as a block injected into the prompt.
 *
 * Entries are split into two groups:
 *  1. **Chain entries** (Leitwort threads) — grouped under a "HILO SEMÁNTICO"
 *     header that instructs the LLM to maintain cross-verse coherence.
 *  2. **Standalone entries** — individual lexical corrections.
 *
 * @param entries - Enabled lexical entries that matched this verse
 */
function formatLexicalContext(entries: readonly LexicalEntry[]): string {
  if (entries.length === 0) return '';

  // Partition: chain entries vs standalone
  const chainGroups = new Map<string, LexicalEntry[]>();
  const standalone: LexicalEntry[] = [];

  for (const entry of entries) {
    if (entry.chainId) {
      const group = chainGroups.get(entry.chainId) ?? [];
      group.push(entry);
      chainGroups.set(entry.chainId, group);
    } else {
      standalone.push(entry);
    }
  }

  const sections: string[] = [];

  // Format chain groups with discourse-level instructions
  for (const [chainId, chainEntries] of chainGroups) {
    const sorted = chainEntries.sort((a, b) => a.order - b.order);
    const bullets = sorted.map(formatLexicalBullet).join('\n\n');

    sections.push(`
### HILO SEMÁNTICO: "${chainId}" (cadena léxica / Leitwort)

Las siguientes entradas forman un HILO SEMÁNTICO que atraviesa múltiples versículos.
DEBES mantener COHERENCIA de traducción entre TODAS las entradas del hilo.
La decisión traductológica tomada en un versículo CONDICIONA las de los demás.

${bullets}
`);
  }

  // Format standalone entries
  if (standalone.length > 0) {
    const bullets = standalone.map(formatLexicalBullet).join('\n\n');
    sections.push(`
### ENTRADAS LÉXICAS INDIVIDUALES

${bullets}
`);
  }

  return `
## GLOSARIO LEXICOGRÁFICO (conocimiento curado por el profesor)

Las siguientes expresiones del versículo tienen significados idiomáticos o semánticos
que difieren de una traducción literal. DEBES:
1. Usar el significado idiomático en la "fluidTranslation".
2. MANTENER el significado literal en la "literalTranslation" (no lo cambies).
3. Reportar CADA entrada como un objeto en el array "lexicalNotes".

${sections.join('\n')}
`;
}

// ── Main prompt builder ───────────────────────────────────────────────────────

/**
 * Builds the complete Gemini prompt for morphological verse analysis.
 *
 * @param verse - The Hebrew verse with text and OSHB tokens
 * @param knowledgeChunks - Relevant grammar chunks from the knowledge selector
 * @param lexicalEntries - Curated lexical entries matching this verse (Level 2 RAG)
 * @param language - Response language; currently only "es" is supported
 */
export function buildVerseAnalysisPrompt(
  verse: HebrewVerse,
  knowledgeChunks: readonly KnowledgeChunk[],
  lexicalEntries: readonly LexicalEntry[] = [],
  language = 'es',
): string {
  const langInstruction =
    language === 'es'
      ? 'IMPORTANT: Respond entirely in Spanish. Use clear academic Spanish appropriate for a Chilean seminary student.'
      : `IMPORTANT: Respond in ${language}.`;

  const knowledgeContext = formatKnowledgeContext(knowledgeChunks);
  const oshbContext = formatOshbContext(verse);
  const lexicalContext = formatLexicalContext(lexicalEntries);

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

## INSTRUCCIONES DE TRADUCCIÓN IDIOMÁTICA

Para la "fluidTranslation":
- Identifica expresiones idiomáticas hebreas y tradúcelas por su equivalente dinámico
  en español. NO las traduzcas literalmente.
- Ejemplo: חַיַּת הַשָּׂדֶה → "animales salvajes" (no "animales del campo")
- Si detectas un modismo, rango semántico especial, nota cultural, o falso amigo:
  repórtalo en el array "lexicalNotes".

Para la "literalTranslation":
- SIEMPRE mantén una traducción palabra por palabra. NUNCA apliques equivalencia
  dinámica aquí. Incluso si una frase es un modismo, tradúcela literalmente.

## REGLA DE TRADUCCIÓN PARA FRASES PREPOSICIONALES BENEFACTIVAS

En hebreo bíblico, una preposición (לְ, בְּ, עַל, etc.) con sufijo pronominal
que sea CORREFERENCIAL con el sujeto del verbo forma una "frase preposicional
benefactiva": indica que la acción recae en beneficio del propio sujeto.

REGLA: Esta frase DEBE conservarse en AMBAS traducciones, literal y fluida.
NO puede omitirse ni absorberse implícitamente en un pronombre reflexivo ambiguo.

Ejemplos:
- וַיַּעֲשׂוּ לָהֶם חֲגֹרֹת (Gén 3:7)
  Sujeto: "ellos" (Adán y Eva) | לָהֶם = "para ellos" (correferencial)
  ❌ Fluida incorrecta: "se hicieron fajas" (el 'se' es ambiguo)
  ✅ Fluida correcta: "se fabricaron delantales para sí mismos"

- Patrón general: preposición + sufijo correferencial con el sujeto:
  לִי / לְךָ / לוֹ / לָהּ / לָנוּ / לָכֶם / לָהֶם
  → traducir como "para mí mismo / para ti mismo / para sí mismo" etc.

DISTINGUIR de:
- Frases preposicionales donde el sufijo NO es correferencial con el sujeto
  (e.g., "fabricaron para ellos [otros]") — en ese caso traducir normalmente.

## REGLA DE TRADUCCIÓN PARA WAYYIQTOL (Pasado narrativo secuencial)

El Wayyiqtol es la forma verbal narrativa por excelencia del hebreo bíblico.
Su valor temporal/aspectual es "pasado narrativo secuencial": indica una acción
completada que SIGUE a la acción anterior en la cadena narrativa.

DISTINCIÓN CLAVE: וַ (waw consecutiva) ≠ וְ (waw conjuntiva simple)
- Si el autor hebreo solo quisiera expresar "y + verbo", usaría la conjunción
  simple וְ (waw conjuntiva) + forma verbal.
- La elección del Wayyiqtol (וַ + imperfecto corto) es DELIBERADA para marcar
  secuencia narrativa. Por tanto, TODO Wayyiqtol debe reflejar esta secuencia.

REGLAS DE TRADUCCIÓN:
1. TODO Wayyiqtol debe traducirse con un conector que refleje secuencia
   narrativa: "entonces", "luego", "después", "a continuación".
   - Ejemplo: וַתֹּאמֶר → "Entonces dijo" (NO simplemente "Y dijo")
   - Ejemplo: וַתֵּרֶא...וַתִּקַּח...וַתֹּאכַל → "Entonces vio… luego tomó… después comió"
   - NO traducir como simples pasados con "y":
     ❌ "Y vio… y tomó… y comió" (pierde la progresión narrativa)
     ✅ "Entonces vio… luego tomó… después comió" (refleja la secuencia)
2. En la traducción individual de cada palabra (campo "translation"), incluir
   el conector secuencial apropiado (e.g. "entonces dijo", no solo "dijo").
3. Esta regla aplica tanto para la "fluidTranslation" como para la
   "literalTranslation", ya que el valor secuencial es parte inherente de
   la forma Wayyiqtol, no una interpretación idiomática.
4. En contraste, cuando encuentres un verbo con waw conjuntiva simple (וְ),
   tradúcelo simplemente con "y" sin conector secuencial.

REGLAS ABSOLUTAS:
- NUNCA omitir una palabra
- NUNCA asumir sin explicar
- Aplicar SOLO las reglas del hebreo bíblico (no hebreo moderno)
- Mantener terminología consistente (según Farfán)
- Dar claridad pedagógica, no solo etiquetas

${lexicalContext}

## VERSO A ANALIZAR

Referencia: ${verse.displayReference}
Texto hebreo: ${verse.hebrewText}

## FORMATO DE RESPUESTA

${OUTPUT_SCHEMA}
`.trim();
}
