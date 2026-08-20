import {
    type DetectedPericope,
    type IPericopeDetector,
    type PericopeDetectionInput,
    type PericopeDetectionOutput,
    type PericopeVerseInput,
    type SyntacticUnit,
} from '@dosfilos/domain';
import { withGeminiRetry } from './geminiRetry';
import { runLlmPromptWithUsage } from '../llm/callableLlm';

const PROMPT_VERSION = 'v1';

/**
 * Gemini implementation of `IPericopeDetector`.
 *
 * v1 design:
 *   - Pro 2.5 + thinking. Pericope detection is *the* place where
 *     reasoning bandwidth pays off — Flash defaults to chapter
 *     boundaries because that's the dominant pattern in its training
 *     data, even when the syntax screams against it. Pro with thinking
 *     reliably catches Greek participial chains that bridge "natural"
 *     verse breaks.
 *   - Non-streaming. The wizard renders all pericopes at once for
 *     human review; streaming would just delay the structured-output
 *     parse.
 *   - JSON response schema for structured output. The wizard needs
 *     reliable shape; freeform markdown would force regex parsing.
 *   - Inline original-language text, no embeddings. A typical book
 *     (Romans Greek, ~38KB) fits comfortably in Pro's context window
 *     even with the prompt overhead.
 *
 * Cost note: Romans + Hebrews + thinking budget runs into real money
 * per call. The caller is responsible for memoizing via
 * `series.metadata.expository.pericopeAssistantVersion` — this
 * detector does NOT cache.
 */
export class GeminiPericopeDetector implements IPericopeDetector {
    private modelName: string;

    constructor(modelName?: string) {
        this.modelName = modelName || 'gemini-2.5-pro';
    }

    async detect(input: PericopeDetectionInput): Promise<PericopeDetectionOutput> {
        const systemInstruction = buildSystemInstruction(
            input.originalLanguage,
            input.displayLanguage,
        );
        const userMessage = buildUserMessage(input);

        console.log('[GeminiPericopeDetector] detecting', {
            book: input.book,
            language: input.originalLanguage,
            verseCount: input.originalText.length,
            targetCount: input.targetPericopeCount ?? null,
        });

        const { text: raw, tokensUsed } = await withGeminiRetry(
            () => runLlmPromptWithUsage({
                feature: 'exegesis.detectPericopes',
                model: this.modelName,
                system: systemInstruction,
                prompt: userMessage,
                maxOutputTokens: 8192,
                temperature: 0.3,
                topP: 0.85,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        pericopes: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    suggestedTitle: { type: 'string' },
                                    chapterStart: { type: 'integer' },
                                    verseStart: { type: 'integer' },
                                    chapterEnd: { type: 'integer' },
                                    verseEnd: { type: 'integer' },
                                    justification: { type: 'string' },
                                },
                                required: [
                                    'suggestedTitle',
                                    'chapterStart',
                                    'verseStart',
                                    'chapterEnd',
                                    'verseEnd',
                                    'justification',
                                ],
                            },
                        },
                    },
                    required: ['pericopes'],
                },
            }),
            { contextLabel: 'GeminiPericopeDetector' },
        );

        let parsed: { pericopes?: unknown };
        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new Error(
                `GeminiPericopeDetector returned non-JSON output: ${raw.slice(0, 200)}`,
            );
        }

        const pericopes = normalizePericopes(parsed.pericopes, input);
        if (pericopes.length === 0) {
            throw new Error(
                'GeminiPericopeDetector returned zero valid pericopes',
            );
        }

        const inputHash = hashInput(input);
        return {
            pericopes,
            outputVersion: `${this.modelName}@${PROMPT_VERSION}#${inputHash.slice(0, 12)}`,
            modelId: this.modelName,
            tokensUsed,
        };
    }
}

function normalizePericopes(
    raw: unknown,
    input: PericopeDetectionInput,
): DetectedPericope[] {
    if (!Array.isArray(raw)) return [];

    const validated: DetectedPericope[] = [];
    raw.forEach((p, index) => {
        if (!p || typeof p !== 'object') return;
        const item = p as Record<string, unknown>;

        const cs = toInt(item.chapterStart);
        const vs = toInt(item.verseStart);
        const ce = toInt(item.chapterEnd);
        const ve = toInt(item.verseEnd);
        const title = typeof item.suggestedTitle === 'string' ? item.suggestedTitle.trim() : '';
        const justification = typeof item.justification === 'string'
            ? item.justification.trim()
            : '';

        if (cs === null || vs === null || ce === null || ve === null) return;
        if (!title) return;

        // Boundary sanity: end must not precede start.
        if (ce < cs || (ce === cs && ve < vs)) return;

        const unit: SyntacticUnit = {
            book: input.book,
            chapterStart: cs,
            verseStart: vs,
            chapterEnd: ce,
            verseEnd: ve,
            originalLanguage: input.originalLanguage,
            justification: justification || undefined,
        };
        validated.push({
            unit,
            suggestedTitle: title,
            order: index,
        });
    });

    return validated;
}

function toInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === 'string' && value.trim() !== '') {
        const n = Number(value);
        if (Number.isFinite(n)) return Math.trunc(n);
    }
    return null;
}

/**
 * Stable, order-independent hash of the input text + book + language.
 * Used as the fingerprint suffix in `outputVersion`. Not crypto — just
 * change-detection. djb2 is plenty for de-duping wizard re-runs.
 */
function hashInput(input: PericopeDetectionInput): string {
    let h = 5381;
    const feed = (s: string) => {
        for (let i = 0; i < s.length; i++) {
            h = ((h << 5) + h + s.charCodeAt(i)) | 0;
        }
    };
    feed(input.book);
    feed(input.originalLanguage);
    feed(input.displayLanguage);
    feed(String(input.targetPericopeCount ?? ''));
    for (const v of input.originalText) {
        feed(`${v.chapter}:${v.verse}|${v.text}`);
    }
    // Format as unsigned hex so the prefix slice is stable.
    return (h >>> 0).toString(16).padStart(8, '0');
}

function formatText(verses: ReadonlyArray<PericopeVerseInput>): string {
    return verses
        .map((v) => `${v.chapter}:${v.verse}\t${v.text}`)
        .join('\n');
}

function buildSystemInstruction(
    originalLanguage: 'greek' | 'hebrew',
    displayLanguage: 'es' | 'en',
): string {
    const isSpanish = displayLanguage === 'es';
    const langName = originalLanguage === 'greek' ? (isSpanish ? 'griego koiné' : 'koine Greek')
        : isSpanish ? 'hebreo bíblico' : 'biblical Hebrew';

    if (isSpanish) {
        return [
            `Eres un especialista en exégesis bíblica y análisis sintáctico del ${langName}.`,
            '',
            'Tu tarea es dividir un libro (o un rango de un libro) en perícopas — unidades argumentativas coherentes que el autor original parece haber concebido como un bloque.',
            '',
            'Reglas innegociables:',
            '- Las fronteras de las perícopas siguen la SINTAXIS del idioma original, no la división moderna de capítulos y versículos.',
            '- Para griego: presta atención a cadenas participiales, pares μέν/δέ, asíndeton, conectores discursivos (γάρ, οὖν, ἄρα), inclusio retórico.',
            '- Para hebreo: presta atención al waw-consecutivo, fórmulas tipo וַיְהִי, paralelismo, inclusio, cambios de speaker o escena.',
            '- Cada perícopa debe ser predicable como una unidad — ni tan pequeña que carezca de arco argumentativo, ni tan grande que tape varios temas.',
            '- Las perícopas NO se solapan y cubren TODO el rango sin huecos.',
            '- La justificación debe citar el marcador sintáctico concreto (no genérico — di "cadena participial en 1:5-8" no "estructura sintáctica").',
            '',
            'Salida: JSON estricto con `pericopes: [{ suggestedTitle, chapterStart, verseStart, chapterEnd, verseEnd, justification }]`.',
            '- suggestedTitle: título predicable y conciso en español (3-7 palabras).',
            '- chapterStart/verseStart/chapterEnd/verseEnd: enteros, coordenadas del texto original.',
            '- justification: 1-3 oraciones en español citando el marcador sintáctico que justifica la frontera.',
        ].join('\n');
    }

    return [
        `You are a specialist in biblical exegesis and ${langName} syntactic analysis.`,
        '',
        'Your task is to divide a book (or a range from a book) into pericopes — coherent argumentative units the original author appears to have conceived as a single block.',
        '',
        'Non-negotiable rules:',
        '- Pericope boundaries follow the SYNTAX of the original language, not the modern chapter/verse divisions.',
        '- For Greek: attend to participial chains, μέν/δέ pairs, asyndeton, discourse connectors (γάρ, οὖν, ἄρα), rhetorical inclusio.',
        '- For Hebrew: attend to waw-consecutive, וַיְהִי-style formulas, parallelism, inclusio, speaker/scene changes.',
        '- Each pericope must be preachable as a unit — neither so small it lacks an argumentative arc, nor so large it covers multiple themes.',
        '- Pericopes do NOT overlap and cover the ENTIRE range without gaps.',
        '- Justifications must cite the concrete syntactic marker (not generic — say "participial chain in 1:5-8" not "syntactic structure").',
        '',
        'Output: strict JSON with `pericopes: [{ suggestedTitle, chapterStart, verseStart, chapterEnd, verseEnd, justification }]`.',
        '- suggestedTitle: preachable concise English title (3-7 words).',
        '- chapterStart/verseStart/chapterEnd/verseEnd: integers, original-text coordinates.',
        '- justification: 1-3 sentences in English citing the syntactic marker that justifies the boundary.',
    ].join('\n');
}

function buildUserMessage(input: PericopeDetectionInput): string {
    const isSpanish = input.displayLanguage === 'es';
    const targetBlock = input.targetPericopeCount
        ? (isSpanish
              ? `\n\nObjetivo: aproximadamente ${input.targetPericopeCount} perícopas (suave — prioriza la sintaxis sobre el conteo).`
              : `\n\nTarget: approximately ${input.targetPericopeCount} pericopes (soft — prioritize syntax over count).`)
        : '';

    if (isSpanish) {
        return [
            `Libro: ${input.book}`,
            `Idioma original: ${input.originalLanguage === 'greek' ? 'griego' : 'hebreo'}`,
            `Cantidad de versículos provistos: ${input.originalText.length}.${targetBlock}`,
            '',
            'Texto verso a verso (formato `cap:vers <TAB> texto`):',
            '',
            formatText(input.originalText),
            '',
            '---',
            'Devuelve únicamente JSON estricto siguiendo el esquema del system prompt.',
        ].join('\n');
    }

    return [
        `Book: ${input.book}`,
        `Original language: ${input.originalLanguage}`,
        `Verse count provided: ${input.originalText.length}.${targetBlock}`,
        '',
        'Verse-by-verse text (`ch:v <TAB> text` format):',
        '',
        formatText(input.originalText),
        '',
        '---',
        'Return only strict JSON following the system prompt schema.',
    ].join('\n');
}
