import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GeminiLlmClient } from '../llm/GeminiLlmClient';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { MODEL_FAST } from '../llm/modelCatalog';

/**
 * Pastoral Fidelity Phase 1.5 — callable that identifies 5-8 theologically
 * loaded words from a passage.
 *
 * Mirrors the inline-Gemini pattern of `admin/confessions/tagDoctrineLevels.ts`
 * because the `functions/` package deliberately does not depend on
 * `@dosfilos/infrastructure` / `@dosfilos/application` (rootDir boundary).
 * The same prompt + parsing lives in `packages/infrastructure/src/gemini/`
 * for non-cloud-functions consumers; the two copies must be kept in sync.
 *
 * Input:  `{ passage: string; language: 'greek' | 'hebrew'; originalText?: string; translationName?: string }`
 * Output: `{ candidates: KeyWordCandidate[] }`
 *
 * Cost: ~1 Gemini Flash call per invocation, ~$0.0002 with JSON output.
 */

type Language = 'greek' | 'hebrew';

interface KeyWordCandidate {
    word: string;
    transliteration: string;
    gloss?: string;
    lemma: string;
    verseRef: string;
    theologicalWeight: number;
    rationale: string;
    curatedBoostApplied?: boolean;
}

const IDENTIFY_KEY_WORDS_SYSTEM_PROMPT = `Eres un asistente exegético para pastores hispanohablantes que preparan sermones.

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

function buildIdentifyKeyWordsPrompt(args: {
    passage: string;
    language: Language;
    originalText?: string;
    translationName?: string;
}): string {
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

function safeParseJson(text: string): unknown {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const firstBrace = cleaned.search(/[{\[]/);
    const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('Respuesta del modelo no contiene JSON detectable.');
    }
    const slice = cleaned.substring(firstBrace, lastBrace + 1);
    return JSON.parse(slice);
}

function shapeCandidate(raw: unknown, index: number): KeyWordCandidate {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`Candidato ${index} no es un objeto.`);
    }
    const r = raw as Record<string, unknown>;
    const weight = Number(r.theologicalWeight);
    const gloss = typeof r.gloss === 'string' ? r.gloss.trim() : '';
    return {
        word: String(r.word ?? '').trim(),
        transliteration: String(r.transliteration ?? '').trim(),
        ...(gloss ? { gloss } : {}),
        lemma: String(r.lemma ?? '').trim(),
        verseRef: String(r.verseRef ?? '').trim(),
        theologicalWeight: Number.isFinite(weight)
            ? Math.max(0, Math.min(10, weight))
            : 5,
        rationale: String(r.rationale ?? '').trim(),
    };
}

export const identifyKeyWords = onCall(
    { ...appCheckCallableOptions(), secrets: ['GEMINI_API_KEY'], timeoutSeconds: 60 },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY secret not configured');
        }

        const data = request.data ?? {};
        const passage = String(data.passage ?? '').trim();
        const language = String(data.language ?? '').toLowerCase() as Language;
        const originalText = typeof data.originalText === 'string' ? data.originalText : undefined;
        const translationName = typeof data.translationName === 'string' ? data.translationName : undefined;

        if (!passage) {
            throw new HttpsError('invalid-argument', 'passage is required');
        }
        if (language !== 'greek' && language !== 'hebrew') {
            throw new HttpsError('invalid-argument', 'language must be greek or hebrew');
        }

        // Vía el port: el adapter mide el consumo (tokens → USD) que antes se
        // perdía al llamar al SDK directo. Mismo modelo, misma config.
        const llm = new GeminiLlmClient(apiKey, MODEL_FAST, {
            feature: 'identifyKeyWords',
            userId: request.auth?.uid,
        });

        try {
            const raw = await llm.generate({
                system: IDENTIFY_KEY_WORDS_SYSTEM_PROMPT,
                prompt: buildIdentifyKeyWordsPrompt({
                    passage,
                    language,
                    originalText,
                    translationName,
                }),
                responseMimeType: 'application/json',
                temperature: 0.3,
            });

            const parsed = safeParseJson(raw);

            let rawCandidates: unknown[] = [];
            if (parsed && typeof parsed === 'object' && 'candidates' in parsed) {
                const c = (parsed as { candidates: unknown }).candidates;
                if (Array.isArray(c)) rawCandidates = c;
            } else if (Array.isArray(parsed)) {
                rawCandidates = parsed;
            }

            const candidates = rawCandidates
                .map((c, i) => shapeCandidate(c, i))
                .sort((a, b) => b.theologicalWeight - a.theologicalWeight);

            if (candidates.length < 3 || candidates.length > 10) {
                throw new HttpsError(
                    'internal',
                    `IdentifyKeyWords devolvió ${candidates.length} candidatos (esperamos 3-10).`,
                );
            }

            return { candidates };
        } catch (err) {
            if (err instanceof HttpsError) throw err;
            console.error('[identifyKeyWords] failed', err);
            throw new HttpsError(
                'internal',
                err instanceof Error ? err.message : 'Identify key words failed',
            );
        }
    },
);
