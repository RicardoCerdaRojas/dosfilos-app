import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    IAIGeneratorService,
    AIAgent,
    AIChatMessage,
    SourceReference
} from '@dosfilos/domain';

export class GeminiMultiAgentService implements IAIGeneratorService {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    private readonly GLOBAL_BEHAVIOR_PROMPT = `
Eres un tutor experto en formación teológica y pastoral. Tu objetivo es ayudar al usuario de forma clara y precisa.

REGLA DE INTERACCIÓN (APLICA SOLO A MENSAJES CLARAMENTE INCOMPLETOS):
Si el mensaje del usuario es una frase inacabada o contiene menos de 5 palabras sin un tema identificable, pide amablemente que complete la pregunta.
NO apliques esta regla a preguntas bien formadas, aunque sean similares a mensajes anteriores, o de seguimiento.

REGLA DE FORMATO:
NO incluyas tu nombre, cargo ni especialidad como encabezado en tus respuestas. Comienza directamente con el contenido.

USO DEL CONTEXTO RECUPERADO Y CITACIÓN:

1. Cuando tu respuesta incluya "CONTEXTO RECUPERADO" al inicio, ese es tu MATERIAL PRIMARIO. Úsalo para construir la respuesta.
   Cada fuente aparece con un encabezado del tipo:
     [Fuente N: Autor, "Título", p. N, § Sección]
   seguido del texto del fragmento.

2. Cuando cites en tu respuesta, usa el formato: (Autor, "Título", p. N)
   Ejemplo: "El aoristo indicativo presenta la acción como completa (Wallace, "Gramática Griega", p. 608)."
   Si no hay página disponible, omítela: (Autor, "Título").

3. NUNCA te cites a ti mismo. Tú eres un TUTOR, no una fuente bibliográfica.
   PROHIBIDO: "(Dr. Berith, Exégesis Hebrea)", "(Pastor Noutético)".

4. NUNCA inventes autores o títulos. Solo cita lo que aparece LITERALMENTE en los encabezados [Fuente N: ...].

5. Cuando una idea provenga de tu conocimiento general (no del contexto recuperado), indícalo con: "Según la tradición teológica..." o "Los comentaristas clásicos sostienen...". No uses nombres específicos en ese caso.

6. Si el CONTEXTO RECUPERADO está vacío o no es relevante a la pregunta, responde desde tu conocimiento general y declara: "Basado en conocimiento teológico general..."

Mantén una actitud de mentoría, paciencia y servicio pastoral.`;

    constructor(apiKey: string, modelName?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName || 'gemini-2.5-flash';
    }

    private formatHistoryForGemini(history: AIChatMessage[]) {
        return history.map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
    }

    private getInstructionWithPreference(agentInstruction: string, preference?: 'concise' | 'detailed'): string {
        let fullInstruction = `${this.GLOBAL_BEHAVIOR_PROMPT}\n\nINSTRUCCIONES ESPECÍFICAS DEL ESPECIALISTA:\n${agentInstruction}`;

        if (preference === 'concise') {
            fullInstruction += `\n\nPREFERENCIA DE FORMATO: El usuario ha solicitado una respuesta CONCISA. Sé breve, directo y ve al grano, enfocándote solo en lo esencial.`;
        } else if (preference === 'detailed') {
            fullInstruction += `\n\nPREFERENCIA DE FORMATO: El usuario ha solicitado una respuesta DETALLADA. Proporciona una explicación exhaustiva, con abundante contexto, ejemplos y análisis profundo.`;
        }

        return fullInstruction;
    }

    async sendMessageStream(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        onChunk: (text: string) => void,
        lengthPreference?: 'concise' | 'detailed',
        onSources?: (sources: SourceReference[]) => void,
        retrievedContext?: string
    ): Promise<string> {
        const usingPhase2RAG = !!retrievedContext;

        const options: any = {
            model: this.modelName,
            systemInstruction: this.getInstructionWithPreference(agent.systemInstruction, lengthPreference),
            generationConfig: {
                thinkingConfig: { thinkingBudget: 0 }
            }
        };

        // Only use fileSearch tool in LEGACY path (Phase 1). When Phase 2 retrieval
        // is providing context explicitly, don't let Gemini do its own file search.
        if (!usingPhase2RAG && agent.corpusIds && agent.corpusIds.length > 0) {
            options.tools = [{
                fileSearch: {
                    fileSearchStoreNames: agent.corpusIds
                }
            } as any];
        }

        const model = this.genAI.getGenerativeModel(options);

        const chat = model.startChat({
            history: this.formatHistoryForGemini(history),
        });

        // Prepend the retrieved context to the user's message so Gemini has
        // the specific chunks + metadata it needs to cite accurately.
        const finalMessage = usingPhase2RAG
            ? `CONTEXTO RECUPERADO (usa esto como material primario y cita según indican los encabezados [Fuente N: ...]):\n\n${retrievedContext}\n\n---\n\nPREGUNTA DEL USUARIO: ${message}`
            : message;

        const result = await chat.sendMessageStream(finalMessage);

        let fullResponse = '';
        for await (const chunk of result.stream) {
            // Only emit actual text parts — skip thinking/function-call parts
            for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
                if ('text' in part && typeof part.text === 'string' && !('thought' in part)) {
                    fullResponse += part.text;
                    onChunk(part.text);
                }
            }
        }

        // Extract grounding metadata from File Search (LEGACY Phase 1 only).
        // In Phase 2, sources come from the retrieval step done by the caller.
        if (!usingPhase2RAG && agent.corpusIds && agent.corpusIds.length > 0) {
            try {
                const finalResponse = await result.response;
                const sources = this.extractSourcesFromResponse(finalResponse, agent.name);
                if (sources.length > 0 && onSources) onSources(sources);
            } catch (err) {
                console.warn('[GeminiMultiAgent] Could not extract grounding metadata (stream):', err);
            }
        }

        return fullResponse;
    }

    /**
     * Extracts grounding metadata from a final Gemini response into SourceReference[].
     * Shared between streaming and non-streaming paths.
     */
    private extractSourcesFromResponse(finalResponse: any, agentName: string): SourceReference[] {
        const groundingChunks: any[] = finalResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

        // Debug: inspect chunk contents to see if markers are present in any form
        const markerRegexes = {
            '[FUENTE:': /\[FUENTE:/,
            '(Fuente:': /\(Fuente:/,
            'Fragmento': /Fragmento\s+\d+/,
        };
        const counts: Record<string, number> = {};
        for (const [name, rx] of Object.entries(markerRegexes)) {
            counts[name] = groundingChunks.filter((c: any) => rx.test(c.retrievedContext?.text ?? '')).length;
        }
        console.log(`[GeminiMultiAgent] Agent: ${agentName} | Total chunks: ${groundingChunks.length} | Markers:`, counts);
        if (groundingChunks[0]) {
            const firstText = (groundingChunks[0].retrievedContext?.text ?? '').substring(0, 500);
            console.log(`[GeminiMultiAgent] First chunk preview:`, firstText);
        }

        // Group by document. Matches three marker formats for backward compat:
        //  - NEW (unique):  "Fragmento N · Autor · "Título" · p. N."
        //  - Inline:        "(Fuente: Autor, "Título", p. N)"
        //  - Legacy:        "[FUENTE: Autor — "Título", Página N]"
        const docMap = new Map<string, SourceReference & { pages: number[] }>();
        const newFormat = /Fragmento\s+\d+\s*·\s*([^·\n]+?)\s*·\s*"([^"]+)"\s*·\s*p\.\s*(\d+)/;
        const inlineFormat = /\(Fuente:\s*([^,\n]+?),\s*"([^"]+)",\s*p\.\s*(\d+)\)/;
        const legacyFormat = /\[FUENTE:\s*([^—\n]+?)\s*—\s*"([^"]+)",?\s*P[aá]gina\s*(\d+)\]/;

        for (const chunk of groundingChunks) {
            const ctx = chunk.retrievedContext ?? chunk.web ?? {};
            const text: string = ctx.text ?? '';
            const m = text.match(newFormat) || text.match(inlineFormat) || text.match(legacyFormat);

            if (m) {
                const author = m[1]?.trim();
                const title = m[2]?.trim();
                const page = m[3] ? parseInt(m[3]) : 0;
                const key = `${author}||${title}`;
                if (docMap.has(key)) {
                    docMap.get(key)!.pages.push(page);
                } else {
                    docMap.set(key, { title, author, pages: [page] });
                }
            } else {
                const storeId: string = ctx.fileSearchStore ?? ctx.uri ?? '';
                if (!storeId || docMap.has(`store||${storeId}`)) continue;
                const readableName = storeId
                    .replace(/^fileSearchStores\//, '')
                    .replace(/^dos-filos-/, '')
                    .replace(/-[a-z0-9]{10,15}$/, '')
                    .split('-')
                    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
                docMap.set(`store||${storeId}`, {
                    title: readableName || storeId,
                    pages: [],
                    ...(text && { snippet: text.substring(0, 250).trim() }),
                });
            }
        }

        return Array.from(docMap.values()).map(({ pages, ...src }) => {
            const ref: SourceReference = { title: src.title };
            if (src.author) ref.author = src.author;
            if (pages.length > 0) {
                const sorted = [...new Set(pages)].sort((a, b) => a - b);
                ref.page = sorted[0];
                ref.snippet = `Páginas consultadas: ${sorted.join(', ')}`;
            } else if (src.snippet) {
                ref.snippet = src.snippet;
            }
            return ref;
        });
    }

    async sendMessage(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        lengthPreference?: 'concise' | 'detailed',
        enableThinking?: boolean
    ): Promise<string> {
        const options: any = {
            model: this.modelName,
            systemInstruction: this.getInstructionWithPreference(agent.systemInstruction, lengthPreference),
            generationConfig: enableThinking
                ? {} // Let the model use its default thinking budget
                : { thinkingConfig: { thinkingBudget: 0 } }
        };

        if (agent.corpusIds && agent.corpusIds.length > 0) {
            options.tools = [{
                fileSearch: {
                    fileSearchStoreNames: agent.corpusIds
                }
            } as any];
        }

        const model = this.genAI.getGenerativeModel(options);

        const chat = model.startChat({
            history: this.formatHistoryForGemini(history),
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
    }

    async sendMessageWithSources(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        lengthPreference?: 'concise' | 'detailed'
    ): Promise<{ response: string; sources: SourceReference[] }> {
        const options: any = {
            model: this.modelName,
            systemInstruction: this.getInstructionWithPreference(agent.systemInstruction, lengthPreference),
            generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
        };

        if (agent.corpusIds && agent.corpusIds.length > 0) {
            options.tools = [{
                fileSearch: { fileSearchStoreNames: agent.corpusIds }
            } as any];
        }

        const model = this.genAI.getGenerativeModel(options);
        const chat = model.startChat({ history: this.formatHistoryForGemini(history) });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        let sources: SourceReference[] = [];
        if (agent.corpusIds && agent.corpusIds.length > 0) {
            try {
                sources = this.extractSourcesFromResponse(response, agent.name);
            } catch (err) {
                console.warn('[GeminiMultiAgent] Could not extract grounding (non-stream):', err);
            }
        }

        return { response: text, sources };
    }
}

