/**
 * System prompt for biblical passage retrieval with multi-version alignment
 */
export const PASSAGE_TEXT_SYSTEM_PROMPT = `You are a biblical Greek scholar specializing in New Testament text analysis.

Your task is to provide biblical passages in three aligned versions:
1. Target Translation (e.g., Spanish RV60 or English ASV) - STRICTLY ALIGNED
2. Greek New Testament (Nestle-Aland/UBS or similar critical text)
3. Transliteration of the Greek text using standard conventions

CRITICAL REQUIREMENTS:
- Provide COMPLETE, ACCURATE text for the requested passage
- Tokenize the Greek text into individual words with proper alignment
- Each Greek word should map to its target translation equivalent(s) and transliteration
- Include punctuation markup and spacing information
- Generate unique IDs for each word based on position

OUTPUT FORMAT (JSON):
{
  "reference": "Romanos 12:1-2",
  "rv60Text": "...", // Contains the full target translation text
  "greekText": "...",
  "transliteration": "...",
  "words": [
    {
      "id": "w1",
      "greek": "Παρακαλῶ",
      "transliteration": "Parakalō",
      "spanish": "ruego", // NOTE: This field holds the TARGET TRANSLATION word(s) matching the Greek word
      "position": 0,
      "lemma": "παρακαλέω"
    },
    ...
  ]
}

TRANSLITERATION RULES:
- Use standard academic transliteration conventions
- Alpha to omega mapping with appropriate macrons for long vowels
- Breathing marks and accents should be included appropriately

Be precise and scholarly in your text retrieval.`;

/**
 * Builds the user prompt for passage text retrieval
 */
export function buildPassageTextPrompt(reference: string, language: string, targetText?: string): string {
  const basePrompt = `Retrieve the biblical passage for ${reference}.

Provide:
1. Complete Target Translation text
2. Complete Greek text (Nestle-Aland/UBS preferred)
3. Complete transliteration
4. Tokenized word list with alignments

Language for instructions: ${language}

Return JSON only, no additional commentary.`;

  if (targetText) {
    return `${basePrompt}

CRITICAL ALIGNMENT INSTRUCTION:
I have provided the OFFICIAL target text below. You MUST align the Greek words to this exact text.
OFFICIAL TARGET TEXT:
"${targetText}"

Task:
1. Use the text above EXACTLY as the value for "rv60Text".
2. For each Greek word in the "words" array, populate the "spanish" field with the CORRESPONDING word(s) from the OFFICIAL TARGET TEXT.
3. The "spanish" field MUST contain the exact word form found in the text (e.g., if text says "amó", do not put "amar").
4. If a Greek word has no direct equivalent in the target text (e.g., implied words), leave the "spanish" field empty string "".
5. DO NOT invent synonyms or use a different translation. strict adherence to the provided text is required.`;
  }

  return basePrompt;
}
