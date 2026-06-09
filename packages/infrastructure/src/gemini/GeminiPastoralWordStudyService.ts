import {
    IPastoralWordStudyService,
    KeyWordCandidate,
    LexiconEntry,
    PastoralWordAnalysis,
    WordStudyLanguage,
} from '@dosfilos/domain';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { CuratedGlossLexiconAdapter } from '../lexicon/CuratedGlossLexiconAdapter';
import {
    IDENTIFY_KEY_WORDS_SYSTEM_PROMPT,
    PASTORAL_WORD_ANALYSIS_SYSTEM_PROMPT,
    buildIdentifyKeyWordsPrompt,
    buildPastoralWordAnalysisPrompt,
} from './pastoralWordStudyPrompts';

/**
 * Returns the lemma set covered by the curated lexicon v1. The actual
 * dataset lands in PR5 (`packages/infrastructure/src/data/lexicon-curated-v1.json`).
 * Until then this stub returns an empty set so the boost step is a no-op
 * and the LLM ranking flows through unchanged.
 *
 * Replace `() => new Set<string>()` with a JSON import + lemma index once
 * the curated dataset ships.
 */
export type CuratedLemmaIndex = () => Set<string>;

export interface GeminiPastoralWordStudyServiceOptions {
    /** Override curated boost weight. Default `+2` per ADR-018. */
    curatedBoost?: number;
    /** Plug curated lemma index. Default returns empty set. */
    curatedLemmaIndex?: CuratedLemmaIndex;
    /** Override Gemini model name. Default `gemini-2.5-flash` (Phase 0 pattern). */
    modelName?: string;
}

/**
 * Pastoral Fidelity Phase 1.5 — Gemini implementation of
 * `IPastoralWordStudyService`. Wraps `GoogleGenerativeAI` with two
 * focused methods (identify, analyze) plus the post-LLM curated boost.
 *
 * Stateless. Cache + persistence live one layer up (callable + Firestore
 * cache repo introduced in PR2).
 */
export class GeminiPastoralWordStudyService implements IPastoralWordStudyService {
    private readonly model: GenerativeModel;
    private readonly curatedBoost: number;
    private readonly getCuratedLemmaIndex: CuratedLemmaIndex;

    constructor(apiKey: string, options: GeminiPastoralWordStudyServiceOptions = {}) {
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({
            model: options.modelName ?? 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3,
            },
        });
        this.curatedBoost = options.curatedBoost ?? 2;
        // Default: load curated v1 dataset and infer the lemma set lazily
        // from the caller-provided language. ADR-018 boost.
        const defaultCurated = new CuratedGlossLexiconAdapter();
        this.getCuratedLemmaIndex = options.curatedLemmaIndex
            ?? (() => new Set<string>([
                ...defaultCurated.lemmaSet('greek'),
                ...defaultCurated.lemmaSet('hebrew'),
            ]));
    }

    async identifyKeyWords(args: {
        passage: string;
        language: WordStudyLanguage;
        originalText?: string;
        translationName?: string;
    }): Promise<KeyWordCandidate[]> {
        const result = await this.model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: buildIdentifyKeyWordsPrompt(args) }] },
            ],
            systemInstruction: IDENTIFY_KEY_WORDS_SYSTEM_PROMPT,
        });

        const rawText = result.response.text();
        const parsed = this.safeParseJson(rawText, 'identifyKeyWords');
        const candidates = this.extractCandidates(parsed);

        return this.applyCuratedBoost(candidates);
    }

    async analyzeWord(args: {
        word: string;
        lemma: string;
        verseRef: string;
        passage: string;
        language: WordStudyLanguage;
        lexicon: LexiconEntry;
        crossRefs: Array<{ reference: string; topic?: string; strength?: number }>;
    }): Promise<PastoralWordAnalysis> {
        const result = await this.model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: buildPastoralWordAnalysisPrompt({
                                ...args,
                                lexicon: {
                                    primaryGloss: args.lexicon.primaryGloss,
                                    semanticRange: args.lexicon.semanticRange,
                                    theologicalNote: args.lexicon.theologicalNote,
                                    source: args.lexicon.source,
                                },
                            }),
                        },
                    ],
                },
            ],
            systemInstruction: PASTORAL_WORD_ANALYSIS_SYSTEM_PROMPT,
        });

        const rawText = result.response.text();
        const parsed = this.safeParseJson(rawText, 'analyzeWord');

        return this.shapeAnalysis(parsed, args);
    }

    private applyCuratedBoost(candidates: KeyWordCandidate[]): KeyWordCandidate[] {
        const curated = this.getCuratedLemmaIndex();
        if (curated.size === 0) return candidates;

        return candidates.map((c) => {
            if (!curated.has(c.lemma)) return c;
            return {
                ...c,
                theologicalWeight: Math.min(10, c.theologicalWeight + this.curatedBoost),
                curatedBoostApplied: true,
            };
        });
    }

    private extractCandidates(parsed: unknown): KeyWordCandidate[] {
        if (parsed && typeof parsed === 'object' && 'candidates' in parsed) {
            const raw = (parsed as { candidates: unknown }).candidates;
            if (!Array.isArray(raw)) {
                throw new Error('La respuesta del modelo no contiene un array `candidates`.');
            }
            return raw.map((c, i) => this.shapeCandidate(c, i));
        }
        if (Array.isArray(parsed)) {
            return parsed.map((c, i) => this.shapeCandidate(c, i));
        }
        throw new Error('La respuesta del modelo no tiene la forma esperada para identifyKeyWords.');
    }

    private shapeCandidate(raw: unknown, index: number): KeyWordCandidate {
        if (!raw || typeof raw !== 'object') {
            throw new Error(`Candidato ${index} no es un objeto.`);
        }
        const r = raw as Record<string, unknown>;
        const gloss = typeof r.gloss === 'string' ? r.gloss.trim() : '';
        return {
            word: String(r.word ?? '').trim(),
            transliteration: String(r.transliteration ?? '').trim(),
            ...(gloss ? { gloss } : {}),
            lemma: String(r.lemma ?? '').trim(),
            verseRef: String(r.verseRef ?? '').trim(),
            theologicalWeight: this.clampWeight(Number(r.theologicalWeight)),
            rationale: String(r.rationale ?? '').trim(),
        };
    }

    private shapeAnalysis(
        parsed: unknown,
        args: {
            word: string;
            lemma: string;
            language: WordStudyLanguage;
            lexicon: LexiconEntry;
        },
    ): PastoralWordAnalysis {
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('La respuesta del modelo no es un objeto válido.');
        }
        const p = parsed as Record<string, unknown>;
        const word = (p.word ?? {}) as Record<string, unknown>;
        const gloss = (p.gloss ?? {}) as Record<string, unknown>;
        const resonancesRaw = Array.isArray(p.resonances) ? p.resonances : [];

        return {
            word: {
                original: String(word.original ?? args.word),
                transliteration: String(word.transliteration ?? args.lexicon.transliteration ?? ''),
                lemma: String(word.lemma ?? args.lemma),
            },
            gloss: {
                primary: String(gloss.primary ?? args.lexicon.primaryGloss ?? ''),
                semanticRange: Array.isArray(gloss.semanticRange)
                    ? (gloss.semanticRange as unknown[]).map((s) => String(s))
                    : args.lexicon.semanticRange,
            },
            grammaticalFunctionInVerse: String(p.grammaticalFunctionInVerse ?? ''),
            resonances: resonancesRaw.map((r) => {
                const o = (r ?? {}) as Record<string, unknown>;
                return {
                    reference: String(o.reference ?? ''),
                    howRelated: String(o.howRelated ?? ''),
                };
            }),
            theologicalWeight: String(p.theologicalWeight ?? ''),
            lexiconSource: args.lexicon.source,
            language: args.language,
        };
    }

    private clampWeight(value: number): number {
        if (!Number.isFinite(value)) return 5;
        return Math.max(0, Math.min(10, value));
    }

    private safeParseJson(text: string, context: string): unknown {
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const firstBrace = cleaned.search(/[{\[]/);
        const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error(`Respuesta del modelo en ${context} no contiene JSON detectable.`);
        }
        const slice = cleaned.substring(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(slice);
        } catch (err) {
            throw new Error(`Respuesta del modelo en ${context} es JSON inválido: ${(err as Error).message}`);
        }
    }
}
