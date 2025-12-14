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

    private getModel(cacheName?: string): GenerativeModel {
        if (cacheName) {
            return this.genAI.getGenerativeModel({
                model: GEMINI_CONFIG.MODEL_NAME,
                // @ts-ignore
                cachedContent: cacheName,
                generationConfig: GEMINI_CONFIG.GENERATION_CONFIG,
                safetySettings: this.getSafetySettings()
            });
        }
        return this.model;
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

    // 🎯 NEW: Helper to combine prompt with file URIs (Multimodal RAG)
    private prepareContent(prompt: string, config?: any): any {
        // If cacheName is present, we rely on the cache (no need to send files again)
        if (config?.cacheName) {
            return prompt;
        }

        // If no cache but we have geminiUris (fallback mode), send them!
        if (config?.geminiUris && Array.isArray(config.geminiUris) && config.geminiUris.length > 0) {
            return [
                prompt,
                ...config.geminiUris.map((uri: string) => ({
                    fileData: {
                        mimeType: 'application/pdf',
                        fileUri: uri
                    }
                }))
            ];
        }

        return prompt;
    }

    async generateExegesis(passage: string, rules: GenerationRules, config?: any): Promise<ExegeticalStudy> {
        try {
            const prompt = buildExegesisPrompt(passage, rules, config);
            const model = this.getModel(config?.cacheName);
            const content = this.prepareContent(prompt, config); // 🎯 Use prepared content
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

            const model = this.getModel(_config?.cacheName);
            const content = this.prepareContent(prompt, _config); // 🎯 Use prepared content
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
            const model = this.getModel(_config?.cacheName);
            const content = this.prepareContent(prompt, _config); // 🎯 Use prepared content
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
            const prompt = `TEST`; // (Prompt building logic omitted for brevity, keeping original logic if possible or simplified)
            // ... wait, I need to keep the full prompt string construction ...
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
            const model = this.getModel(context?.cacheName);
            const content = this.prepareContent(fullPrompt, context); // 🎯 Use prepared content
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
            // ... (keep start of method) ...
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

            const model = this.getModel(context?.cacheName);
            const chat = model.startChat({
                history: geminiHistory,
                generationConfig: { maxOutputTokens: 8192 },
            });

            let messageToSend = lastMessage.content;
            if (geminiHistory.length === 0) {
                messageToSend = `${systemPrompt}\n\n${messageToSend}`;
            }

            // 🎯 NEW: Attach files to the LAST message if available (and no cache)
            // Note: In chat, we can pass parts to sendMessage
            let contentToSend: any = messageToSend;
            if (!context?.cacheName && context?.geminiUris && context.geminiUris.length > 0) {
                contentToSend = [
                    messageToSend,
                    ...context.geminiUris.map((uri: string) => ({
                        fileData: { mimeType: 'application/pdf', fileUri: uri }
                    }))
                ];
            }

            const result = await chat.sendMessage(contentToSend);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async refineContent(content: string, instruction: string, context?: any): Promise<string> {
        try {
            // ... (keep librarySection logic) ...
            let librarySection = '';
            if (context?.cachedResources && context.cachedResources.length > 0) {
                const resourcesList = context.cachedResources.map((r: any) => `- ${r.title} (${r.author})`).join('\n');
                librarySection = `\n## 📚 ACCESO COMPLETO A BIBLIOTECA DEL PASTOR (VÍA CACHÉ O ARCHIVOS):\n...\n${resourcesList}\n...`; // Simplified for replacement
            }
            // Actually, I should keep the full string to avoid breaking.
            // But since I'm replacing the whole method, I can reconstruct it.
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
            const model = this.getModel(context?.cacheName);
            const preparedContent = this.prepareContent(prompt, context); // 🎯 Use prepared content
            const result = await model.generateContent(preparedContent);
            const response = result.response;
            return response.text();
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    private cleanJsonResponse(text: string): string {
        // Remove markdown code blocks
        let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // Find the first '{'
        const firstBrace = cleaned.indexOf('{');
        if (firstBrace === -1) return '{}'; // No JSON found

        cleaned = cleaned.substring(firstBrace);

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

            const model = this.getModel(_config?.cacheName);
            const content = this.prepareContent(prompt, _config); // 🎯 Use prepared content
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

            // Note: Caching logic for Phase 2 is currently disabled or uses _config.cacheName?
            // The existing code manually disabled cache for phase 2.
            // I should respect that, but if _config has files, I must attach them!
            // Wait, existing code said: `const model = this.getModel(); // No cacheName = fresh model`
            // So I should pass the files if available!
            const model = this.getModel(); // Fresh model
            const content = this.prepareContent(prompt, _config); // 🎯 Use prepared content (attach files again)

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
