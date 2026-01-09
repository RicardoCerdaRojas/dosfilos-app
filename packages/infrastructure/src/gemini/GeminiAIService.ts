import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import {
    IAIService,
    GenerateSermonOptions,
    GeneratedSermonContent,
} from '@dosfilos/domain';
import {
    buildSermonPrompt,
    buildOutlinePrompt,
    buildExpandSectionPrompt,
    buildBibleReferencesPrompt,
    buildRefineContentPrompt,
    buildTitleSuggestionsPrompt,
    buildContextValidationPrompt,
} from './prompts';

import { GEMINI_CONFIG } from './config';

export class GeminiAIService implements IAIService {
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

    async generateSermon(options: GenerateSermonOptions): Promise<GeneratedSermonContent> {
        try {
            console.log('[GeminiAI] Generating sermon with options:', options);
            const prompt = buildSermonPrompt(options);
            console.log('[GeminiAI] Sending request to Gemini API...');
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            console.log('[GeminiAI] Received response from Gemini');

            // Parse JSON response
            const cleanedText = this.cleanJsonResponse(text);
            const sermon = JSON.parse(cleanedText);

            return {
                title: sermon.title || 'Sermón sin título',
                introduction: sermon.introduction,
                mainPoints: sermon.mainPoints || [],
                conclusion: sermon.conclusion,
                callToAction: sermon.callToAction,
                suggestedBibleReferences: sermon.suggestedBibleReferences || [],
                suggestedTags: sermon.suggestedTags || [],
            };
        } catch (error: any) {
            console.error('[GeminiAI] Error generating sermon:', error);
            console.error('[GeminiAI] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
            });
            throw this.handleError(error);
        }
    }

    async generateSermonOutline(
        options: GenerateSermonOptions
    ): Promise<{ title: string; mainPoints: string[]; suggestedReferences: string[] }> {
        try {
            const prompt = buildOutlinePrompt(options);
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            const cleanedText = this.cleanJsonResponse(text);
            const outline = JSON.parse(cleanedText);

            return {
                title: outline.title || 'Esquema de sermón',
                mainPoints: outline.mainPoints || [],
                suggestedReferences: outline.suggestedReferences || [],
            };
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async expandSection(
        sectionTitle: string,
        context: string,
        bibleReferences?: string[]
    ): Promise<string> {
        try {
            const prompt = buildExpandSectionPrompt(sectionTitle, context, bibleReferences);
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            return response.text();
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async suggestBibleReferences(topic: string, count: number = 5): Promise<string[]> {
        try {
            const prompt = buildBibleReferencesPrompt(topic, count);
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            const cleanedText = this.cleanJsonResponse(text);
            const references = JSON.parse(cleanedText);

            return Array.isArray(references) ? references : [];
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async refineContent(content: string, instructions?: string): Promise<string> {
        try {
            const prompt = buildRefineContentPrompt(content, instructions);
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            return response.text();
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async generateTitleSuggestions(topic: string, count: number = 5): Promise<string[]> {
        try {
            const prompt = buildTitleSuggestionsPrompt(topic, count);
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            const cleanedText = this.cleanJsonResponse(text);
            const titles = JSON.parse(cleanedText);

            return Array.isArray(titles) ? titles : [];
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async validateContext(message: string, context?: string): Promise<{ isValid: boolean; refusalMessage?: string }> {
        try {
            console.log('[GeminiAI] Validating context for message:', message);
            const prompt = buildContextValidationPrompt(message, context);
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            console.log('[GeminiAI] Validation raw response:', text);

            const cleanedText = this.cleanJsonResponse(text);
            const validation = JSON.parse(cleanedText);
            console.log('[GeminiAI] Validation parsed result:', validation);

            return {
                isValid: validation.isValid,
                refusalMessage: validation.refusalMessage
            };
        } catch (error: any) {
            console.error('[GeminiAI] Error validating context:', error);
            // If validation fails, default to allowing the message but log the error
            // This prevents blocking the user due to AI service errors
            return { isValid: true };
        }
    }


    /**
     * Clean JSON response by removing markdown code blocks and extra whitespace
     */
    private cleanJsonResponse(text: string): string {
        // Remove markdown code blocks
        let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // Remove leading/trailing whitespace
        cleaned = cleaned.trim();

        return cleaned;
    }

    /**
     * Handle and translate Gemini API errors
     */
    private handleError(error: any): Error {
        const errorMessage = error.message || error.toString();

        if (errorMessage.includes('API_KEY') || errorMessage.includes('API key')) {
            return new Error('API key de Gemini no configurada o inválida');
        }

        if (errorMessage.includes('RATE_LIMIT') || errorMessage.includes('quota')) {
            return new Error('Límite de uso de IA excedido. Intenta de nuevo en unos minutos');
        }

        if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
            return new Error('Contenido bloqueado por filtros de seguridad de IA');
        }

        if (errorMessage.includes('JSON')) {
            return new Error('Error al procesar la respuesta de IA. Intenta de nuevo');
        }

        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            return new Error('Error de conexión con el servicio de IA');
        }

        return new Error(`Error al generar contenido con IA: ${errorMessage}`);
    }
}
