import { useCallback } from 'react';
import { sermonGeneratorService } from '@dosfilos/application';
import { toast } from 'sonner';
import { WorkflowPhase, LibraryResourceEntity } from '@dosfilos/domain';

export interface UseSermonSectionRefinementProps {
    phase: WorkflowPhase;
    contentType: string;
    currentContent: any;
    onContentUpdate: (content: any) => void;
    passage: string;
    libraryResources: LibraryResourceEntity[];
    getEffectiveResourceIds: () => string[];
    cacheName?: string | null;
    config?: any;
    selectedResourceIds?: string[];
}

/**
 * Custom hook that manages section refinement functionality
 * Handles refinement with Gemini Cache or RAG fallback
 */
export function useSermonSectionRefinement({
    phase,
    contentType,
    currentContent,
    onContentUpdate,
    passage,
    libraryResources,
    getEffectiveResourceIds,
    cacheName,
    config,
    selectedResourceIds = []
}: UseSermonSectionRefinementProps) {

    const refineSectionWithCache = useCallback(async (
        sectionId: string,
        sectionLabel: string,
        sectionPath: string,
        currentSectionContent: any,
        message: string,
        formattingInstructions: string
    ): Promise<{ refinedContent: any; sources: Array<{ author: string; title: string; page?: number; snippet: string }> }> => {

        if (cacheName) {
            console.log('🚀 Using Gemini Cache for refinement:', cacheName);

            const effectiveResourceIds = getEffectiveResourceIds();

            const cachedResources = libraryResources
                .filter(r => effectiveResourceIds.includes(r.id) && r.metadata?.geminiUri)
                .map(r => ({ title: r.title, author: r.author }));

            const passageContextStr = passage ? `
CONTEXTO DEL ESTUDIO:
- Pasaje bajo estudio: ${passage}

Tu refinamiento debe ser específico y relevante para este pasaje.
` : '';

            const contentString = typeof currentSectionContent === 'string'
                ? currentSectionContent
                : JSON.stringify(currentSectionContent, null, 2);

            const instruction = `Refina el contenido de la sección "${sectionLabel}" según esta instrucción: ${message}
${passageContextStr}
IMPORTANTE: 
- Devuelve SOLO el contenido refinado, sin explicaciones adicionales
- NO agregues prefijos como "Aquí está..." o "El contenido refinado es..."
${formattingInstructions}`;

            const aiResponse = await sermonGeneratorService.refineContent(contentString, instruction, {
                cacheName,
                cachedResources
            });

            // Parse the response based on original type
            let parsedContent: any;
            if (Array.isArray(currentSectionContent)) {
                try {
                    let cleanedResponse = aiResponse.trim();
                    cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
                    cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
                    cleanedResponse = cleanedResponse.trim();
                    parsedContent = JSON.parse(cleanedResponse);

                    if (!Array.isArray(parsedContent)) {
                        throw new Error('Expected array but got object');
                    }
                } catch (parseError) {
                    console.error('Failed to parse array response:', parseError);
                    toast.error('Error al parsear la respuesta de la IA');
                    throw new Error('La IA no devolvió un array válido');
                }
            } else if (typeof currentSectionContent === 'object') {
                try {
                    let cleanedResponse = aiResponse.trim();
                    cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
                    cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
                    cleanedResponse = cleanedResponse.trim();
                    parsedContent = JSON.parse(cleanedResponse);
                } catch (parseError) {
                    console.error('Failed to parse object response:', parseError);
                    parsedContent = aiResponse;
                }
            } else {
                parsedContent = aiResponse.trim();
            }

            const refinementSources = cachedResources.map(r => ({
                author: r.author,
                title: r.title,
                snippet: '(Fuente disponible en contexto completo)'
            }));

            return { refinedContent: parsedContent, sources: refinementSources };

        } else {
            // FALLBACK: Manual RAG
            console.log('⚠️ No cache available. Falling back to Manual RAG for refinement.');

            const { GeminiAIService } = await import('@dosfilos/infrastructure');
            const { DocumentProcessingService } = await import('@dosfilos/infrastructure');
            const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error('API key not configured');

            const aiService = new GeminiAIService(apiKey);
            const docProcessor = new DocumentProcessingService(apiKey);

            let libraryContextStr = '';
            let refinementSources: Array<{ author: string; title: string; page?: number; snippet: string }> = [];

            if (libraryResources.length > 0) {
                try {
                    const searchQuery = `${message} ${sectionLabel}`;
                    const resourceIds = libraryResources.map(r => r.id);
                    const searchResults = await docProcessor.searchRelevantChunks(searchQuery, resourceIds, 6);

                    if (searchResults.length > 0) {
                        const chunks = searchResults.map(r => r.chunk);
                        refinementSources = chunks.map(chunk => ({
                            author: chunk.resourceAuthor,
                            title: chunk.resourceTitle,
                            page: chunk.metadata.page,
                            snippet: chunk.text.substring(0, 150) + '...'
                        }));

                        const chunksText = chunks.map((chunk, i) => {
                            const pageInfo = chunk.metadata.page ? `, p.${chunk.metadata.page}` : '';
                            return `[${i + 1}] "${chunk.resourceTitle}" (${chunk.resourceAuthor}${pageInfo}):\n"${chunk.text.substring(0, 400)}..."`;
                        }).join('\n\n');

                        libraryContextStr = `
RECURSOS DE TU BIBLIOTECA (DEBES CITARLOS):
${chunksText}

Si usas información de estos recursos, menciona la fuente.
`;
                    }
                } catch (error) {
                    console.warn('⚠️ [Refinement] Could not search library:', error);
                }
            }

            const passageContextStr = passage ? `
CONTEXTO DEL ESTUDIO:
- Pasaje bajo estudio: ${passage}

Tu refinamiento debe ser específico y relevante para este pasaje.
` : '';

            const contentString = typeof currentSectionContent === 'string'
                ? currentSectionContent
                : JSON.stringify(currentSectionContent, null, 2);

            const instruction = `Refina el contenido de la sección "${sectionLabel}" según esta instrucción: ${message}
${passageContextStr}${libraryContextStr}
IMPORTANTE: 
- Devuelve SOLO el contenido refinado, sin explicaciones adicionales
- NO agregues prefijos como "Aquí está..." o "El contenido refinado es..."
${formattingInstructions}`;

            const aiResponse = await aiService.refineContent(contentString, instruction);

            // Parse response (same logic as cache path)
            let parsedContent: any;
            if (Array.isArray(currentSectionContent)) {
                let cleanedResponse = aiResponse.trim()
                    .replace(/^```json\s*/i, '').replace(/^```\s*/, '')
                    .replace(/\s*```$/, '').trim();
                parsedContent = JSON.parse(cleanedResponse);
            } else if (typeof currentSectionContent === 'object') {
                let cleanedResponse = aiResponse.trim()
                    .replace(/^```json\s*/i, '').replace(/^```\s*/, '')
                    .replace(/\s*```$/, '').trim();
                try {
                    parsedContent = JSON.parse(cleanedResponse);
                } catch {
                    parsedContent = aiResponse;
                }
            } else {
                parsedContent = aiResponse.trim();
            }

            return { refinedContent: parsedContent, sources: refinementSources };
        }
    }, [cacheName, libraryResources, getEffectiveResourceIds, passage]);

    return {
        refineSectionWithCache
    };
}
