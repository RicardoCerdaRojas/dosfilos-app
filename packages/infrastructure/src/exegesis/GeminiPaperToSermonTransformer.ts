import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    formatPassageReference,
    type IPaperToSermonTransformer,
    type PaperToSermonInput,
    type PaperToSermonOutput,
    type PaperToSermonTone,
} from '@dosfilos/domain';
import { withGeminiRetry } from './geminiRetry';

/**
 * Gemini implementation of `IPaperToSermonTransformer`.
 *
 * v1 design:
 *   - Pro 2.5 + thinking. The transformation is more about
 *     reorganization than recall, but Pro's reasoning bandwidth pays
 *     off when distilling a long paper into a homiletical arc — Flash
 *     drops main points or merges them into vague paragraphs.
 *   - Non-streaming. The button → result flow is short-lived (~30s);
 *     streaming would add plumbing for marginal value at v1.
 *   - Inline context. The full assembled paper goes into the user
 *     message; a typical paper is 8-15k chars, well within Pro's
 *     context window even with the prompt overhead.
 *   - JSON output for structured fields (title + bibleReferences) so
 *     the use case can persist without re-parsing markdown. The
 *     `content` field stays markdown — that's how the sermon detail
 *     page renders it.
 */
export class GeminiPaperToSermonTransformer implements IPaperToSermonTransformer {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName || 'gemini-2.5-pro';
    }

    async transform(input: PaperToSermonInput): Promise<PaperToSermonOutput> {
        const passageLabel = formatPassageReference(input.paperPassage, input.language);
        const systemInstruction = buildSystemInstruction(input.tone, input.language);
        const userMessage = buildUserMessage(input, passageLabel);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            generationConfig: {
                // Pro 2.5 rejects thinkingBudget: 0; default budget is fine.
                maxOutputTokens: 8192,
                temperature: 0.6,
                topP: 0.9,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        content: { type: 'string' },
                        bibleReferences: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                    },
                    required: ['title', 'content', 'bibleReferences'],
                } as any,
            },
        });

        console.log('[GeminiPaperToSermonTransformer] generating', {
            tone: input.tone,
            language: input.language,
            paperChars: input.assembledMarkdown.length,
            hasBrief: input.assignmentBrief !== null,
        });

        const result = await withGeminiRetry(
            () => model.generateContent(userMessage),
            { contextLabel: 'GeminiPaperToSermonTransformer' },
        );
        const response = result.response;
        const raw = response.text();

        let parsed: { title?: unknown; content?: unknown; bibleReferences?: unknown };
        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new Error(
                `GeminiPaperToSermonTransformer returned non-JSON output: ${raw.slice(0, 200)}`,
            );
        }

        const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
        const content = typeof parsed.content === 'string' ? parsed.content.trim() : '';
        const bibleReferences = Array.isArray(parsed.bibleReferences)
            ? parsed.bibleReferences.filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
            : [];

        if (!title || !content) {
            throw new Error(
                'GeminiPaperToSermonTransformer returned empty title or content',
            );
        }

        const usage = response.usageMetadata;
        const totalTokens = usage?.totalTokenCount;
        const summed = (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0);
        const tokensUsed =
            typeof totalTokens === 'number' ? totalTokens : summed > 0 ? summed : null;

        return {
            title,
            content,
            // Always include the primary passage even if the LLM forgot it.
            bibleReferences: ensurePrimaryPassage(bibleReferences, passageLabel),
            modelId: this.modelName,
            tokensUsed,
        };
    }
}

function ensurePrimaryPassage(refs: string[], primary: string): string[] {
    const normalized = primary.trim();
    if (!normalized) return refs;
    const has = refs.some((r) => r.trim() === normalized);
    return has ? refs : [normalized, ...refs];
}

const TONE_DIRECTIVES_ES: Record<PaperToSermonTone, string> = {
    pastoral:
        'Tono pastoral: cercano, cálido, orientado a la consolación y al cuidado de la grey. Usa segunda persona plural ("hermanos", "ustedes") con calidez. Aterriza siempre la enseñanza en la vida cotidiana del oyente.',
    expositivo:
        'Tono expositivo clásico: estructura clara con idea principal, divisiones evidentes y aplicación directa de cada punto al texto. Honra la argumentación del paper exegético; no introduzcas ideas que el paper no sostenga.',
    narrativo:
        'Tono narrativo: construye el sermón en torno al arco del relato bíblico. Usa imágenes, escenas y momentos. Permite que la doctrina emerja del relato en lugar de listarla.',
};

const TONE_DIRECTIVES_EN: Record<PaperToSermonTone, string> = {
    pastoral:
        'Pastoral tone: warm, close, oriented toward comfort and shepherding. Use plural second person ("brothers and sisters", "you") with warmth. Always land the teaching in the listener\'s daily life.',
    expositivo:
        'Classical expository tone: clear structure with a main idea, distinct divisions, and direct application of each point to the text. Honor the exegetical paper\'s argument; do not introduce ideas the paper does not support.',
    narrativo:
        'Narrative tone: build the sermon around the arc of the biblical story. Use images, scenes, and moments. Let the doctrine emerge from the story rather than listing it.',
};

function buildSystemInstruction(tone: PaperToSermonTone, language: 'es' | 'en'): string {
    const isSpanish = language === 'es';
    const directive = (isSpanish ? TONE_DIRECTIVES_ES : TONE_DIRECTIVES_EN)[tone];

    if (isSpanish) {
        return [
            'Eres un homileta experto que transforma estudios exegéticos académicos en sermones predicables.',
            '',
            'Tu tarea es destilar un paper exegético ensamblado en un sermón completo, listo para ser predicado.',
            '',
            'Reglas innegociables:',
            '- El sermón se basa exclusivamente en el contenido del paper. No introduzcas argumentos que el paper no sostenga.',
            '- PROHIBIDO inventar citas atribuidas a teólogos, puritanos, reformadores u otros autores. Solo cita autores que el paper menciona explícitamente y cuyas citas el paper transcribe. Si necesitas autoridad y el paper no la provee, cita la Escritura misma. No uses fórmulas como "Como dijo Owen" / "Spurgeon enseñó" / "Según Calvino" salvo que el texto exacto venga del paper.',
            '- El sermón debe leerse de forma autónoma; no menciones "el paper" ni "según la sección X".',
            '- Estructura mínima: introducción que enganche, cuerpo con 2-4 puntos principales claramente delimitados (cada uno con su explicación, ilustración cuando ayude, y aplicación), y conclusión que llame a respuesta concreta.',
            '- Balance de longitud OBLIGATORIO: introducción 200-400 palabras (10-15% del total), cuerpo 1800-2800 palabras (70-80% del total), conclusión 250-450 palabras (10-15% del total). La conclusión nunca puede ser menor a un cuarto de la introducción.',
            '- Diversidad de ilustraciones: NO repitas la misma imagen o categoría (viaje/deporte/familia/cocina) en dos puntos consecutivos. Si un punto usa una ilustración de transporte (avión, tren, barco), el siguiente DEBE usar una categoría distinta.',
            '- Cadencia oral: párrafos cortos, frases breves, ritmo que pueda predicarse en voz alta.',
            '- Cita el texto bíblico cuando lo desarrolles; no uses citas académicas (Lane, NIDNTT, etc.) — el oyente no las necesita.',
            '- Duración objetivo: 25-35 minutos predicados (aprox. 2.500-3.500 palabras de cuerpo).',
            '- Llamado a la acción OBLIGATORIO al final: la conclusión debe terminar con 1-3 acciones concretas y específicas (no genéricas) que el oyente pueda comenzar esta semana.',
            '',
            directive,
            '',
            'Salida: JSON estricto con {title, content, bibleReferences}.',
            '- title: título predicable (5-10 palabras), no académico.',
            '- content: cuerpo del sermón en markdown. Usa "## " para títulos de cada punto principal.',
            '- bibleReferences: lista de pasajes bíblicos citados o aludidos en el sermón, en formato "Libro Cap:Vers" (e.g., "2 Pedro 1:1-11", "Romanos 8:28").',
        ].join('\n');
    }

    return [
        'You are an expert homiletician who transforms academic exegetical studies into preachable sermons.',
        '',
        'Your task is to distill an assembled exegetical paper into a complete sermon, ready to be preached.',
        '',
        'Non-negotiable rules:',
        '- The sermon is based exclusively on the paper\'s content. Do not introduce arguments the paper does not support.',
        '- FORBIDDEN to invent citations attributed to theologians, Puritans, Reformers, or any author. Only quote authors the paper explicitly mentions AND whose exact words the paper transcribes. If you need authority and the paper does not provide it, quote Scripture itself. Do not use formulas like "As Owen said" / "Spurgeon taught" / "According to Calvin" unless the exact text comes from the paper.',
        '- The sermon must read on its own; do not mention "the paper" or "according to section X".',
        '- Minimum structure: hooking introduction, body with 2-4 clearly-delimited main points (each with its explanation, illustration when helpful, and application), and a conclusion that calls for a concrete response.',
        '- MANDATORY length balance: introduction 200-400 words (10-15% of total), body 1800-2800 words (70-80% of total), conclusion 250-450 words (10-15% of total). Conclusion can never be less than a quarter of the introduction.',
        '- Illustration diversity: DO NOT repeat the same image or category (travel/sports/family/cooking) in two consecutive points. If a point uses a transportation illustration (airplane, train, boat), the next MUST use a different category.',
        '- Oral cadence: short paragraphs, brief sentences, rhythm preachable aloud.',
        '- Cite the biblical text as you develop it; do not use academic citations (Lane, NIDNTT, etc.) — the listener does not need them.',
        '- Target length: 25-35 minutes preached (approx. 2,500-3,500 words of body).',
        '- MANDATORY call to action at the end: the conclusion must close with 1-3 concrete, specific actions (not generic) the listener can begin this week.',
        '',
        directive,
        '',
        'Output: strict JSON with {title, content, bibleReferences}.',
        '- title: preachable title (5-10 words), not academic.',
        '- content: sermon body in markdown. Use "## " for each main point heading.',
        '- bibleReferences: list of biblical passages cited or alluded to in the sermon, in format "Book Ch:Vs" (e.g., "2 Peter 1:1-11", "Romans 8:28").',
    ].join('\n');
}

function buildUserMessage(input: PaperToSermonInput, passageLabel: string): string {
    const isSpanish = input.language === 'es';
    const briefBlock = input.assignmentBrief
        ? (isSpanish
              ? `\n\n## Encuadre del paper\n\n${input.assignmentBrief}`
              : `\n\n## Paper framing\n\n${input.assignmentBrief}`)
        : '';
    const titleBlock = input.paperTitle
        ? (isSpanish
              ? `\n\nTítulo original del paper: "${input.paperTitle}"`
              : `\n\nOriginal paper title: "${input.paperTitle}"`)
        : '';

    if (isSpanish) {
        return [
            `Pasaje principal: ${passageLabel}.${titleBlock}${briefBlock}`,
            '',
            '## Paper exegético ensamblado',
            '',
            input.assembledMarkdown,
            '',
            '---',
            '',
            'Genera el sermón en JSON estricto siguiendo las reglas del system prompt.',
        ].join('\n');
    }

    return [
        `Primary passage: ${passageLabel}.${titleBlock}${briefBlock}`,
        '',
        '## Assembled exegetical paper',
        '',
        input.assembledMarkdown,
        '',
        '---',
        '',
        'Generate the sermon in strict JSON following the system prompt rules.',
    ].join('\n');
}
