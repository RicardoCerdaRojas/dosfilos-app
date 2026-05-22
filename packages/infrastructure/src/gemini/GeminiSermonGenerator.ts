import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from '@google/generative-ai';
import {
    CitationManifest,
    ISermonGenerator,
    GenerationRules,
    ExegeticalStudy,
    HomileticalAnalysis,
    SermonContent,
    WorkflowPhase,
    DEFAULT_LANGUAGE,
} from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';
import { ChatMessage } from '@dosfilos/domain/src/entities/SermonWorkflow';
import {
    buildExegesisPrompt,
    buildSermonDraftPrompt,
    buildChatSystemPrompt
} from './prompts-generator';

import { GEMINI_CONFIG } from './config';

export class GeminiSermonGenerator implements ISermonGenerator {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        const modelName = GEMINI_CONFIG.MODEL_NAME;

        this.model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: GEMINI_CONFIG.GENERATION_CONFIG,
            safetySettings: this.getSafetySettings(),
        });
    }

    private getModel(options?: { fileSearchStoreId?: string; temperature?: number; modelName?: string; responseMimeType?: string; maxOutputTokens?: number }): GenerativeModel {
        const modelName = options?.modelName || GEMINI_CONFIG.MODEL_NAME;
        const temperature = options?.temperature ?? GEMINI_CONFIG.GENERATION_CONFIG.temperature;

        const generationConfig: any = {
            ...GEMINI_CONFIG.GENERATION_CONFIG,
            temperature: temperature,
            ...(options?.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
        };

        if (options?.responseMimeType && !options.fileSearchStoreId) {
            // NOTE: Gemini API throws 400 if responseMimeType is used with Tools (File Search)
            // So we only enable JSON mode if NOT using RAG tools.
            generationConfig.responseMimeType = options.responseMimeType;
        }

        // Priority 1: Use File Search Store (Core Library)
        if (options?.fileSearchStoreId) {
            // CRITICAL FIX: Explicitly disable JSON mode when using Tools (RAG/File Search)
            // Gemini API throws 400 if responseMimeType='application/json' is used with Tools.
            if (generationConfig.responseMimeType) {
                delete generationConfig.responseMimeType;
            }

            return this.genAI.getGenerativeModel({
                model: modelName,
                tools: [{
                    // @ts-ignore - File Search tool
                    fileSearch: {
                        fileSearchStoreNames: [options.fileSearchStoreId]
                    }
                }],
                generationConfig: generationConfig,
                safetySettings: this.getSafetySettings()
            });
        }

        // Priority 2: Default model (no tools)
        return this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: generationConfig,
            safetySettings: this.getSafetySettings()
        });
    }

    private getSafetySettings() {
        return [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
        ];
    }

    async generateExegesis(passage: string, rules: GenerationRules, config?: any, language: SupportedLanguage = DEFAULT_LANGUAGE): Promise<ExegeticalStudy> {
        try {
            const prompt = buildExegesisPrompt(passage, rules, config, language);

            // 🧪 TESTING: Log prompt to verify hermeneutical method


            const model = this.getModel({
                fileSearchStoreId: config?.fileSearchStoreId,
                temperature: config?.temperature,
                modelName: config?.aiModel,
                responseMimeType: 'application/json'
            });
            const content = prompt;
            const result = await model.generateContent(content);
            const response = result.response;
            const text = response.text();
            const parsed = JSON.parse(this.cleanJsonResponse(text));

            return {
                passage: parsed.passage || passage,
                context: {
                    historical: parsed.context?.historical || '',
                    literary: parsed.context?.literary || '',
                    audience: parsed.context?.audience || ''
                },
                keyWords: Array.isArray(parsed.keyWords) ? parsed.keyWords.map((kw: any) => ({
                    original: kw.original || '',
                    transliteration: kw.transliteration || '',
                    lemma: kw.lemma || '',
                    literalTranslation: kw.literalTranslation || '',
                    morphology: kw.morphology || '',
                    syntacticFunction: kw.syntacticFunction || '',
                    significance: kw.significance || ''
                })) : [],
                exegeticalProposition: parsed.exegeticalProposition || '',
                pastoralInsights: Array.isArray(parsed.pastoralInsights) ? parsed.pastoralInsights : [],
                ragSources: Array.isArray(parsed.ragSources) ? parsed.ragSources : undefined
            };
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async generateHomiletics(
        exegesis: ExegeticalStudy,
        rules: GenerationRules,
        _config?: any,
        _language: SupportedLanguage = DEFAULT_LANGUAGE,
    ): Promise<HomileticalAnalysis> {
        try {
            const { HomileticsPromptBuilder } = await import('./prompts/HomileticsPromptBuilder');
            const { ApproachFactory } = await import('@dosfilos/domain');

            const prompt = new HomileticsPromptBuilder()
                .withExegesis(exegesis)
                .withRules(rules)
                .build();

            const model = this.getModel({
                fileSearchStoreId: _config?.fileSearchStoreId,
                temperature: _config?.temperature,
                modelName: _config?.aiModel,
                responseMimeType: 'application/json'
            });
            const content = prompt;
            const result = await model.generateContent(content);
            const response = result.response;
            const text = response.text();

            const parsed = JSON.parse(this.cleanJsonResponse(text));

            const homileticalApproaches = Array.isArray(parsed.homileticalApproaches)
                ? parsed.homileticalApproaches.map((approach: any, index: number) =>
                    ApproachFactory.createFromAIResponse(approach, index)
                )
                : [];

            const validApproaches = homileticalApproaches.filter((approach: any) =>
                ApproachFactory.validate(approach)
            );

            if (validApproaches.length === 0) {
                console.warn('⚠️ No valid approaches generated, falling back to legacy format');
                return {
                    homileticalApproaches: [],
                    selectedApproachId: undefined,
                    homileticalApproach: parsed.homileticalApproach || 'expository',
                    contemporaryApplication: Array.isArray(parsed.contemporaryApplication) ? parsed.contemporaryApplication : [],
                    homileticalProposition: parsed.homileticalProposition || '',
                    outline: parsed.outline || { mainPoints: [] },
                    exegeticalStudy: exegesis,
                };
            }

            const primaryApproach = validApproaches[0];

            return {
                homileticalApproaches: validApproaches,
                selectedApproachId: undefined,
                homileticalApproach: primaryApproach.type as any || 'expository',
                contemporaryApplication: primaryApproach.contemporaryApplication || [],
                homileticalProposition: primaryApproach.homileticalProposition || '',
                outline: primaryApproach.outline || { mainPoints: [] },
                exegeticalStudy: exegesis,
            };
        } catch (error: any) {
            console.error('Error generating homiletics:', error);
            throw this.handleError(error);
        }
    }

    async generateSermonDraft(
        analysis: HomileticalAnalysis,
        rules: GenerationRules,
        _config?: any,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
        manifest?: CitationManifest,
    ): Promise<SermonContent> {
        try {
            const prompt = buildSermonDraftPrompt(analysis, rules, language, manifest);
            const model = this.getModel({
                fileSearchStoreId: _config?.fileSearchStoreId,
                temperature: _config?.temperature,
                modelName: _config?.aiModel,
                responseMimeType: 'application/json',
                // A full sermon JSON (intro 200-400w + 3-5 body points
                // 600-900w each + conclusion 250-450w + callToAction +
                // ragSources + scriptureReferences/illustration/quote
                // sub-fields) easily clears 12-15k tokens. The default
                // 8192 budget truncates the JSON mid-array, the parser
                // falls back to `body: []` + `conclusion: ''`, and the
                // pastor sees an empty sermon. 24k gives generous
                // headroom while staying well under Flash 2.5's 32k cap.
                maxOutputTokens: 24576,
            });
            const content = prompt;
            const result = await model.generateContent(content);
            const response = result.response;
            const text = response.text();
            const parsed = JSON.parse(this.cleanJsonResponse(text));
            // Warn when the model returned a structurally-incomplete
            // sermon so we surface truncation / schema regressions in
            // logs instead of silently shipping empty bodies.
            if (!Array.isArray(parsed.body) || parsed.body.length === 0) {
                console.warn('[generateSermonDraft] empty body in response — likely truncation or schema mismatch', {
                    titleSet: !!parsed.title,
                    introSet: !!parsed.introduction,
                    conclusionSet: !!parsed.conclusion,
                    rawLength: text.length,
                });
            }
            // Normalize body: filter hallucinated authorityQuote when
            // null/undefined so the renderer skips the block cleanly.
            // PR #217: prompt now forbids fabricating quotes; the LLM
            // returns null when no verified source exists.
            const body = Array.isArray(parsed.body) ? parsed.body.map((b: any) => ({
                ...b,
                authorityQuote: b?.authorityQuote && typeof b.authorityQuote === 'string' && b.authorityQuote.trim().length > 0
                    ? b.authorityQuote
                    : null,
            })) : [];
            // callToAction is mandatory per PR #217 prompt rule. If the
            // LLM returned empty, surface a clear fallback the pastor
            // can replace — never ship an unconcluded sermon to the
            // pulpit.
            const callToAction = parsed.callToAction && typeof parsed.callToAction === 'string' && parsed.callToAction.trim().length > 0
                ? parsed.callToAction
                : '**Pasos de Acción**:\n\n1. Reflexiona esta semana cómo aplicar esta verdad a tu vida personal.\n2. Comparte el mensaje central con alguien que necesite escucharlo.\n3. Ora pidiendo al Espíritu Santo que arraigue esta verdad en tu corazón.';
            return {
                title: parsed.title || 'Sin Título',
                introduction: parsed.introduction || '',
                body,
                conclusion: parsed.conclusion || '',
                callToAction,
                ragSources: Array.isArray(parsed.ragSources) ? parsed.ragSources : undefined,
                // Mirror the manifest onto the returned draft so the
                // application layer can hand it straight to
                // `validateCitations` without recomputing. The validator
                // will rebuild a survivor-only manifest from this one.
                citationManifest: manifest,
            };
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async regenerateSermonPoint(
        point: any,
        rules: GenerationRules,
        context: any,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
    ): Promise<any> {
        try {
            const fullPrompt = `
${buildChatSystemPrompt(WorkflowPhase.DRAFTING, context, language)}

TAREA: REGENERAR UN PUNTO ESPECÍFICO DEL SERMÓN

Contexto del Sermón:
- Título: ${context.sermonTitle || 'Sin título'}
- Proposición Homilética: ${context.homileticalProposition || 'No especificada'}

Punto a Regenerar:
- Título: ${point.point || point.title}
- Referencias Base: ${point.scriptureReferences ? point.scriptureReferences.join(', ') : 'Ninguna'}

INSTRUCCIONES:
Genera el contenido completo para este punto específico, siguiendo la estructura estricta:
1. Contenido profundo y teológico.
2. Referencias cruzadas relevantes.
3. Una ilustración clara.
4. Al menos 2 implicaciones prácticas.
5. Una cita de autoridad.
6. Una transición al siguiente punto.

Reglas Personalizadas:
${rules.customInstructions || 'Ninguna'}
Tono: ${rules.tone || 'Inspirador'}

FORMATO JSON REQUERIDO:
{
  "point": "${point.point || point.title}",
  "content": "Contenido desarrollado...",
  "scriptureReferences": ["Ref 1", "Ref 2"],
  "illustration": "Ilustración...",
  "implications": ["Implicación 1", "Implicación 2"],
  "authorityQuote": "Cita...",
  "transition": "Transición..."
}
`;
            const model = this.getModel({
                fileSearchStoreId: context?.fileSearchStoreId,
                temperature: context?.temperature,
                modelName: context?.aiModel,
                responseMimeType: 'application/json'
            });
            const content = fullPrompt;
            const result = await model.generateContent(content);
            const response = result.response;
            const text = response.text();
            return JSON.parse(this.cleanJsonResponse(text));
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async chat(phase: WorkflowPhase, history: ChatMessage[], context: any, language: SupportedLanguage = DEFAULT_LANGUAGE): Promise<string> {
        try {
            const systemPrompt = buildChatSystemPrompt(phase, context, language);
            const geminiHistory = history.slice(0, -1).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

            if (geminiHistory.length > 0) {
                const firstMsg = geminiHistory[0];
                if (firstMsg && firstMsg.role === 'user') {
                    const parts = firstMsg.parts;
                    if (parts && parts.length > 0 && parts[0]) {
                        const firstPart = parts[0];
                        if (firstPart && 'text' in firstPart) {
                            firstPart.text = `${systemPrompt}\n\n${firstPart.text}`;
                        }
                    }
                }
            }

            if (history.length === 0) throw new Error('History cannot be empty');
            const lastMessage = history[history.length - 1];
            if (!lastMessage || lastMessage.role !== 'user') throw new Error('Last message must be from user');

            const model = this.getModel({
                fileSearchStoreId: context?.fileSearchStoreId,
                temperature: context?.temperature,
                modelName: context?.aiModel
            });
            const chat = model.startChat({
                history: geminiHistory,
                generationConfig: {
                    maxOutputTokens: 8192,
                    temperature: context?.temperature || GEMINI_CONFIG.GENERATION_CONFIG.temperature
                },
            });

            let messageToSend = lastMessage.content;
            if (geminiHistory.length === 0) {
                messageToSend = `${systemPrompt}\n\n${messageToSend}`;
            }

            const contentToSend = messageToSend;

            const result = await chat.sendMessage(contentToSend);
            const response = await result.response;
            return sanitizeChatResponseText(response.text());
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async chatStream(phase: WorkflowPhase, history: ChatMessage[], context: any, onChunk: (text: string) => void, language: SupportedLanguage = DEFAULT_LANGUAGE): Promise<string> {
        try {
            const systemPrompt = buildChatSystemPrompt(phase, context, language);
            const geminiHistory = history.slice(0, -1).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

            if (geminiHistory.length > 0) {
                const firstMsg = geminiHistory[0];
                if (firstMsg && firstMsg.role === 'user') {
                    const parts = firstMsg.parts;
                    if (parts && parts.length > 0 && parts[0]) {
                        const firstPart = parts[0];
                        if (firstPart && 'text' in firstPart) {
                            firstPart.text = `${systemPrompt}\n\n${firstPart.text}`;
                        }
                    }
                }
            }

            if (history.length === 0) throw new Error('History cannot be empty');
            const lastMessage = history[history.length - 1];
            if (!lastMessage || lastMessage.role !== 'user') throw new Error('Last message must be from user');

            const model = this.getModel({
                fileSearchStoreId: context?.fileSearchStoreId,
                temperature: context?.temperature,
                modelName: context?.aiModel
            });
            const chatObject = model.startChat({
                history: geminiHistory,
                generationConfig: {
                    maxOutputTokens: 8192,
                    temperature: context?.temperature || GEMINI_CONFIG.GENERATION_CONFIG.temperature
                },
            });

            let messageToSend = lastMessage.content;
            if (geminiHistory.length === 0) {
                messageToSend = `${systemPrompt}\n\n${messageToSend}`;
            }

            const result = await chatObject.sendMessageStream(messageToSend);
            let fullText = '';
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullText += chunkText;
                // Strip any leaked tool-call syntax before each
                // incremental UI render so the user never sees the
                // leak mid-stream either.
                onChunk(sanitizeChatResponseText(fullText));
            }
            return sanitizeChatResponseText(fullText);
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async refineContent(content: string, instruction: string, context?: any, language: SupportedLanguage = DEFAULT_LANGUAGE): Promise<string> {
        try {
            let librarySection = '';
            if (context?.cachedResources && context.cachedResources.length > 0) {
                const resourcesList = context.cachedResources.map((r: any) => `- ${r.title} (${r.author})`).join('\n');
                librarySection = language === 'en'
                    ? `
## 📚 FULL ACCESS TO PASTOR'S LIBRARY:
You have access to the FULL CONTENT of these books in your context:
${resourcesList}
WHENEVER you use information from these books, CITE the source (Author, Title).
`
                    : `
## 📚 ACCESO COMPLETO A BIBLIOTECA DEL PASTOR:
Tienes acceso al CONTENIDO COMPLETO de estos libros en tu contexto:
${resourcesList}
SIEMPRE que uses información de estos libros, CITÁ la fuente (Autor, Título).
`;
            }

            const promptBody = language === 'en'
                ? `ACT AS AN EXPERT EDITOR AND THEOLOGIAN.
Your task is to refine the following content per the provided instructions.

ORIGINAL CONTENT:
${content}

REFINEMENT INSTRUCTIONS:
${instruction}
${librarySection}

RULES:
1. Preserve the JSON or Markdown format.
2. Be precise and theologically faithful.
3. Cite sources.
`
                : `ACTÚA COMO UN EDITOR Y TEÓLOGO EXPERTO.
Tu tarea es refinar el siguiente contenido según las instrucciones proporcionadas.

CONTENIDO ORIGINAL:
${content}

INSTRUCCIONES DE REFINAMIENTO:
${instruction}
${librarySection}

REGLAS:
1. Mantén el formato JSON o Markdown.
2. Sé preciso y teológicamente fiel.
3. Cita fuentes.
`;
            const directive = language === 'en'
                ? 'IMPORTANT: Respond entirely in English.'
                : 'IMPORTANTE: Responde completamente en español.';
            const prompt = `${directive}\n\n${promptBody}`;
            const model = this.getModel({
                fileSearchStoreId: context?.fileSearchStoreId,
                temperature: context?.temperature,
                modelName: context?.aiModel
            });
            const preparedContent = prompt;
            const result = await model.generateContent(preparedContent);
            const response = result.response;
            return response.text();
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Escapes unescaped control characters within JSON string values.
     * This handles cases where the AI generates literal newlines, tabs, etc. in JSON.
     */
    private escapeControlCharsInJson(jsonString: string): string {
        let result = '';
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < jsonString.length; i++) {
            const char = jsonString[i];
            const prev = i > 0 ? jsonString[i - 1] : '';

            if (escapeNext) {
                // Already escaped, keep as is
                result += char;
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                escapeNext = true;
                result += char;
                continue;
            }

            if (char === '"' && prev !== '\\') {
                inString = !inString;
                result += char;
                continue;
            }

            if (inString) {
                // Replace control characters with their escaped equivalents
                switch (char) {
                    case '\n':
                        result += '\\n';
                        break;
                    case '\r':
                        result += '\\r';
                        break;
                    case '\t':
                        result += '\\t';
                        break;
                    case '\b':
                        result += '\\b';
                        break;
                    case '\f':
                        result += '\\f';
                        break;
                    default:
                        result += char;
                }
            } else {
                result += char;
            }
        }

        return result;
    }

    private cleanJsonResponse(text: string): string {
        // Remove markdown code blocks
        let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // Find the first '{'
        const firstBrace = cleaned.indexOf('{');
        if (firstBrace === -1) return '{}'; // No JSON found

        cleaned = cleaned.substring(firstBrace);

        // CRITICAL FIX: Escape unescaped control characters within JSON strings
        // This fixes "Bad control character in string literal" errors
        cleaned = this.escapeControlCharsInJson(cleaned);

        // Try to parse as is
        try {
            JSON.parse(cleaned);
            return cleaned;
        } catch (e) {
            // If it fails, it might have trailing text after valid JSON
            // Use bracket balancing to find where the JSON actually ends

            let depth = 0;
            let inStr = false;
            let esc = false;
            let jsonEnd = -1;

            for (let i = 0; i < cleaned.length; i++) {
                const char = cleaned[i];

                if (esc) {
                    esc = false;
                    continue;
                }

                if (char === '\\' && inStr) {
                    esc = true;
                    continue;
                }

                if (char === '"') {
                    inStr = !inStr;
                    continue;
                }

                if (!inStr) {
                    if (char === '{') {
                        depth++;
                    } else if (char === '}') {
                        depth--;
                        if (depth === 0) {
                            jsonEnd = i;
                            break; // Found the end of the root object
                        }
                    }
                }
            }

            if (jsonEnd !== -1) {
                const candidate = cleaned.substring(0, jsonEnd + 1);
                try {
                    JSON.parse(candidate);
                    return candidate;
                } catch (e2) {
                    // Continue to fallback
                }
            }

            // Fallback: Try to find the last '}'

            // 2. Simple repair for truncated JSON (common in large generations)
            // This is a basic heuristic: try closing open braces/brackets
            // A proper parser would be better, but this catches common truncation cases
            const stack: string[] = [];
            let inString = false;
            let escape = false;

            for (const char of cleaned) {
                if (escape) {
                    escape = false;
                    continue;
                }
                if (char === '\\') {
                    escape = true;
                    continue;
                }
                if (char === '"') {
                    inString = !inString;
                    continue;
                }
                if (!inString) {
                    if (char === '{') stack.push('}');
                    else if (char === '[') stack.push(']');
                    else if (char === '}') {
                        if (stack.length > 0 && stack[stack.length - 1]! === '}') stack.pop();
                    }
                    else if (char === ']') {
                        if (stack.length > 0 && stack[stack.length - 1]! === ']') stack.pop();
                    }
                }
            }

            // Append missing closing characters
            let repaired = cleaned;
            // If we are inside a string, close it first
            if (inString) repaired += '"';

            // Close remaining structures in reverse order
            while (stack.length > 0) {
                repaired += stack.pop();
            }

            try {
                JSON.parse(repaired);
                return repaired;
            } catch (e) {
                console.error('Failed to repair JSON:', e);
                // Return original cleaned string to let the main parser throw the error
                // so we can see the original issue in logs
                return cleaned;
            }
        }
    }

    private handleError(error: any): Error {
        const errorMessage = error.message || error.toString();
        if (errorMessage.includes('API_KEY')) return new Error('API key de Gemini inválida');
        if (errorMessage.includes('quota')) return new Error('Límite de cuota excedido');
        return new Error(`Error en generación de sermón: ${errorMessage}`);
    }

    async generateHomileticsPreview(
        exegesis: ExegeticalStudy,
        rules: GenerationRules,
        _config?: any,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
    ): Promise<import('@dosfilos/domain').HomileticalApproachPreview[]> {
        try {
            const { HomileticsPreviewPromptBuilder } = await import('./prompts/HomileticsPreviewPromptBuilder');
            const directive = language === 'en'
                ? 'IMPORTANT: Respond entirely in English. Field values inside any JSON output must also be in English.\n\n'
                : '';
            const prompt = directive + new HomileticsPreviewPromptBuilder()
                .withExegesis(exegesis)
                .withRules(rules)
                .build();

            const model = this.getModel({
                fileSearchStoreId: _config?.fileSearchStoreId,
                temperature: _config?.temperature,
                modelName: _config?.aiModel,
                responseMimeType: 'application/json'
            });
            const content = prompt;
            const result = await model.generateContent(content);
            const response = result.response;
            const text = response.text();
            const parsed = JSON.parse(this.cleanJsonResponse(text));
            // ... (keep parsing logic) ...
            const previews: import('@dosfilos/domain').HomileticalApproachPreview[] = Array.isArray(parsed.homileticalApproaches)
                ? parsed.homileticalApproaches.map((approach: any) => ({
                    id: approach.id || `${approach.type}-${Math.random().toString(36).substring(7)}`,
                    type: approach.type,
                    direction: approach.direction || '',
                    tone: approach.tone || 'conversacional',
                    purpose: approach.purpose || '',
                    suggestedStructure: approach.suggestedStructure || '',
                    targetAudience: approach.targetAudience || 'Congregación general',
                    rationale: approach.rationale || ''
                }))
                : [];

            if (previews.length === 0) throw new Error('No se generaron vistas previas de enfoques válidos');
            return previews;
        } catch (error: any) {
            console.error('❌ [Phase 1] Error generating approach previews:', error);
            throw this.handleError(error);
        }
    }

    async developSelectedApproach(
        exegesis: ExegeticalStudy,
        selectedPreview: import('@dosfilos/domain').HomileticalApproachPreview,
        rules: GenerationRules,
        _config?: any,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
    ): Promise<import('@dosfilos/domain').HomileticalApproach> {
        try {
            const { ApproachDevelopmentPromptBuilder } = await import('./prompts/ApproachDevelopmentPromptBuilder');
            const directive = language === 'en'
                ? 'IMPORTANT: Respond entirely in English. Field values inside any JSON output must also be in English.\n\n'
                : '';
            const prompt = directive + new ApproachDevelopmentPromptBuilder()
                .withExegesis(exegesis)
                .withSelectedPreview(selectedPreview)
                .withRules(rules)
                .build();

            const model = this.getModel({
                fileSearchStoreId: _config?.fileSearchStoreId,
                temperature: _config?.temperature,
                modelName: _config?.aiModel,
                responseMimeType: 'application/json'
            });
            const content = prompt;

            const result = await model.generateContent(content);
            const response = result.response;
            const text = response.text();
            const parsed = JSON.parse(this.cleanJsonResponse(text));

            // ... (keep parsing logic) ...
            const fullApproach: import('@dosfilos/domain').HomileticalApproach = {
                id: selectedPreview.id,
                type: selectedPreview.type,
                direction: selectedPreview.direction,
                tone: selectedPreview.tone,
                purpose: selectedPreview.purpose,
                suggestedStructure: selectedPreview.suggestedStructure,
                targetAudience: selectedPreview.targetAudience,
                rationale: selectedPreview.rationale,
                homileticalProposition: parsed.homileticalProposition || '',
                outlinePreview: Array.isArray(parsed.outlinePreview) ? parsed.outlinePreview : undefined,
                contemporaryApplication: Array.isArray(parsed.contemporaryApplication) ? parsed.contemporaryApplication : [],
                outline: parsed.outline || { mainPoints: [] }
            };

            if (!fullApproach.homileticalProposition || !fullApproach.outline.mainPoints || fullApproach.outline.mainPoints.length === 0) {
                throw new Error('El enfoque desarrollado está incompleto');
            }
            return fullApproach;
        } catch (error: any) {
            console.error(`❌ [Phase 2] Error developing approach ${selectedPreview.id}:`, error);
            throw this.handleError(error);
        }
    }
}

/**
 * Strips Gemini tool-call syntax that occasionally leaks into the
 * response text. When the model is given the `fileSearch` tool, it can
 * emit a Python-style invocation (`print(file_search.query("…"))` or
 * raw `file_search.query(...)` lines) as plain text instead of as a
 * function-call part. The SDK then concatenates that into `.text()`
 * and the user sees the leaked code at the top of the assistant
 * reply.
 *
 * Surfaced 2026-05-21 in prod: user asked "que relación tiene Juan
 * 1:1 con Génesis 1:1?" in the exegesis chat and the response opened
 * with `print(file_search.query("relaci...` before the actual pastoral
 * reply. Until the root cause (SDK / tool-registration mismatch) is
 * fixed, this defensive scrub keeps the user surface clean.
 *
 * Patterns matched (only at the START of the response — trailing
 * mentions inside legitimate prose are left alone):
 *   - `print(file_search.query(…))` with or without surrounding code
 *     fences and trailing newlines.
 *   - Bare `file_search.query(…)` / `default_api.file_search.query(…)`
 *     lines.
 *   - Markdown code fences wrapping either of the above.
 */
export function sanitizeChatResponseText(text: string): string {
    if (!text) return text;
    let result = text;
    // Strip a leading fenced code block when its body is just a
    // tool-call invocation. Up to ~3 leading blocks are peeled in
    // case the model wraps + repeats.
    for (let i = 0; i < 3; i++) {
        const codeFenceMatch = result.match(/^\s*```[\w-]*\s*\n([\s\S]*?)```\s*\n*/);
        if (codeFenceMatch && /(?:default_api\.)?(?:print\s*\(\s*)?(?:default_api\.)?file_search\.(?:query|search)/i.test(codeFenceMatch[1] ?? '')) {
            result = result.slice(codeFenceMatch[0].length);
            continue;
        }
        // Bare leading `print(file_search…)` / `file_search.query(…)`
        // line(s) — peel as long as the next line still matches.
        const bareMatch = result.match(/^\s*(?:print\s*\(\s*)?(?:default_api\.)?file_search\.(?:query|search)\s*\([\s\S]*?\)\s*\)?\s*\n*/i);
        if (bareMatch) {
            result = result.slice(bareMatch[0].length);
            continue;
        }
        break;
    }
    return result.trimStart();
}
