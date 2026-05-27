import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import {
    CURATED_LEXICON_VERSION,
    lookupCuratedEntry,
} from './curatedLexicon';

/**
 * Pastoral Fidelity Phase 1.5 — callable that produces a pastoral
 * analysis for one word from the passage.
 *
 * Flow:
 *   1. Build deterministic cache key (language, lemma, passageHash, curatedVersion).
 *   2. Read `pastoralWordAnalyses/{id}`; on hit, return cached analysis.
 *   3. Resolve lexicon (curated first, sentinel fallback).
 *   4. Pull cross-refs from `bibleCrossReferences` (callable helper).
 *   5. Run Gemini Flash with the pastoral analysis prompt.
 *   6. Persist + return.
 *
 * Cache writes use admin Firestore so client rules can stay read-only.
 *
 * Cost: ~1 Flash call per miss; cached repeats are 1 read.
 */

type Language = 'greek' | 'hebrew';

interface CrossRef {
    reference: string;
    topic?: string;
    strength?: number;
}

interface AnalysisOutput {
    word: { original: string; transliteration: string; lemma: string };
    gloss: { primary: string; semanticRange: string[] };
    grammaticalFunctionInVerse: string;
    resonances: Array<{ reference: string; howRelated: string }>;
    theologicalWeight: string;
    lexiconSource: 'curated' | 'lsj' | 'bdb';
    language: Language;
}

const SYSTEM_PROMPT = `Eres un asistente exegético para pastores hispanohablantes que preparan sermones.

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

function buildPrompt(args: {
    word: string;
    lemma: string;
    verseRef: string;
    passage: string;
    language: Language;
    lexicon: {
        primaryGloss: string;
        semanticRange: string[];
        theologicalNote?: string;
        source: string;
    };
    crossRefs: CrossRef[];
}): string {
    const langLabel = args.language === 'greek' ? 'griego' : 'hebreo';
    const crossRefBlock = args.crossRefs.length === 0
        ? '(sin cross-references disponibles)'
        : args.crossRefs
            .map((p) => `- ${p.reference}${p.topic ? ` [tema: ${p.topic}]` : ''}${typeof p.strength === 'number' ? ` (strength ${p.strength.toFixed(2)})` : ''}`)
            .join('\n');
    const theologicalNoteBlock = args.lexicon.theologicalNote
        ? `Nota teológica curada: ${args.lexicon.theologicalNote}\n`
        : '';

    return `Pasaje: ${args.passage}
Verso donde aparece la palabra: ${args.verseRef}
Palabra original (${langLabel}): ${args.word}
Lema: ${args.lemma}

Contexto léxico (source: ${args.lexicon.source}):
- Gloss primaria: ${args.lexicon.primaryGloss || '(no provista — destila del rango)'}
- Rango semántico: ${args.lexicon.semanticRange.join('; ') || '(no provisto)'}
${theologicalNoteBlock}
Cross-references disponibles del engine:
${crossRefBlock}

Produce un análisis pastoral estructurado. Schema de salida JSON:
{
  "word": {
    "original": "${args.word}",
    "transliteration": "...",
    "lemma": "${args.lemma}"
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

function safeParseJson(text: string): unknown {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const firstBrace = cleaned.search(/[{\[]/);
    const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('Respuesta del modelo no contiene JSON detectable.');
    }
    return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
}

function buildCacheId(args: { language: Language; lemma: string; passageHash: string; curatedVersion: string }): string {
    return [args.language, args.lemma, args.passageHash, args.curatedVersion]
        .map((s) => s.replace(/__+/g, '_'))
        .join('__');
}

async function fetchCrossRefs(book: string, chapter: number, verse: number): Promise<CrossRef[]> {
    try {
        const db = admin.firestore();
        const ref = db.collection('bibleCrossReferences').doc(`${book.toUpperCase()}-${chapter}-${verse}`);
        const snap = await ref.get();
        if (!snap.exists) return [];
        const parallels = (snap.data()?.parallels ?? []) as Array<{
            book: string;
            chapter: number;
            verse: number;
            topic?: string;
            confidence?: number;
        }>;
        return parallels.map((p) => ({
            reference: `${p.book} ${p.chapter}:${p.verse}`,
            topic: p.topic,
            strength: typeof p.confidence === 'number' ? p.confidence : undefined,
        }));
    } catch (err) {
        console.warn('[analyzeWordPastorally] cross-ref lookup failed', err);
        return [];
    }
}

export const analyzeWordPastorally = onCall(
    { ...appCheckCallableOptions(), secrets: ['GEMINI_API_KEY'], timeoutSeconds: 90 },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY secret not configured');
        }

        const data = request.data ?? {};
        const word = String(data.word ?? '').trim();
        const lemma = String(data.lemma ?? '').trim();
        const verseRef = String(data.verseRef ?? '').trim();
        const passage = String(data.passage ?? '').trim();
        const passageHash = String(data.passageHash ?? '').trim();
        const language = String(data.language ?? '').toLowerCase() as Language;
        const transliteration = String(data.transliteration ?? '').trim();
        const verseBook = String(data.verseBook ?? '').trim();
        const verseChapter = Number(data.verseChapter);
        const verseNumber = Number(data.verseNumber);

        if (!word || !lemma || !verseRef || !passage || !passageHash) {
            throw new HttpsError('invalid-argument', 'word, lemma, verseRef, passage, passageHash are required');
        }
        if (language !== 'greek' && language !== 'hebrew') {
            throw new HttpsError('invalid-argument', 'language must be greek or hebrew');
        }

        const curatedVersion = CURATED_LEXICON_VERSION;
        const cacheId = buildCacheId({ language, lemma, passageHash, curatedVersion });
        const db = admin.firestore();
        const cacheRef = db.collection('pastoralWordAnalyses').doc(cacheId);

        // 1. Cache probe
        const cached = await cacheRef.get();
        if (cached.exists) {
            const data = cached.data();
            return { analysis: data?.analysis, cacheHit: true };
        }

        // 2. Lexicon lookup (curated first, sentinel fallback)
        const curatedHit = lookupCuratedEntry(lemma, language);
        const lexicon = curatedHit ?? {
            primaryGloss: '',
            semanticRange: [],
            theologicalNote: undefined,
            source: language === 'greek' ? 'lsj' : 'bdb',
            transliteration: transliteration || '',
        };

        // 3. Cross-refs (best effort)
        let crossRefs: CrossRef[] = [];
        if (verseBook && Number.isFinite(verseChapter) && Number.isFinite(verseNumber)) {
            crossRefs = await fetchCrossRefs(verseBook, verseChapter, verseNumber);
        }

        // 4. Gemini call
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        });

        let analysis: AnalysisOutput;
        try {
            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{
                        text: buildPrompt({
                            word, lemma, verseRef, passage, language,
                            lexicon: {
                                primaryGloss: lexicon.primaryGloss,
                                semanticRange: lexicon.semanticRange,
                                theologicalNote: lexicon.theologicalNote,
                                source: lexicon.source,
                            },
                            crossRefs,
                        }),
                    }],
                }],
                systemInstruction: SYSTEM_PROMPT,
            });
            const parsed = safeParseJson(result.response.text()) as Record<string, unknown>;
            const wordObj = (parsed.word ?? {}) as Record<string, unknown>;
            const glossObj = (parsed.gloss ?? {}) as Record<string, unknown>;
            const resonancesRaw = Array.isArray(parsed.resonances) ? parsed.resonances : [];

            analysis = {
                word: {
                    original: String(wordObj.original ?? word),
                    transliteration: String(wordObj.transliteration ?? lexicon.transliteration ?? transliteration ?? ''),
                    lemma: String(wordObj.lemma ?? lemma),
                },
                gloss: {
                    primary: String(glossObj.primary ?? lexicon.primaryGloss ?? ''),
                    semanticRange: Array.isArray(glossObj.semanticRange)
                        ? (glossObj.semanticRange as unknown[]).map((s) => String(s))
                        : lexicon.semanticRange,
                },
                grammaticalFunctionInVerse: String(parsed.grammaticalFunctionInVerse ?? ''),
                resonances: resonancesRaw.map((r) => {
                    const o = (r ?? {}) as Record<string, unknown>;
                    return {
                        reference: String(o.reference ?? ''),
                        howRelated: String(o.howRelated ?? ''),
                    };
                }).filter((r) => r.reference),
                theologicalWeight: String(parsed.theologicalWeight ?? ''),
                lexiconSource: (lexicon.source as 'curated' | 'lsj' | 'bdb'),
                language,
            };
        } catch (err) {
            console.error('[analyzeWordPastorally] gemini failed', err);
            throw new HttpsError('internal', err instanceof Error ? err.message : 'Analyze failed');
        }

        // 5. Persist cache (best-effort)
        try {
            await cacheRef.set({
                language,
                lemma,
                passageHash,
                curatedVersion,
                verseRef,
                analysis,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        } catch (err) {
            console.warn('[analyzeWordPastorally] cache save failed', err);
        }

        return { analysis, cacheHit: false };
    },
);
