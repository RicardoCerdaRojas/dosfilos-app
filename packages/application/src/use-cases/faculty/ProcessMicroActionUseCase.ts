import {
    IAIChatRepository,
    IAIGeneratorService,
    AIAgentRole,
    AIChatMessage,
    DEFAULT_LANGUAGE,
} from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';

export type MicroActionType = 'REWRITE' | 'EXPAND' | 'SUMMARIZE' | 'BULLET_POINTS' | 'QUOTE_SEARCH' | 'MAKE_ACADEMIC' | 'MAKE_PASTORAL' | 'CUSTOM';

export interface ProcessMicroActionRequest {
    userId: string;
    sessionId: string;
    selectedText: string;
    actionType: MicroActionType;
    documentContext?: string; // Optional context from surrounding text
    customPrompt?: string; // Used for CUSTOM action
    onChunk?: (text: string) => void;
    language?: SupportedLanguage;
}

export class ProcessMicroActionUseCase {
    constructor(
        private chatRepository: IAIChatRepository,
        private generatorService: IAIGeneratorService
    ) {}

    async execute(request: ProcessMicroActionRequest): Promise<string> {
        const session = await this.chatRepository.getSession(request.userId, request.sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const language = request.language ?? DEFAULT_LANGUAGE;
        const actionPrompt = this.buildActionPrompt(
            request.actionType, request.selectedText, language, request.documentContext, request.customPrompt,
        );

        const editorAgent = {
            id: 'system_editor',
            name: { es: 'Editor Co-Autor', en: 'Co-Authoring Editor' },
            role: 'GENERAL_TUTOR' as AIAgentRole,
            isActive: true,
            description: {
                es: 'Motor interno de micro-acciones de edición',
                en: 'Internal micro-action editor engine',
            },
            expertiseArea: {
                es: 'Refinamiento de texto y edición pastoral',
                en: 'Text refinement and pastoral editing',
            },
            systemInstruction: {
                es: 'Eres un editor pastoral experto. Tu única tarea es recibir un fragmento de texto de un sermón o documento teológico y aplicar la acción solicitada. Debes devolver ÚNICAMENTE el texto modificado, sin saludos, comentarios, ni confirmaciones.',
                en: 'You are an expert pastoral editor. Your sole task is to take a fragment of text from a sermon or theological document and apply the requested action. You must return ONLY the modified text, with no greetings, comments, or confirmations.',
            },
        };

        if (request.onChunk) {
            const result = await this.generatorService.sendMessageStream(
                editorAgent,
                session.messages, // We send the chat history to provide context of the theological discussion
                actionPrompt,
                request.onChunk,
                undefined,
                undefined,
                undefined,
                language,
            );
            return result;
        }

        const result = await this.generatorService.sendMessage(
            editorAgent,
            session.messages, // We send the chat history to provide context of the theological discussion
            actionPrompt,
            undefined,
            true, // Enable thinking for better results
            language,
        );

        return result;
    }

    private buildActionPrompt(
        actionType: MicroActionType,
        selectedText: string,
        language: SupportedLanguage,
        documentContext?: string,
        customPrompt?: string,
    ): string {
        const isEn = language === 'en';
        let instruction = '';

        switch (actionType) {
            case 'REWRITE':
                instruction = isEn
                    ? 'Rewrite the following text to improve clarity, flow, and grammar while preserving the original meaning.'
                    : 'Reescribe el siguiente texto para mejorar su claridad, fluidez y gramática, manteniendo el significado original.';
                break;
            case 'EXPAND':
                instruction = isEn
                    ? 'Expand the following text by adding depth, explanatory details, or examples relevant to the theological context discussed.'
                    : 'Expande el siguiente texto, añadiendo profundidad, detalles explicativos o ejemplos relevantes al contexto teológico discutido.';
                break;
            case 'SUMMARIZE':
                instruction = isEn
                    ? 'Summarize the following text, distilling the main idea into a more concise and direct form.'
                    : 'Resume el siguiente texto, destilando la idea principal en una forma más concisa y directa.';
                break;
            case 'BULLET_POINTS':
                instruction = isEn
                    ? 'Rewrite the following text as a bullet-point list, extracting the main points clearly and in a structured manner.'
                    : 'Reescribe el siguiente texto en formato de lista de viñetas (bullet points), extrayendo los puntos principales de forma clara y estructurada.';
                break;
            case 'QUOTE_SEARCH':
                instruction = isEn
                    ? 'Find a relevant quote from a theologian, historic preacher, or confession of faith that supports or illustrates the following text. Integrate the quote organically into the original text or place it at the end with its reference.'
                    : 'Encuentra una cita relevante de un teólogo, predicador histórico o confesión de fe que respalde o ilustre el siguiente texto. Integra la cita orgánicamente en el texto original o colócala al final con su referencia.';
                break;
            case 'MAKE_ACADEMIC':
                instruction = isEn
                    ? 'Rewrite the following text raising the tone to be more academic and theologically rigorous (use precise terminology where applicable).'
                    : 'Reescribe el siguiente texto elevando el tono para que sea más académico y riguroso teológicamente (usa terminología precisa si aplica).';
                break;
            case 'MAKE_PASTORAL':
                instruction = isEn
                    ? 'Rewrite the following text so it has a warmer, pastoral, encouraging tone, accessible to the congregation.'
                    : 'Reescribe el siguiente texto para que tenga un tono más cálido, pastoral, alentador y accesible para la congregación.';
                break;
            case 'CUSTOM':
                instruction = customPrompt
                    ? (isEn
                        ? `Apply the following custom instruction to the text:\n"${customPrompt}"`
                        : `Aplica la siguiente instrucción personalizada al texto:\n"${customPrompt}"`)
                    : (isEn ? 'Modify the text.' : 'Modifica el texto.');
                break;
            default:
                instruction = isEn
                    ? 'Modify the following text according to the conversation history.'
                    : 'Modifica el siguiente texto según el historial de la conversación.';
        }

        const contextBlock = documentContext
            ? (isEn
                ? `\n\nDocument context (for reference, do not rewrite it):\n"""\n${documentContext}\n"""\n`
                : `\n\nContexto del documento (para referencia, no lo reescribas):\n"""\n${documentContext}\n"""\n`)
            : '';

        return isEn
            ? `${instruction}${contextBlock}\n\nText to process:\n"""\n${selectedText}\n"""\n\nReminder: Return ONLY the resulting text.`
            : `${instruction}${contextBlock}\n\nTexto a procesar:\n"""\n${selectedText}\n"""\n\nRecuerda: Devuelve SOLAMENTE el texto resultante.`;
    }
}
