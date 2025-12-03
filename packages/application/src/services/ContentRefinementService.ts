import {
    ExegeticalStudy,
    HomileticalAnalysis,
    SermonContent,
    ContentType
} from '@dosfilos/domain';
import { GeminiSermonGenerator } from '@dosfilos/infrastructure';

export interface RefinementRequest {
    instruction: string;
    selectedText?: string;
    context?: Record<string, any>;
}

export interface RefinementResponse {
    refinedContent: any;
    explanation?: string;
    changes?: string[];
}

export class ContentRefinementService {
    private generator: GeminiSermonGenerator;

    constructor() {
        const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('Gemini API key not configured. Refinement features will be disabled.');
        }
        this.generator = new GeminiSermonGenerator(apiKey || '');
    }

    /**
     * Refine exegetical study content
     */
    async refineExegesis(
        exegesis: ExegeticalStudy,
        request: RefinementRequest
    ): Promise<RefinementResponse> {
        const prompt = this.buildExegesisPrompt(exegesis, request);

        try {
            // Create a simple chat history with the user's request
            const history = [
                {
                    id: Date.now().toString(),
                    role: 'user' as const,
                    content: prompt,
                    timestamp: new Date()
                }
            ];

            // Use the chat method with EXEGESIS phase
            const response = await this.generator.chat('EXEGESIS' as any, history, { exegesis });

            return {
                refinedContent: exegesis, // For now, return original
                explanation: response,
                changes: []
            };
        } catch (error) {
            console.error('Error refining exegesis:', error);
            throw new Error('No se pudo refinar la exégesis. Por favor intenta de nuevo.');
        }
    }

    /**
     * Refine homiletical analysis content
     */
    async refineHomiletics(
        homiletics: HomileticalAnalysis,
        request: RefinementRequest
    ): Promise<RefinementResponse> {
        const prompt = this.buildHomileticsPrompt(homiletics, request);

        try {
            const history = [
                {
                    id: Date.now().toString(),
                    role: 'user' as const,
                    content: prompt,
                    timestamp: new Date()
                }
            ];

            const response = await this.generator.chat('HOMILETICS' as any, history, { homiletics });

            return {
                refinedContent: homiletics,
                explanation: response,
                changes: []
            };
        } catch (error) {
            console.error('Error refining homiletics:', error);
            throw new Error('No se pudo refinar el análisis homilético. Por favor intenta de nuevo.');
        }
    }

    /**
     * Refine sermon content
     */
    async refineSermon(
        sermon: SermonContent,
        request: RefinementRequest
    ): Promise<RefinementResponse> {
        const prompt = this.buildSermonPrompt(sermon, request);

        try {
            const history = [
                {
                    id: Date.now().toString(),
                    role: 'user' as const,
                    content: prompt,
                    timestamp: new Date()
                }
            ];

            const response = await this.generator.chat('SERMON_DRAFT' as any, history, { sermon });

            return {
                refinedContent: sermon,
                explanation: response,
                changes: []
            };
        } catch (error) {
            console.error('Error refining sermon:', error);
            throw new Error('No se pudo refinar el sermón. Por favor intenta de nuevo.');
        }
    }

    /**
     * Generic refinement method
     */
    async refineContent<T>(
        content: T,
        contentType: ContentType,
        request: RefinementRequest
    ): Promise<RefinementResponse> {
        switch (contentType) {
            case 'exegesis':
                return this.refineExegesis(content as ExegeticalStudy, request);
            case 'homiletics':
                return this.refineHomiletics(content as HomileticalAnalysis, request);
            case 'sermon':
                return this.refineSermon(content as SermonContent, request);
            default:
                throw new Error(`Tipo de contenido no soportado: ${contentType}`);
        }
    }

    // Private helper methods for building prompts

    private buildExegesisPrompt(exegesis: ExegeticalStudy, request: RefinementRequest): string {
        const baseContext = `
Eres un asistente experto en exégesis bíblica. Tienes el siguiente estudio exegético:

Pasaje: ${exegesis.passage}
Contexto Histórico: ${exegesis.context.historical}
Contexto Literario: ${exegesis.context.literary}
Audiencia Original: ${exegesis.context.audience}
Proposición Exegética: ${exegesis.exegeticalProposition}
Insights Pastorales: ${exegesis.pastoralInsights.join(', ')}
`;

        const selectedContext = request.selectedText
            ? `\n\nTexto seleccionado por el usuario: "${request.selectedText}"`
            : '';

        return `${baseContext}${selectedContext}

Solicitud del usuario: ${request.instruction}

Por favor, proporciona una sugerencia de refinamiento específica y concreta. 

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto:
{
  "suggestion": "tu sugerencia de mejora aquí (puede ser texto largo con múltiples párrafos)"
}

No incluyas ningún texto antes o después del JSON. Solo el objeto JSON.`;
    }

    private buildHomileticsPrompt(homiletics: HomileticalAnalysis, request: RefinementRequest): string {
        const baseContext = `
Eres un asistente experto en homilética. Tienes el siguiente análisis homilético:

Proposición Homilética: ${homiletics.homileticalProposition}
Enfoque: ${homiletics.homileticalApproach}
Puntos Principales: ${homiletics.outline.mainPoints.map(p => p.title).join(', ')}
Aplicaciones Contemporáneas: ${homiletics.contemporaryApplication.join(', ')}
`;

        const selectedContext = request.selectedText
            ? `\n\nTexto seleccionado: "${request.selectedText}"`
            : '';

        return `${baseContext}${selectedContext}

Solicitud: ${request.instruction}

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto:
{
  "suggestion": "tu sugerencia de mejora aquí (puede ser texto largo con múltiples párrafos)"
}

No incluyas ningún texto antes o después del JSON. Solo el objeto JSON.`;
    }

    private buildSermonPrompt(sermon: SermonContent, request: RefinementRequest): string {
        const baseContext = `
Eres un asistente experto en redacción de sermones. Tienes el siguiente sermón:

Título: ${sermon.title}
Introducción: ${sermon.introduction}
Puntos: ${sermon.body.map(p => p.point).join(', ')}
Conclusión: ${sermon.conclusion}
`;

        const selectedContext = request.selectedText
            ? `\n\nTexto seleccionado: "${request.selectedText}"`
            : '';

        return `${baseContext}${selectedContext}

Solicitud: ${request.instruction}

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto:
{
  "suggestion": "tu sugerencia detallada aquí (puede ser texto largo con múltiples párrafos)"
}

No incluyas ningún texto antes o después del JSON. Solo el objeto JSON.`;
    }

    isAvailable(): boolean {
        return !!(import.meta as any).env.VITE_GEMINI_API_KEY;
    }
}

export const contentRefinementService = new ContentRefinementService();
