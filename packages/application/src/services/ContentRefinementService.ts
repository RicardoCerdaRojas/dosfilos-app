import {
    ExegeticalStudy,
    HomileticalAnalysis,
    SermonContent,
    ContentType,
    LibraryResourceEntity,
    DocumentChunkEntity
} from '@dosfilos/domain';
import { GeminiSermonGenerator, DocumentProcessingService } from '@dosfilos/infrastructure';
import { SourceReference } from './PlannerChatService';

export interface RefinementRequest {
    instruction: string;
    selectedText?: string;
    context?: Record<string, any>;
    /** Library resources to search for relevant context */
    libraryResources?: LibraryResourceEntity[];
}

export interface RefinementResponse {
    refinedContent: any;
    explanation?: string;
    changes?: string[];
    /** Source references from library used in the response */
    sources?: SourceReference[];
}

/**
 * Content Refinement Service
 * 
 * Provides AI-powered refinement for sermon content with RAG integration.
 * Uses library documents to enrich refinement suggestions.
 */
export class ContentRefinementService {
    private generator: GeminiSermonGenerator;
    private documentProcessor: DocumentProcessingService;

    constructor() {
        const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('Gemini API key not configured. Refinement features will be disabled.');
        }
        this.generator = new GeminiSermonGenerator(apiKey || '');
        this.documentProcessor = new DocumentProcessingService(apiKey || '');
    }

    /**
     * Search for relevant chunks from user's library
     */
    private async searchLibraryContext(
        searchQuery: string,
        resources: LibraryResourceEntity[]
    ): Promise<{ chunks: DocumentChunkEntity[], sources: SourceReference[] }> {
        if (!resources || resources.length === 0) {
            return { chunks: [], sources: [] };
        }

        const resourceIds = resources.map(r => r.id);
        console.log(`📚 [Refinement] Searching ${resourceIds.length} resources for: "${searchQuery.substring(0, 50)}..."`);

        try {
            const searchResults = await this.documentProcessor.searchRelevantChunks(
                searchQuery,
                resourceIds,
                8 // Top 8 chunks
            );

            const chunks = searchResults.map(r => r.chunk);
            console.log(`✅ [Refinement] Found ${chunks.length} relevant chunks`);

            // Convert to source references
            const sources: SourceReference[] = chunks.map(chunk => ({
                author: chunk.resourceAuthor,
                title: chunk.resourceTitle,
                page: chunk.metadata.page,
                snippet: chunk.text.substring(0, 150) + '...'
            }));

            return { chunks, sources };
        } catch (error) {
            console.warn('⚠️ [Refinement] RAG search failed:', error);
            return { chunks: [], sources: [] };
        }
    }

    /**
     * Build library context string from relevant chunks
     */
    private buildLibraryContextString(chunks: DocumentChunkEntity[]): string {
        if (chunks.length === 0) {
            return '';
        }

        const chunksText = chunks.map((chunk, i) => {
            const pageInfo = chunk.metadata.page ? `, p.${chunk.metadata.page}` : '';
            return `[${i + 1}] "${chunk.resourceTitle}" (${chunk.resourceAuthor}${pageInfo}):\n"${chunk.text.substring(0, 400)}${chunk.text.length > 400 ? '...' : ''}"`;
        }).join('\n\n');

        return `

RECURSOS DE LA BIBLIOTECA DEL PASTOR:
Los siguientes fragmentos provienen de recursos teológicos que el pastor ha subido a su biblioteca. 
Puedes citarlos y usarlos para enriquecer tu respuesta:

${chunksText}

⚠️ IMPORTANTE: Si usas información de estos recursos, menciona la fuente (autor y título).
`;
    }

    /**
     * Refine exegetical study content with RAG
     */
    async refineExegesis(
        exegesis: ExegeticalStudy,
        request: RefinementRequest
    ): Promise<RefinementResponse> {
        // Build search query from instruction + passage context
        const searchQuery = `${request.instruction} ${exegesis.passage} exégesis contexto histórico`;

        // Search library for relevant content
        const { chunks, sources } = await this.searchLibraryContext(
            searchQuery,
            request.libraryResources || []
        );

        const libraryContext = this.buildLibraryContextString(chunks);
        const prompt = this.buildExegesisPrompt(exegesis, request, libraryContext);

        try {
            const history = [
                {
                    id: Date.now().toString(),
                    role: 'user' as const,
                    content: prompt,
                    timestamp: new Date()
                }
            ];

            const response = await this.generator.chat('EXEGESIS' as any, history, { exegesis });

            return {
                refinedContent: exegesis,
                explanation: response,
                changes: [],
                sources
            };
        } catch (error) {
            console.error('Error refining exegesis:', error);
            throw new Error('No se pudo refinar la exégesis. Por favor intenta de nuevo.');
        }
    }

    /**
     * Refine homiletical analysis content with RAG
     */
    async refineHomiletics(
        homiletics: HomileticalAnalysis,
        request: RefinementRequest
    ): Promise<RefinementResponse> {
        // Build search query from instruction + homiletics context
        const searchQuery = `${request.instruction} homilética aplicación sermón ${homiletics.homileticalProposition}`;

        // Search library for relevant content
        const { chunks, sources } = await this.searchLibraryContext(
            searchQuery,
            request.libraryResources || []
        );

        const libraryContext = this.buildLibraryContextString(chunks);
        const prompt = this.buildHomileticsPrompt(homiletics, request, libraryContext);

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
                changes: [],
                sources
            };
        } catch (error) {
            console.error('Error refining homiletics:', error);
            throw new Error('No se pudo refinar el análisis homilético. Por favor intenta de nuevo.');
        }
    }

    /**
     * Refine sermon content with RAG
     */
    async refineSermon(
        sermon: SermonContent,
        request: RefinementRequest
    ): Promise<RefinementResponse> {
        // Build search query from instruction + sermon context
        const searchQuery = `${request.instruction} sermón predicación ${sermon.title}`;

        // Search library for relevant content
        const { chunks, sources } = await this.searchLibraryContext(
            searchQuery,
            request.libraryResources || []
        );

        const libraryContext = this.buildLibraryContextString(chunks);
        const prompt = this.buildSermonPrompt(sermon, request, libraryContext);

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
                changes: [],
                sources
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

    // Private helper methods for building prompts - now with library context

    private buildExegesisPrompt(
        exegesis: ExegeticalStudy,
        request: RefinementRequest,
        libraryContext: string
    ): string {
        const baseContext = `
Eres un asistente experto en exégesis bíblica. Tienes el siguiente estudio exegético:

Pasaje: ${exegesis.passage}
Contexto Histórico: ${exegesis.context.historical}
Contexto Literario: ${exegesis.context.literary}
Audiencia Original: ${exegesis.context.audience}
Proposición Exegética: ${exegesis.exegeticalProposition}
Insights Pastorales: ${exegesis.pastoralInsights.join(', ')}
${libraryContext}`;

        const selectedContext = request.selectedText
            ? `\n\nTexto seleccionado por el usuario: "${request.selectedText}"`
            : '';

        return `${baseContext}${selectedContext}

Solicitud del usuario: ${request.instruction}

Por favor, proporciona una sugerencia de refinamiento específica y concreta.
${libraryContext ? 'Usa los recursos de la biblioteca del pastor para enriquecer tu respuesta cuando sea relevante.' : ''}

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto:
{
  "suggestion": "tu sugerencia de mejora aquí (puede ser texto largo con múltiples párrafos)"
}

No incluyas ningún texto antes o después del JSON. Solo el objeto JSON.`;
    }

    private buildHomileticsPrompt(
        homiletics: HomileticalAnalysis,
        request: RefinementRequest,
        libraryContext: string
    ): string {
        let exegeticalContext = '';

        // Prefer dynamic context data if available
        if (request.context && request.context.exegesisContextData) {
            const contextData = request.context.exegesisContextData as Array<{ label: string, value: any }>;
            const contextString = contextData
                .map(item => {
                    const valueStr = Array.isArray(item.value) ? item.value.join(', ') : item.value;
                    return `${item.label}: ${valueStr}`;
                })
                .join('\n');

            exegeticalContext = `
CONTEXTO EXEGÉTICO (Marco Interpretativo):
${contextString}
`;
        }
        // Fallback to hardcoded structure for backward compatibility
        else if (request.context && request.context.exegesis) {
            const ex = request.context.exegesis as ExegeticalStudy;
            exegeticalContext = `
CONTEXTO EXEGÉTICO (Marco Interpretativo):
Pasaje: ${ex.passage}
Proposición Exegética: ${ex.exegeticalProposition}
Insights Pastorales: ${ex.pastoralInsights.join(', ')}
Contexto Histórico: ${ex.context.historical}
`;
        }

        const baseContext = `
Eres un asistente experto en homilética. 
${exegeticalContext}
${libraryContext}

Tienes el siguiente análisis homilético actual:

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
${libraryContext ? 'Usa los recursos de la biblioteca del pastor para enriquecer tu respuesta cuando sea relevante.' : ''}

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto:
{
  "suggestion": "tu sugerencia de mejora aquí (puede ser texto largo con múltiples párrafos)"
}

No incluyas ningún texto antes o después del JSON. Solo el objeto JSON.`;
    }

    private buildSermonPrompt(
        sermon: SermonContent,
        request: RefinementRequest,
        libraryContext: string
    ): string {
        const baseContext = `
Eres un asistente experto en redacción de sermones. Tienes el siguiente sermón:

Título: ${sermon.title}
Introducción: ${sermon.introduction}
Puntos: ${sermon.body.map(p => p.point).join(', ')}
Conclusión: ${sermon.conclusion}
${libraryContext}`;

        const selectedContext = request.selectedText
            ? `\n\nTexto seleccionado: "${request.selectedText}"`
            : '';

        return `${baseContext}${selectedContext}

Solicitud: ${request.instruction}
${libraryContext ? 'Usa los recursos de la biblioteca del pastor para enriquecer tu respuesta cuando sea relevante.' : ''}

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
