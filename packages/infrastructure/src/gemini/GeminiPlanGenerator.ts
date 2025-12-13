import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    IPlanGenerator,
    PlanGenerationRequest,
    GeneratedPlan,
    SeriesObjective,
    DocumentChunkEntity,
    Citation
} from '@dosfilos/domain';
import { GEMINI_CONFIG } from './config';
import { DocumentProcessingService } from '../services/DocumentProcessingService';

export class GeminiPlanGenerator implements IPlanGenerator {
    private genAI: GoogleGenerativeAI;
    private model;
    private documentProcessor: DocumentProcessingService;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: GEMINI_CONFIG.MODEL_NAME,
            generationConfig: GEMINI_CONFIG.GENERATION_CONFIG,
        });
        this.documentProcessor = new DocumentProcessingService(apiKey);
    }

    async generateSeriesObjective(request: PlanGenerationRequest): Promise<SeriesObjective> {
        // 1. Search for relevant chunks from user's library using RAG
        const resourceIds = request.contextResources.map(r => r.id);
        let relevantChunks: DocumentChunkEntity[] = [];

        if (resourceIds.length > 0) {
            const searchQuery = `${request.topicOrBook} ${request.subtopicsOrRange || ''}`;
            console.log(`🔍 [Objective] Searching for relevant chunks: "${searchQuery}"`);

            try {
                const searchResults = await this.documentProcessor.searchRelevantChunks(
                    searchQuery,
                    resourceIds,
                    20 // Get top 20 chunks for objective phase
                );
                relevantChunks = searchResults.map(r => r.chunk);
                console.log(`✅ [Objective] Found ${relevantChunks.length} relevant chunks from library`);
            } catch (error) {
                console.warn('⚠️ RAG search failed, falling back to basic context:', error);
            }
        }

        // 2. Build prompt with RAG context
        const prompt = this.buildObjectivePromptWithRAG(request, relevantChunks);
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        return JSON.parse(this.cleanJsonResponse(text));
    }

    async generateSeriesStructure(request: PlanGenerationRequest, objective: SeriesObjective): Promise<GeneratedPlan> {
        // 1. Search for relevant chunks from user's library
        const resourceIds = request.contextResources.map(r => r.id);
        let relevantChunks: DocumentChunkEntity[] = [];

        if (resourceIds.length > 0) {
            console.log(`Searching for relevant chunks in ${resourceIds.length} resources...`);
            const searchQuery = `${objective.title} ${objective.objective} ${request.topicOrBook}`;
            const searchResults = await this.documentProcessor.searchRelevantChunks(
                searchQuery,
                resourceIds,
                15 // Get top 15 most relevant chunks
            );
            relevantChunks = searchResults.map(r => r.chunk);
            console.log(`Found ${relevantChunks.length} relevant chunks`);
        }

        // 2. Build prompt with verified context
        const prompt = this.buildStructurePromptWithCitations(request, objective, relevantChunks);
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        const parsed = JSON.parse(this.cleanJsonResponse(text));

        // 3. Build citations array from chunks used
        const citations: Citation[] = this.buildCitationsFromResponse(parsed, relevantChunks);

        // Map response to GeneratedPlan structure
        return {
            series: {
                title: objective.title,
                description: objective.description,
                startDate: request.startDate,
                type: request.type,
                metadata: {
                    [request.type]: {
                        topic: request.topicOrBook,
                        subtopics: request.subtopicsOrRange ? request.subtopicsOrRange.split(',') : [],
                    }
                }
            },
            sermons: parsed.sermons,
            structureJustification: parsed.structureJustification,
            citations
        };
    }

    async generatePlan(request: PlanGenerationRequest): Promise<GeneratedPlan> {
        const objective = await this.generateSeriesObjective(request);
        return this.generateSeriesStructure(request, objective);
    }

    /**
     * Build objective prompt with VERIFIED content from user's indexed library
     */
    private buildObjectivePromptWithRAG(
        request: PlanGenerationRequest,
        relevantChunks: DocumentChunkEntity[]
    ): string {
        const dateInstruction = request.endDate
            ? `Date Range: ${request.startDate} to ${request.endDate}. Frequency: ${request.frequency || 'Weekly'}. Calculate the number of sermons based on this range.`
            : `Start Date: ${request.startDate}. Frequency: ${request.frequency || 'Weekly'}.`;

        const countInstruction = request.numberOfSermons
            ? `Target Number of Sermons: ${request.numberOfSermons}`
            : `Target Number of Sermons: AUTO (You decide based on the topic depth)`;

        // Build verified context from RAG chunks
        const hasLibraryContext = relevantChunks.length > 0;
        let verifiedContext: string;

        if (hasLibraryContext) {
            verifiedContext = relevantChunks.map((chunk, i) => {
                const pageInfo = chunk.metadata.page ? `, page ${chunk.metadata.page}` : '';
                return `[Source ${i + 1}] ${chunk.resourceAuthor} - "${chunk.resourceTitle}"${pageInfo}:
"${chunk.text.substring(0, 600)}..."`;
            }).join('\n\n');
        } else {
            // Fallback to resource names only
            verifiedContext = request.contextResources.map(r =>
                `- ${r.author}: "${r.title}"`
            ).join('\n');
        }

        return `
Eres un experto profesor de homilética y mentor pastoral. Diseña el objetivo de una serie de predicación.

## Solicitud del Pastor:
- Tipo: ${request.type === 'thematic' ? 'Serie Temática' : 'Serie Expositiva'}
- Tema/Libro: ${request.topicOrBook}
${request.subtopicsOrRange ? `- Subtemas/Rango: ${request.subtopicsOrRange}` : ''}
- ${dateInstruction}
- ${countInstruction}

## Contexto de la Biblioteca Teológica del Pastor:
${hasLibraryContext ? `
He encontrado los siguientes fragmentos relevantes en los libros indexados del pastor:

${verifiedContext}

INSTRUCCIÓN CRÍTICA: Usa este contenido VERIFICADO para fundamentar tus sugerencias. 
Menciona específicamente qué autores y recursos se pueden usar y cómo.
` : `
El pastor tiene estos recursos disponibles (no indexados aún):
${verifiedContext}
`}
${request.plannerNotes ? `
## Enfoque y Notas del Pastor:
El pastor ha definido el siguiente enfoque o puntos clave que quiere desarrollar:

${request.plannerNotes}

IMPORTANTE: Esta información proviene de una conversación previa con el asistente. 
Usa estos puntos como guía principal para estructurar el título, descripción y objetivo de la serie.
Los puntos clave mencionados deben reflejarse en la propuesta.
` : ''}

## Tu Tarea:
1. Propón un título creativo y teológicamente profundo para la serie.
2. Escribe una descripción que capture la esencia de lo que se explorará.
3. Define el objetivo central que guiará cada sermón.
4. En "pastoralAdvice", incluye:
   - Reflexión sobre la viabilidad del número de sermones solicitado
   - Cómo los recursos del pastor pueden enriquecer cada mensaje
   - Sugerencias específicas basadas en el contenido de la biblioteca

## Formato de Respuesta (JSON):
{
  "title": "Título de la Serie",
  "description": "Descripción de 2-3 oraciones",
  "objective": "Objetivo central en 1-2 oraciones",
  "pastoralAdvice": "Nota del experto con consejos específicos basados en la biblioteca del pastor",
  "suggestedSermonCount": 4
}

JSON:
        `;
    }

    /**
     * Build structure prompt with VERIFIED citations from user's library
     */
    private buildStructurePromptWithCitations(
        request: PlanGenerationRequest,
        objective: SeriesObjective,
        relevantChunks: DocumentChunkEntity[]
    ): string {
        // Build verified context from chunks
        const hasLibraryContext = relevantChunks.length > 0;

        let verifiedContext: string;
        if (hasLibraryContext) {
            verifiedContext = relevantChunks.map((chunk, i) => {
                const pageInfo = chunk.metadata.page ? `, p.${chunk.metadata.page}` : '';
                return `[FUENTE ${i + 1}: ${chunk.resourceAuthor} - "${chunk.resourceTitle}"${pageInfo}]\n${chunk.text}\n[/FUENTE ${i + 1}]`;
            }).join('\n\n');
        } else {
            verifiedContext = 'No se proporcionaron recursos de biblioteca para este tema.';
        }

        const frequencyInstruction = request.frequency
            ? `Frequency: ${request.frequency} (Adjust dates accordingly)`
            : 'Frequency: Weekly';

        const countInstruction = request.numberOfSermons
            ? `Number of Sermons: ${request.numberOfSermons}`
            : `Number of Sermons: AUTO (Propose an optimal number based on the topic depth).`;

        const passageInstruction = request.type === 'expository'
            ? `For expository series, divide the book/passage range logically. Each sermon should cover a specific passage range.`
            : `For thematic series, suggest a primary biblical passage that best supports each sermon's theme.`;

        // Citation rules based on whether we have library context
        let citationRules: string;
        if (hasLibraryContext) {
            citationRules = `
REGLAS DE CITACIÓN (MUY IMPORTANTE):
1. PRIORIZA las fuentes proporcionadas del usuario (marcadas como [FUENTE N]).
2. Cuando uses información de las FUENTES proporcionadas, cita así: "[Biblioteca: Autor, Título]"
3. Si usas conocimiento teológico general que NO está en las fuentes, indica: "[Conocimiento general]"
4. NUNCA inventes citas o atribuyas ideas a autores que no están en las fuentes proporcionadas.
5. Si una idea viene de las fuentes del usuario, indica cuál fuente (ej: ver Fuente 1).`;
        } else {
            citationRules = `
NOTA SOBRE FUENTES:
- No se proporcionaron recursos de la biblioteca del usuario para este tema.
- Puedes usar tu conocimiento teológico general, pero indica claramente: "[Conocimiento general]"
- NO atribuyas citas específicas a autores a menos que estés absolutamente seguro.`;
        }

        const justificationInstruction = hasLibraryContext
            ? 'Referencia las fuentes de la biblioteca cuando sea apropiado, indicando [Biblioteca: Autor, Título]'
            : 'Indica [Conocimiento general] cuando uses ideas teológicas no verificadas';

        return `
            Act as an expert homiletics professor.
            Create a sermon structure for the following series:
            
            Series Title: ${objective.title}
            Objective: ${objective.objective}
            Type: ${request.type}
            Topic/Book: ${request.topicOrBook}
            ${countInstruction}
            Start Date: ${request.startDate}
            ${frequencyInstruction}
            
            CONTEXTO VERIFICADO DE LA BIBLIOTECA DEL USUARIO:
            ${verifiedContext}
            
            ${citationRules}
            
            PASSAGE ASSIGNMENT INSTRUCTIONS:
            ${passageInstruction}
            Each sermon MUST have a specific biblical passage assigned.
            
            Output a JSON object with:
            
            1. "structureJustification": A 2-3 paragraph explanation in Spanish of WHY you structured the series this way. Explain:
               - The theological/narrative logic behind the sermon sequence
               - Why you selected these specific passages
               - How each sermon builds upon the previous one to achieve the series objective
               - ${justificationInstruction}
               This should read like a brief pastoral memo explaining your homiletical reasoning.
            
            2. "sermons": An array where each sermon object has:
               - title: Sermon title (creative and engaging).
               - description: Brief description of the sermon's focus and key theology.
               - passage: The primary biblical passage for this sermon. REQUIRED.
               - week: Sermon number (1 to N).
            
            3. "sourcesUsed": An array of objects indicating which sources you used:
               - type: "library" or "general"
               - author: Author name (if library source)
               - title: Resource title (if library source)
               - description: Brief note on how you used this source
            
            JSON:
        `;
    }

    /**
     * Build Citation objects from the AI response and matched chunks
     */
    private buildCitationsFromResponse(
        parsed: { sourcesUsed?: Array<{ type: string; author?: string; title?: string; description?: string }> },
        chunks: DocumentChunkEntity[]
    ): Citation[] {
        const citations: Citation[] = [];

        if (parsed.sourcesUsed) {
            for (const source of parsed.sourcesUsed) {
                if (source.type === 'library' && source.author && source.title) {
                    // Find matching chunk
                    const matchingChunk = chunks.find(
                        c => c.resourceAuthor === source.author || c.resourceTitle.includes(source.title || '')
                    );

                    citations.push({
                        id: crypto.randomUUID(),
                        text: source.description || '',
                        sourceType: 'library',
                        resourceId: matchingChunk?.resourceId,
                        resourceTitle: source.title,
                        resourceAuthor: source.author,
                        chunkId: matchingChunk?.id
                    });
                } else if (source.type === 'general') {
                    citations.push({
                        id: crypto.randomUUID(),
                        text: source.description || 'Conocimiento teológico general',
                        sourceType: 'general'
                    });
                }
            }
        }

        return citations;
    }

    private cleanJsonResponse(text: string): string {
        let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        const firstBrace = cleaned.indexOf('{');
        if (firstBrace === -1) return '{}';
        cleaned = cleaned.substring(firstBrace);
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace !== -1) {
            cleaned = cleaned.substring(0, lastBrace + 1);
        }
        return cleaned;
    }
}
