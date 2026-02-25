import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    IAIGeneratorService,
    AIAgent,
    AIChatMessage
} from '@dosfilos/domain';

export class GeminiMultiAgentService implements IAIGeneratorService {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    private readonly GLOBAL_BEHAVIOR_PROMPT = `
Eres un tutor experto en formación teológica y pastoral. Tu objetivo es ayudar al usuario de forma clara y precisa.

REGLA CRÍTICA DE INTERACCIÓN:
Si el usuario envía un mensaje que es ambiguo, incompleto, demasiado corto para tener sentido, o parece ser el inicio de algo pero carece de contexto suficiente (ej: "te doy algo más de contexto:", "tengo una duda sobre...", o simplemente frases inacabadas), NO intentes adivinar la intención ni generes una respuesta genérica extensa. 

En su lugar:
1. Responde de forma breve y profesional.
2. Identifica con empatía que la información parece estar incompleta.
3. Pide amablemente al usuario que proporcione los detalles faltantes o que complete su idea para que puedas darle una asesoría de calidad.

REGLA DE FORMATO:
NO incluyas tu nombre, cargo ni especialidad como encabezado o título en tus respuestas (ej: no pongas "[Pastor Noutético]"). Comienza directamente con tu respuesta.

Mantén siempre una actitud de mentoría, paciencia y servicio pastoral.`;

    constructor(apiKey: string, modelName?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName || 'gemini-1.5-flash-latest';
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
        lengthPreference?: 'concise' | 'detailed'
    ): Promise<string> {
        const options: any = {
            model: this.modelName,
            systemInstruction: this.getInstructionWithPreference(agent.systemInstruction, lengthPreference),
            // Disable thinking output so internal reasoning doesn't leak into the response text
            generationConfig: {
                thinkingConfig: { thinkingBudget: 0 }
            }
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

        const result = await chat.sendMessageStream(message);

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

        return fullResponse;
    }

    async sendMessage(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        lengthPreference?: 'concise' | 'detailed'
    ): Promise<string> {
        const options: any = {
            model: this.modelName,
            systemInstruction: this.getInstructionWithPreference(agent.systemInstruction, lengthPreference),
            generationConfig: {
                thinkingConfig: { thinkingBudget: 0 }
            }
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
}
