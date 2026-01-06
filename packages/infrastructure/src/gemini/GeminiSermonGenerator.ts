import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from '@google/generative-ai';
import {
    ISermonGenerator,
    GenerationRules,
    ExegeticalStudy,
    HomileticalAnalysis,
    SermonContent,
    ChatMessage,
    WorkflowPhase
} from '@dosfilos/domain';
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

    private getModel(options?: { fileSearchStoreId?: string; temperature?: number; modelName?: string; responseMimeType?: string }): GenerativeModel {
        const modelName = options?.modelName || GEMINI_CONFIG.MODEL_NAME;
        const temperature = options?.temperature ?? GEMINI_CONFIG.GENERATION_CONFIG.temperature;

        const generationConfig: any = {
            ...GEMINI_CONFIG.GENERATION_CONFIG,
            temperature: temperature
        };

        if (options?.responseMimeType && !options.fileSearchStoreId) {
            // NOTE: Gemini API throws 400 if responseMimeType is used with Tools (File Search)
            // So we only enable JSON mode if NOT using RAG tools.
            generationConfig.responseMimeType = options.responseMimeType;
        }

        // Priority 1: Use File Search Store (Core Library)
        if (options?.fileSearchStoreId) {
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

    async generateExegesis(passage: string, rules: GenerationRules, config?: any): Promise<ExegeticalStudy> {
        try {
            const prompt = buildExegesisPrompt(passage, rules, config);

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
        _config?: any
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
        _config?: any
    ): Promise<SermonContent> {
        try {
            const prompt = buildSermonDraftPrompt(analysis, rules);
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
            return {
                title: parsed.title || 'Sin Título',
                introduction: parsed.introduction || '',
                body: Array.isArray(parsed.body) ? parsed.body : [],
                conclusion: parsed.conclusion || '',
                callToAction: parsed.callToAction || '',
                ragSources: Array.isArray(parsed.ragSources) ? parsed.ragSources : undefined
            };
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async regenerateSermonPoint(
        point: any,
        rules: GenerationRules,
        context: any
    ): Promise<any> {
        try {
            const fullPrompt = `
${buildChatSystemPrompt(WorkflowPhase.DRAFTING, context)}

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

    async chat(phase: WorkflowPhase, history: ChatMessage[], context: any): Promise<string> {
        try {
            const systemPrompt = buildChatSystemPrompt(phase, context);
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
            return response.text();
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async refineContent(content: string, instruction: string, context?: any): Promise<string> {
        try {
            let librarySection = '';
            if (context?.cachedResources && context.cachedResources.length > 0) {
                const resourcesList = context.cachedResources.map((r: any) => `- ${r.title} (${r.author})`).join('\n');
                librarySection = `
## 📚 ACCESO COMPLETO A BIBLIOTECA DEL PASTOR:
Tienes acceso al CONTENIDO COMPLETO de estos libros en tu contexto:
${resourcesList}
SIEMPRE que uses información de estos libros, CITÁ la fuente (Autor, Título).
`;
            }

            const prompt = `
ACTÚA COMO UN EDITOR Y TEÓLOGO EXPERTO.
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
        _config?: any
    ): Promise<import('@dosfilos/domain').HomileticalApproachPreview[]> {
        try {
            const { HomileticsPreviewPromptBuilder } = await import('./prompts/HomileticsPreviewPromptBuilder');
            const prompt = new HomileticsPreviewPromptBuilder()
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
        _config?: any
    ): Promise<import('@dosfilos/domain').HomileticalApproach> {
        try {
            const { ApproachDevelopmentPromptBuilder } = await import('./prompts/ApproachDevelopmentPromptBuilder');
            const prompt = new ApproachDevelopmentPromptBuilder()
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
