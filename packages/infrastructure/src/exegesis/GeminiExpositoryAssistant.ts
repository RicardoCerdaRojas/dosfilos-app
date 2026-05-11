import {
    GoogleGenerativeAI,
    HarmBlockThreshold,
    HarmCategory,
    type SafetySetting,
} from '@google/generative-ai';
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
    type SuperMacroInput,
    type SuperMacroSection,
} from '@dosfilos/domain';
import { withGeminiRetry } from './geminiRetry';
import {
    buildPanoramaSystemInstruction,
    buildPanoramaUserMessage,
    PANORAMA_RESPONSE_SCHEMA,
} from './expository-prompts/panorama';
import {
    buildMacroSystemInstruction,
    buildMacroUserMessage,
    MACRO_RESPONSE_SCHEMA,
} from './expository-prompts/macroStructure';
import {
    buildSuperMacroSystemInstruction,
    buildSuperMacroUserMessage,
    SUPER_MACRO_RESPONSE_SCHEMA,
} from './expository-prompts/superMacroStructure';
import {
    buildMicroSystemInstruction,
    buildMicroUserMessage,
    MICRO_RESPONSE_SCHEMA,
} from './expository-prompts/microStructure';
import {
    buildPreachableSystemInstruction,
    buildPreachableUserMessage,
    PREACHABLE_RESPONSE_SCHEMA,
} from './expository-prompts/preachableConversion';
import {
    buildFidelitySystemInstruction,
    buildFidelityUserMessage,
    FIDELITY_RESPONSE_SCHEMA,
} from './expository-prompts/fidelityReview';

const VALID_FIDELITY_SEVERITIES = ['info', 'warning', 'critical'] as const;
type ValidFidelitySeverity = typeof VALID_FIDELITY_SEVERITIES[number];

const VALID_SPECIAL_CASES = [
    'salutation',
    'doxology',
    'long-prayer',
    'virtue-list',
    'narrative-scene',
    'ot-citation',
    'genealogy',
    'law-code',
    'parable',
    'oracle',
] as const;
type ValidSpecialCase = typeof VALID_SPECIAL_CASES[number];
import {
    djb2Hash,
    EXPOSITORY_PIPELINE_VERSION,
    fingerprintVerses,
} from './expository-prompts/shared';

const VALID_MACRO_FUNCTIONS = [
    'introduction',
    'thesis',
    'argument-development',
    'narrative-arc',
    'climax',
    'application',
    'closing',
    'transition',
    'digression',
] as const;
type ValidMacroFunction = typeof VALID_MACRO_FUNCTIONS[number];

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
            safetySettings: EXPOSITORY_SAFETY_SETTINGS as SafetySetting[],
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
        const raw = readResponseTextOrThrow(response, 'panorama');

        const parsed = parseJsonOrThrow(raw, 'panorama');
        const payload = normalizePanorama(parsed);

        return {
            payload,
            modelId: this.modelName,
            tokensUsed: extractTokens(response.usageMetadata),
            passVersion: this.passVersion('panorama', input),
        };
    }

    // ── Pase 2: Macroestructura ─────────────────────────────────────────

    async runSuperMacroStructure(input: SuperMacroInput): Promise<PassResult<SuperMacroSection[]>> {
        const systemInstruction = buildSuperMacroSystemInstruction(input.displayLanguage);
        const userMessage = buildSuperMacroUserMessage(input);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            safetySettings: EXPOSITORY_SAFETY_SETTINGS as SafetySetting[],
            generationConfig: {
                maxOutputTokens: 4096,
                temperature: 0.3,
                topP: 0.9,
                responseMimeType: 'application/json',
                responseSchema: SUPER_MACRO_RESPONSE_SCHEMA as any,
            },
        });

        console.log('[GeminiExpositoryAssistant] runSuperMacroStructure', {
            book: input.book,
            language: input.displayLanguage,
            verseCount: input.verses.length,
            panoramaGenre: input.panorama.genre,
        });

        const result = await withGeminiRetry(
            () => model.generateContent(userMessage),
            { contextLabel: 'GeminiExpositoryAssistant.runSuperMacroStructure' },
        );
        const response = result.response;
        const raw = readResponseTextOrThrow(response, 'superMacroStructure');

        const parsed = parseJsonOrThrow(raw, 'superMacroStructure');
        const payload = normalizeSuperMacroSections(parsed);

        return {
            payload,
            modelId: this.modelName,
            tokensUsed: extractTokens(response.usageMetadata),
            passVersion: this.passVersion('super-macro', input),
        };
    }

    async runMacroStructure(input: MacroInput): Promise<PassResult<MacroSection[]>> {
        const systemInstruction = buildMacroSystemInstruction(input.displayLanguage);
        const userMessage = buildMacroUserMessage(input);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            safetySettings: EXPOSITORY_SAFETY_SETTINGS as SafetySetting[],
            generationConfig: {
                // Bumped from 4096 → 8192 to match micro/fidelity. The
                // 4096 ceiling was tight for books with many macro
                // sections + verbose justification fields, occasionally
                // truncating the JSON mid-stream and surfacing as a
                // "non-JSON output" parse error.
                maxOutputTokens: 8192,
                temperature: 0.3,
                topP: 0.9,
                responseMimeType: 'application/json',
                responseSchema: MACRO_RESPONSE_SCHEMA as any,
            },
        });

        console.log('[GeminiExpositoryAssistant] runMacroStructure', {
            book: input.book,
            language: input.displayLanguage,
            verseCount: input.verses.length,
            panoramaGenre: input.panorama.genre,
        });

        const result = await withGeminiRetry(
            () => model.generateContent(userMessage),
            { contextLabel: 'GeminiExpositoryAssistant.runMacroStructure' },
        );
        const response = result.response;
        const raw = readResponseTextOrThrow(response, 'macroStructure');

        const parsed = parseJsonOrThrow(raw, 'macroStructure');
        const payload = normalizeMacroSections(parsed);

        return {
            payload,
            modelId: this.modelName,
            tokensUsed: extractTokens(response.usageMetadata),
            passVersion: this.passVersion('macro', input),
        };
    }

    // ── Pase 3: Microestructura (genre-aware) ───────────────────────────

    async runMicroStructure(input: MicroInput): Promise<PassResult<ExegeticalUnit[]>> {
        const systemInstruction = buildMicroSystemInstruction(input.panorama.genre, input.displayLanguage);
        const userMessage = buildMicroUserMessage(input);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            safetySettings: EXPOSITORY_SAFETY_SETTINGS as SafetySetting[],
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.3,
                topP: 0.9,
                responseMimeType: 'application/json',
                responseSchema: MICRO_RESPONSE_SCHEMA as any,
            },
        });

        console.log('[GeminiExpositoryAssistant] runMicroStructure', {
            book: input.book,
            language: input.displayLanguage,
            genre: input.panorama.genre,
            macroCount: input.macroSections.length,
            verseCount: input.verses.length,
        });

        const result = await withGeminiRetry(
            () => model.generateContent(userMessage),
            { contextLabel: 'GeminiExpositoryAssistant.runMicroStructure' },
        );
        const response = result.response;
        const raw = readResponseTextOrThrow(response, 'microStructure');

        const parsed = parseJsonOrThrow(raw, 'microStructure');
        const validMacroIds = new Set(input.macroSections.map((m) => m.id));
        const payload = normalizeExegeticalUnits(parsed, validMacroIds, input.book, input.panorama.genre);

        return {
            payload,
            modelId: this.modelName,
            tokensUsed: extractTokens(response.usageMetadata),
            passVersion: this.passVersion('micro', input),
        };
    }

    // ── Pase 4: Conversión predicable ───────────────────────────────────

    async runPreachableConversion(input: PreachableInput): Promise<PassResult<PreachableUnit[]>> {
        const systemInstruction = buildPreachableSystemInstruction(input.displayLanguage);
        const userMessage = buildPreachableUserMessage(input);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            safetySettings: EXPOSITORY_SAFETY_SETTINGS as SafetySetting[],
            generationConfig: {
                // Larger budget — propositions are 2-3 sentences each
                // and we may emit 8-20 preachable units.
                maxOutputTokens: 16384,
                // Slightly higher temperature: this pass involves
                // homiletical judgment (combine vs split, special-case
                // treatment) where some creativity helps. Still capped
                // to keep propositions disciplined.
                temperature: 0.5,
                topP: 0.92,
                responseMimeType: 'application/json',
                responseSchema: PREACHABLE_RESPONSE_SCHEMA as any,
            },
        });

        console.log('[GeminiExpositoryAssistant] runPreachableConversion', {
            book: input.book,
            language: input.displayLanguage,
            macroCount: input.macroSections.length,
            microCount: input.exegeticalUnits.length,
            targetCount: input.targetPreachableCount ?? null,
        });

        const result = await withGeminiRetry(
            () => model.generateContent(userMessage),
            { contextLabel: 'GeminiExpositoryAssistant.runPreachableConversion' },
        );
        const response = result.response;
        const raw = readResponseTextOrThrow(response, 'preachableConversion');

        const parsed = parseJsonOrThrow(raw, 'preachableConversion');
        const validMicroIds = new Set(input.exegeticalUnits.map((u) => u.id));
        const payload = normalizePreachableUnits(parsed, validMicroIds);

        return {
            payload,
            modelId: this.modelName,
            tokensUsed: extractTokens(response.usageMetadata),
            passVersion: this.passVersion('preachable', input),
        };
    }

    // ── Pase 5: Evaluación de fidelidad ─────────────────────────────────

    async runFidelityReview(input: FidelityInput): Promise<PassResult<FidelityReview>> {
        const systemInstruction = buildFidelitySystemInstruction(input.displayLanguage);
        const userMessage = buildFidelityUserMessage(input);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            safetySettings: EXPOSITORY_SAFETY_SETTINGS as SafetySetting[],
            generationConfig: {
                maxOutputTokens: 8192,
                // Lower temperature: this is critical audit work; we
                // don't want creative invention of issues, we want
                // strict fidelity-checking against the methodology.
                temperature: 0.2,
                topP: 0.85,
                responseMimeType: 'application/json',
                responseSchema: FIDELITY_RESPONSE_SCHEMA as any,
            },
        });

        console.log('[GeminiExpositoryAssistant] runFidelityReview', {
            book: input.book,
            language: input.displayLanguage,
            preachableCount: input.preachableUnits.length,
        });

        const result = await withGeminiRetry(
            () => model.generateContent(userMessage),
            { contextLabel: 'GeminiExpositoryAssistant.runFidelityReview' },
        );
        const response = result.response;
        const raw = readResponseTextOrThrow(response, 'fidelityReview');

        const parsed = parseJsonOrThrow(raw, 'fidelityReview');
        const validUnitIds = new Set(input.preachableUnits.map((p) => p.id));
        const payload = normalizeFidelityReview(parsed, validUnitIds);

        return {
            payload,
            modelId: this.modelName,
            tokensUsed: extractTokens(response.usageMetadata),
            passVersion: this.passVersion('fidelity', input),
        };
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

/**
 * Safety thresholds for the expository pipeline.
 *
 * Default Google thresholds block at LOW severity, which the OUTPUT
 * filter trips on biblical content discussing sin, judgment, false
 * teachers, or graphic Old-Testament narratives — even when the LLM
 * is producing legitimate exegetical commentary. The result is empty
 * `text()` and an undecipherable `parseJsonOrThrow` failure
 * downstream.
 *
 * `BLOCK_MEDIUM_AND_ABOVE` matches the rest of the system
 * (`GeminiAIService`, `GeminiSermonGenerator`) — still permissive
 * enough for sermon/exegesis content while keeping a real safety
 * floor.
 */
const EXPOSITORY_SAFETY_SETTINGS: ReadonlyArray<SafetySetting> = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Reads the response text defensively.
 *
 * The bare `response.text()` call returns an empty string when the
 * candidate finished for a non-STOP reason (SAFETY, RECITATION,
 * MAX_TOKENS, OTHER). Without this wrapper the downstream
 * `parseJsonOrThrow` would just see "" and throw an opaque
 * "non-JSON output:" with nothing useful to debug — which is exactly
 * the failure mode the user reported on 2 Peter (a book heavy with
 * "false teachers / immorality / Sodom" content that trips
 * default-threshold safety filters).
 */
function readResponseTextOrThrow(
    response: { text: () => string; candidates?: ReadonlyArray<{ finishReason?: string; safetyRatings?: unknown }> },
    passId: string,
): string {
    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const text = response.text() ?? '';
    if (text.trim().length === 0) {
        const detail = finishReason
            ? `finishReason=${finishReason}`
            : 'finishReason=unknown';
        const safety = candidate?.safetyRatings ? ` safetyRatings=${JSON.stringify(candidate.safetyRatings)}` : '';
        throw new Error(
            `GeminiExpositoryAssistant.${passId} returned empty content (${detail}${safety}). ` +
            `Likely safety-blocked or hit MAX_TOKENS — review prompt or relax safety thresholds.`,
        );
    }
    if (finishReason && finishReason !== 'STOP') {
        // Got partial content with a non-STOP reason — usually
        // MAX_TOKENS truncating the JSON mid-stream. Surface clearly
        // so the bump-tokens fix is obvious.
        console.warn(
            `[GeminiExpositoryAssistant] ${passId} non-STOP finishReason=${finishReason} (text length=${text.length})`,
        );
    }
    return text;
}

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

function intOrNull(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === 'string' && value.trim() !== '') {
        const n = Number(value);
        if (Number.isFinite(n)) return Math.trunc(n);
    }
    return null;
}

function normalizeExegeticalUnits(
    raw: any,
    validMacroIds: ReadonlySet<string>,
    bookDisplay: string,
    genre: LiteraryGenre,
): ExegeticalUnit[] {
    const arr: unknown = raw?.exegeticalUnits;
    if (!Array.isArray(arr)) {
        throw new Error('microStructure response missing or invalid exegeticalUnits array');
    }

    const originalLanguage: 'greek' | 'hebrew' | undefined =
        genre === 'epistle' || genre === 'gospel' || genre === 'apocalypse'
            ? 'greek'
            : genre === 'narrative' || genre === 'poetry' || genre === 'prophecy' || genre === 'wisdom' || genre === 'law'
              ? 'hebrew'
              : undefined; // 'mixed' / unknown → don't claim a language

    const units: ExegeticalUnit[] = [];
    arr.forEach((item, index) => {
        if (!item || typeof item !== 'object') return;
        const o = item as Record<string, unknown>;

        const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `eu-${index + 1}`;
        const macroSectionId = typeof o.macroSectionId === 'string' ? o.macroSectionId.trim() : '';
        const cs = intOrNull(o.chapterStart);
        const vs = intOrNull(o.verseStart);
        const ce = intOrNull(o.chapterEnd);
        const ve = intOrNull(o.verseEnd);
        const suggestedTitle = typeof o.suggestedTitle === 'string' ? o.suggestedTitle.trim() : '';
        const functionInArgument = typeof o.functionInArgument === 'string' ? o.functionInArgument.trim() : '';
        const centralIdea = typeof o.centralIdea === 'string' ? o.centralIdea.trim() : '';
        const literarySignals = stringArrayOrEmpty(o.literarySignals);
        const order = intOrNull(o.order) ?? index + 1;

        if (!macroSectionId || !validMacroIds.has(macroSectionId)) return;
        if (!suggestedTitle || !functionInArgument || !centralIdea) return;
        if (cs === null || vs === null || ce === null || ve === null) return;
        if (ce < cs || (ce === cs && ve < vs)) return;
        if (literarySignals.length === 0) return; // require at least one concrete marker

        units.push({
            id,
            macroSectionId,
            syntacticUnit: {
                book: bookDisplay,
                chapterStart: cs,
                verseStart: vs,
                chapterEnd: ce,
                verseEnd: ve,
                ...(originalLanguage ? { originalLanguage } : {}),
            },
            suggestedTitle,
            functionInArgument,
            centralIdea,
            literarySignals,
            order,
        });
    });

    if (units.length === 0) {
        throw new Error('microStructure returned zero valid exegetical units');
    }
    return units.sort((a, b) => a.order - b.order);
}

function normalizeFidelityReview(
    raw: any,
    validUnitIds: ReadonlySet<string>,
): FidelityReview {
    if (!raw || typeof raw !== 'object') {
        throw new Error('fidelityReview response is not an object');
    }

    const rawConfidence = typeof raw.overallConfidence === 'number'
        ? raw.overallConfidence
        : Number(raw.overallConfidence);
    const overallConfidence = Number.isFinite(rawConfidence)
        ? Math.min(1, Math.max(0, rawConfidence))
        : 0.5; // neutral default if the model omitted

    const rawIssues = Array.isArray(raw.issues) ? raw.issues : [];
    const issues = rawIssues
        .map((item: any) => {
            if (!item || typeof item !== 'object') return null;
            const description = typeof item.description === 'string' ? item.description.trim() : '';
            if (!description) return null;

            const severity = typeof item.severity === 'string'
                && (VALID_FIDELITY_SEVERITIES as readonly string[]).includes(item.severity)
                ? (item.severity as ValidFidelitySeverity)
                : 'info';

            const rawUnitId = typeof item.unitId === 'string' ? item.unitId.trim() : '';
            // Drop unitId when it points to a non-existent unit;
            // treat it as a global issue instead of crashing.
            const unitId = rawUnitId && validUnitIds.has(rawUnitId) ? rawUnitId : null;

            const recommendation = typeof item.recommendation === 'string' && item.recommendation.trim()
                ? item.recommendation.trim()
                : undefined;

            return {
                unitId,
                severity,
                description,
                ...(recommendation ? { recommendation } : {}),
            };
        })
        .filter((x: unknown): x is NonNullable<typeof x> => x !== null);

    return {
        overallConfidence,
        issues,
    };
}

function formatPreachablePassage(
    book: string,
    cs: number, vs: number, ce: number, ve: number,
): string {
    if (cs === ce) {
        if (vs === ve) return `${book} ${cs}:${vs}`;
        return `${book} ${cs}:${vs}-${ve}`;
    }
    return `${book} ${cs}:${vs}-${ce}:${ve}`;
}

function normalizePreachableUnits(
    raw: any,
    validMicroIds: ReadonlySet<string>,
): PreachableUnit[] {
    const arr: unknown = raw?.preachableUnits;
    if (!Array.isArray(arr)) {
        throw new Error('preachableConversion response missing or invalid preachableUnits array');
    }

    const units: PreachableUnit[] = [];
    arr.forEach((item, index) => {
        if (!item || typeof item !== 'object') return;
        const o = item as Record<string, unknown>;

        const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `pu-${index + 1}`;
        const title = typeof o.title === 'string' ? o.title.trim() : '';
        const passage = typeof o.passage === 'string' ? o.passage.trim() : '';
        const cs = intOrNull(o.chapterStart);
        const vs = intOrNull(o.verseStart);
        const ce = intOrNull(o.chapterEnd);
        const ve = intOrNull(o.verseEnd);
        const sourcedRaw = stringArrayOrEmpty(o.sourcedExegeticalUnitIds);
        const sourcedExegeticalUnitIds = sourcedRaw.filter((mid) => validMicroIds.has(mid));
        const exegeticalProposition = typeof o.exegeticalProposition === 'string'
            ? o.exegeticalProposition.trim()
            : '';
        const homileticalProposition = typeof o.homileticalProposition === 'string'
            ? o.homileticalProposition.trim()
            : '';
        const pastoralObjective = typeof o.pastoralObjective === 'string'
            ? o.pastoralObjective.trim()
            : '';
        const caseTreatment = typeof o.caseTreatment === 'string'
            && (VALID_SPECIAL_CASES as readonly string[]).includes(o.caseTreatment)
            ? (o.caseTreatment as ValidSpecialCase)
            : undefined;
        const order = intOrNull(o.order) ?? index + 1;

        if (!title) return;
        if (cs === null || vs === null || ce === null || ve === null) return;
        if (ce < cs || (ce === cs && ve < vs)) return;
        if (!exegeticalProposition || !homileticalProposition || !pastoralObjective) return;
        // A preachable unit MUST cite at least one valid exegetical
        // unit — that's what keeps the conversion traceable to the
        // exegesis. If the LLM emits ids that don't exist (bug or
        // hallucination), drop the unit instead of persisting an
        // orphan.
        if (sourcedExegeticalUnitIds.length === 0) return;

        const finalPassage = passage || formatPreachablePassage('', cs, vs, ce, ve).trim();

        units.push({
            id,
            title,
            passage: finalPassage,
            chapterStart: cs,
            verseStart: vs,
            chapterEnd: ce,
            verseEnd: ve,
            sourcedExegeticalUnitIds,
            exegeticalProposition,
            homileticalProposition,
            pastoralObjective,
            ...(caseTreatment ? { caseTreatment } : {}),
            order,
        });
    });

    if (units.length === 0) {
        throw new Error('preachableConversion returned zero valid preachable units');
    }
    return units.sort((a, b) => a.order - b.order);
}

function normalizeSuperMacroSections(raw: any): SuperMacroSection[] {
    const arr: unknown = raw?.superMacroSections;
    if (!Array.isArray(arr)) {
        throw new Error('superMacroStructure response missing or invalid superMacroSections array');
    }

    const sections: SuperMacroSection[] = [];
    arr.forEach((item, index) => {
        if (!item || typeof item !== 'object') return;
        const o = item as Record<string, unknown>;

        const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `sm-${index + 1}`;
        const title = typeof o.title === 'string' ? o.title.trim() : '';
        const cs = intOrNull(o.chapterStart);
        const vs = intOrNull(o.verseStart);
        const ce = intOrNull(o.chapterEnd);
        const ve = intOrNull(o.verseEnd);
        const theme = typeof o.theme === 'string' ? o.theme.trim() : '';
        const order = intOrNull(o.order) ?? index + 1;

        if (!title || !theme) return;
        if (cs === null || vs === null || ce === null || ve === null) return;
        if (ce < cs || (ce === cs && ve < vs)) return;

        sections.push({
            id,
            title,
            chapterStart: cs,
            verseStart: vs,
            chapterEnd: ce,
            verseEnd: ve,
            theme,
            order,
        });
    });

    if (sections.length === 0) {
        throw new Error('superMacroStructure returned zero valid sections');
    }
    // Hard cap: 5 is the design ceiling per the prompt. Honor it
    // server-side so a misbehaving model can't flood the wizard.
    if (sections.length > 5) {
        return sections.slice(0, 5).sort((a, b) => a.order - b.order);
    }
    return sections.sort((a, b) => a.order - b.order);
}

function normalizeMacroSections(raw: any): MacroSection[] {
    const arr: unknown = raw?.macroSections;
    if (!Array.isArray(arr)) {
        throw new Error('macroStructure response missing or invalid macroSections array');
    }

    const sections: MacroSection[] = [];
    arr.forEach((item, index) => {
        if (!item || typeof item !== 'object') return;
        const o = item as Record<string, unknown>;

        const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `ms-${index + 1}`;
        const title = typeof o.title === 'string' ? o.title.trim() : '';
        const cs = intOrNull(o.chapterStart);
        const vs = intOrNull(o.verseStart);
        const ce = intOrNull(o.chapterEnd);
        const ve = intOrNull(o.verseEnd);
        const theme = typeof o.theme === 'string' ? o.theme.trim() : '';
        const fn = typeof o.functionInBook === 'string' && (VALID_MACRO_FUNCTIONS as readonly string[]).includes(o.functionInBook)
            ? (o.functionInBook as ValidMacroFunction)
            : 'argument-development';
        const order = intOrNull(o.order) ?? index + 1;

        if (!title || !theme) return;
        if (cs === null || vs === null || ce === null || ve === null) return;
        if (ce < cs || (ce === cs && ve < vs)) return; // boundary sanity

        const parentSuperMacroId = typeof o.parentSuperMacroId === 'string' && o.parentSuperMacroId.trim()
            ? o.parentSuperMacroId.trim()
            : undefined;

        sections.push({
            id,
            title,
            chapterStart: cs,
            verseStart: vs,
            chapterEnd: ce,
            verseEnd: ve,
            theme,
            functionInBook: fn,
            order,
            ...(parentSuperMacroId ? { parentSuperMacroId } : {}),
        });
    });

    if (sections.length === 0) {
        throw new Error('macroStructure returned zero valid sections');
    }
    // Hard cap raised from 9 → 15 so length-aware targets in the
    // prompt (Acts/Genesis/Isaiah hint ~12) and canonical structural
    // markers (Genesis toledots = 11+1) are not silently truncated.
    // 15 still bounds genuinely runaway responses without dropping
    // legitimate structure for long books. Any book whose canonical
    // macro-structure exceeds 15 (Psalms book-internal collections,
    // hypothetically) belongs in the v1.6 two-tier hierarchy work.
    if (sections.length > 15) {
        return sections.slice(0, 15);
    }

    // Stable sort by `order` so the wizard renders in document order.
    return sections.sort((a, b) => a.order - b.order);
}
