import { runLlmPrompt } from '../llm/callableLlm';
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

    /**
     * Sin apiKey: la generación sale por el proxy del servidor, que autentica,
     * limita por usuario y mide el gasto. Los umbrales de seguridad explícitos
     * que traía esta clase viajan como `safety: 'standard'` para no cambiar el
     * filtrado del modelo por accidente.
     */
    constructor() {}

    async generateSermon(options: GenerateSermonOptions): Promise<GeneratedSermonContent> {
        try {
            console.log('[GeminiAI] Generating sermon with options:', options);
            const prompt = buildSermonPrompt(options);
            console.log('[GeminiAI] Sending request to Gemini API...');
            const rawText = await runLlmPrompt({
                feature: 'sermon.generateSermon',
                prompt: prompt,
                model: GEMINI_CONFIG.MODEL_NAME,
                safety: 'standard',
            });
            const text = rawText;
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
            const rawText = await runLlmPrompt({
                feature: 'sermon.generateOutline',
                prompt: prompt,
                model: GEMINI_CONFIG.MODEL_NAME,
                safety: 'standard',
            });
            const text = rawText;

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
            const rawText = await runLlmPrompt({
                feature: 'sermon.expandSection',
                prompt: prompt,
                model: GEMINI_CONFIG.MODEL_NAME,
                safety: 'standard',
            });
            return rawText;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async suggestBibleReferences(topic: string, count: number = 5): Promise<string[]> {
        try {
            const prompt = buildBibleReferencesPrompt(topic, count);
            const rawText = await runLlmPrompt({
                feature: 'sermon.suggestReferences',
                prompt: prompt,
                model: GEMINI_CONFIG.MODEL_NAME,
                safety: 'standard',
            });
            const text = rawText;

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
            const rawText = await runLlmPrompt({
                feature: 'sermon.refineContent',
                prompt: prompt,
                model: GEMINI_CONFIG.MODEL_NAME,
                safety: 'standard',
            });
            return rawText;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    async generateTitleSuggestions(topic: string, count: number = 5): Promise<string[]> {
        try {
            const prompt = buildTitleSuggestionsPrompt(topic, count);
            const rawText = await runLlmPrompt({
                feature: 'sermon.titleSuggestions',
                prompt: prompt,
                model: GEMINI_CONFIG.MODEL_NAME,
                safety: 'standard',
            });
            const text = rawText;

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
            const rawText = await runLlmPrompt({
                feature: 'sermon.validateContext',
                prompt: prompt,
                model: GEMINI_CONFIG.MODEL_NAME,
                safety: 'standard',
            });
            const text = rawText;
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
