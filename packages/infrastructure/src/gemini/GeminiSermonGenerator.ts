import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
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
    buildHomileticsPrompt,
    buildSermonDraftPrompt,
    buildChatSystemPrompt
} from './prompts-generator';

import { GEMINI_CONFIG } from './config';

export class GeminiSermonGenerator implements ISermonGenerator {
    private genAI: GoogleGenerativeAI;
    private model;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        const modelName = GEMINI_CONFIG.MODEL_NAME;

        this.model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: GEMINI_CONFIG.GENERATION_CONFIG,
            safetySettings: [
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
            ],
        });
    }

    async generateExegesis(passage: string, rules: GenerationRules, config?: any): Promise<ExegeticalStudy> {
        try {
            const prompt = buildExegesisPrompt(passage, rules, config);
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            const parsed = JSON.parse(this.cleanJsonResponse(text));

            // Map to new executive summary schema
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
                pastoralInsights: Array.isArray(parsed.pastoralInsights) ? parsed.pastoralInsights : []
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
            const prompt = buildHomileticsPrompt(exegesis, rules);
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            const parsed = JSON.parse(this.cleanJsonResponse(text));
            // Ensure the exegetical study is attached to the result if not returned by AI
            return {
                homileticalApproach: parsed.homileticalApproach || 'expository',
                contemporaryApplication: Array.isArray(parsed.contemporaryApplication) ? parsed.contemporaryApplication : [],
                homileticalProposition: parsed.homileticalProposition || '',
                outline: parsed.outline || { mainPoints: [] },
                exegeticalStudy: exegesis,
            };
        } catch (error: any) {
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
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            const parsed = JSON.parse(this.cleanJsonResponse(text));
            return {
                title: parsed.title || 'Sin Título',
                introduction: parsed.introduction || '',
                body: Array.isArray(parsed.body) ? parsed.body : [],
                conclusion: parsed.conclusion || '',
                callToAction: parsed.callToAction || ''
            };
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async chat(phase: WorkflowPhase, history: ChatMessage[], context: any): Promise<string> {
        try {
            const systemPrompt = buildChatSystemPrompt(phase, context);

            // Convert history to Gemini format
            const geminiHistory = history.slice(0, -1).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

            // Inject system prompt into the first message of history if it exists
            if (geminiHistory.length > 0 && geminiHistory[0].role === 'user') {
                const parts = geminiHistory[0].parts;
                if (parts && parts.length > 0 && parts[0]) {
                    parts[0].text = `${systemPrompt}\n\n${parts[0].text}`;
                }
            }

            if (history.length === 0) {
                throw new Error('History cannot be empty');
            }
            const lastMessage = history[history.length - 1];
            if (!lastMessage || lastMessage.role !== 'user') {
                throw new Error('Last message must be from user');
            }

            const chat = this.model.startChat({
                history: geminiHistory,
                generationConfig: {
                    maxOutputTokens: 2048,
                },
            });

            // If history is empty (first turn), prepend system prompt to the message
            let messageToSend = lastMessage.content;
            if (geminiHistory.length === 0) {
                messageToSend = `${systemPrompt}\n\n${messageToSend}`;
            }

            const result = await chat.sendMessage(messageToSend);
            const response = await result.response;
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
            // If it fails, it might be truncated or have trailing text

            // 1. Try to find the last '}'
            const lastBrace = cleaned.lastIndexOf('}');
            if (lastBrace !== -1) {
                const candidate = cleaned.substring(0, lastBrace + 1);
                try {
                    JSON.parse(candidate);
                    return candidate;
                } catch (e) {
                    // Continue to repair attempts
                }
            }

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
}
