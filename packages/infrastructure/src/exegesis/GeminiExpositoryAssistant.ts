import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    type BookPanorama,
    type ExegeticalUnit,
    type FidelityInput,
    type FidelityReview,
    type IExpositoryAssistant,
    type LiteraryGenre,
    type MacroInput,
    type MacroSection,
    type MicroInput,
    type PanoramaInput,
    type PassResult,
    type PreachableInput,
    type PreachableUnit,
} from '@dosfilos/domain';
import { withGeminiRetry } from './geminiRetry';
import {
    buildPanoramaSystemInstruction,
    buildPanoramaUserMessage,
    PANORAMA_RESPONSE_SCHEMA,
} from './expository-prompts/panorama';
import {
    djb2Hash,
    EXPOSITORY_PIPELINE_VERSION,
    fingerprintVerses,
} from './expository-prompts/shared';

/**
 * Gemini implementation of `IExpositoryAssistant` — the v1.5 5-pass
 * pipeline that walks a book through panorama → macroestructura →
 * microestructura → conversión predicable → evaluación de fidelidad.
 *
 * Pro 2.5 + thinking on every pass. Each pass uses structured output
 * (responseSchema) to guarantee shape; downstream passes consume the
 * prior pass output as TYPED DATA, not as freeform markdown the LLM
 * might paraphrase or drop.
 *
 * The class is wired pass-by-pass across commits B.1-B.5. B.1 lands
 * the scaffold + Pase 1 (panorama); B.2-B.5 fill in the remaining
 * passes. The unimplemented passes throw `NotImplementedError` until
 * their commit lands so the type system remains complete.
 */
export class GeminiExpositoryAssistant implements IExpositoryAssistant {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName || 'gemini-2.5-pro';
    }

    // ── Pase 1: Panorama ────────────────────────────────────────────────

    async runPanorama(input: PanoramaInput): Promise<PassResult<BookPanorama>> {
        const systemInstruction = buildPanoramaSystemInstruction(input.displayLanguage);
        const userMessage = buildPanoramaUserMessage(input);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            generationConfig: {
                // Pro 2.5 rejects thinkingBudget: 0; default budget is fine.
                maxOutputTokens: 4096,
                temperature: 0.4,
                topP: 0.9,
                responseMimeType: 'application/json',
                responseSchema: PANORAMA_RESPONSE_SCHEMA as any,
            },
        });

        console.log('[GeminiExpositoryAssistant] runPanorama', {
            book: input.book,
            language: input.displayLanguage,
            verseCount: input.verses.length,
            targetCount: input.targetPreachableCount ?? null,
        });

        const result = await withGeminiRetry(
            () => model.generateContent(userMessage),
            { contextLabel: 'GeminiExpositoryAssistant.runPanorama' },
        );
        const response = result.response;
        const raw = response.text();

        const parsed = parseJsonOrThrow(raw, 'panorama');
        const payload = normalizePanorama(parsed);

        return {
            payload,
            modelId: this.modelName,
            tokensUsed: extractTokens(response.usageMetadata),
            passVersion: this.passVersion('panorama', input),
        };
    }

    // ── Pase 2-5: stubs (filled in B.2-B.5) ─────────────────────────────

    async runMacroStructure(_input: MacroInput): Promise<PassResult<MacroSection[]>> {
        throw new Error('GeminiExpositoryAssistant.runMacroStructure not yet implemented (lands in B.2)');
    }

    async runMicroStructure(_input: MicroInput): Promise<PassResult<ExegeticalUnit[]>> {
        throw new Error('GeminiExpositoryAssistant.runMicroStructure not yet implemented (lands in B.3)');
    }

    async runPreachableConversion(_input: PreachableInput): Promise<PassResult<PreachableUnit[]>> {
        throw new Error('GeminiExpositoryAssistant.runPreachableConversion not yet implemented (lands in B.4)');
    }

    async runFidelityReview(_input: FidelityInput): Promise<PassResult<FidelityReview>> {
        throw new Error('GeminiExpositoryAssistant.runFidelityReview not yet implemented (lands in B.5)');
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    /**
     * Composes a stable per-pass version string. Combines pipeline
     * version, model id, pass id, and a hash of the pass-specific
     * input fingerprint. The application use case stitches all 5
     * pass versions together to produce the run-level signature
     * persisted on `series.metadata.expository.pericopeAssistantVersion`.
     */
    private passVersion(passId: string, input: { book: string; displayLanguage: 'es' | 'en'; verses: ReadonlyArray<{ chapter: number; verse: number; text: string }> }): string {
        const fingerprint = `${input.book}|${input.displayLanguage}|${fingerprintVerses(input.verses)}`;
        return `${this.modelName}@${EXPOSITORY_PIPELINE_VERSION}:${passId}#${djb2Hash(fingerprint).slice(0, 12)}`;
    }
}

// ── Module-scoped helpers (shared across passes) ────────────────────────

function parseJsonOrThrow(raw: string, passId: string): any {
    try {
        return JSON.parse(raw);
    } catch {
        throw new Error(
            `GeminiExpositoryAssistant.${passId} returned non-JSON output: ${raw.slice(0, 200)}`,
        );
    }
}

function extractTokens(usage: { totalTokenCount?: number; promptTokenCount?: number; candidatesTokenCount?: number } | undefined): number | null {
    if (!usage) return null;
    if (typeof usage.totalTokenCount === 'number') return usage.totalTokenCount;
    const summed = (usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0);
    return summed > 0 ? summed : null;
}

const VALID_GENRES: ReadonlyArray<LiteraryGenre> = [
    'epistle',
    'narrative',
    'poetry',
    'prophecy',
    'wisdom',
    'gospel',
    'apocalypse',
    'law',
    'mixed',
];

function normalizePanorama(raw: any): BookPanorama {
    if (!raw || typeof raw !== 'object') {
        throw new Error('Panorama response is not an object');
    }
    const genre = typeof raw.genre === 'string' && VALID_GENRES.includes(raw.genre as LiteraryGenre)
        ? (raw.genre as LiteraryGenre)
        : 'mixed';

    const purpose = stringOrThrow(raw.purpose, 'panorama.purpose');
    const pastoralProblem = stringOrThrow(raw.pastoralProblem, 'panorama.pastoralProblem');
    const centralTheme = stringOrThrow(raw.centralTheme, 'panorama.centralTheme');
    const movements = stringArrayOrEmpty(raw.movements);
    const keyTerms = stringArrayOrEmpty(raw.keyTerms);
    const redemptiveHistoryNote = typeof raw.redemptiveHistoryNote === 'string' && raw.redemptiveHistoryNote.trim()
        ? raw.redemptiveHistoryNote.trim()
        : undefined;

    if (movements.length === 0) {
        throw new Error('Panorama returned zero movements');
    }

    const result: BookPanorama = {
        genre,
        purpose,
        pastoralProblem,
        centralTheme,
        movements,
        keyTerms,
    };
    if (redemptiveHistoryNote) {
        result.redemptiveHistoryNote = redemptiveHistoryNote;
    }
    return result;
}

function stringOrThrow(value: unknown, label: string): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${label} missing or empty in panorama response`);
    }
    return value.trim();
}

function stringArrayOrEmpty(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .map((v) => v.trim());
}
