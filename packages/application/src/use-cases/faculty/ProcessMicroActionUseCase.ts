import {
    IAIChatRepository,
    IAIGeneratorService,
    AIAgentRole,
    AIChatMessage
} from '@dosfilos/domain';

export type MicroActionType = 'REWRITE' | 'EXPAND' | 'SUMMARIZE' | 'QUOTE_SEARCH' | 'MAKE_ACADEMIC' | 'MAKE_PASTORAL';

export interface ProcessMicroActionRequest {
    userId: string;
    sessionId: string;
    selectedText: string;
    actionType: MicroActionType;
    documentContext?: string; // Optional context from surrounding text
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

        const actionPrompt = this.buildActionPrompt(request.actionType, request.selectedText, request.documentContext);

        const editorAgent = {
            id: 'system_editor',
            name: 'Co-Authoring Editor',
            role: 'GENERAL_TUTOR' as AIAgentRole,
            isActive: true,
            description: 'Internal micro-action editor engine',
            expertiseArea: 'Text refinement and pastoral editing',
            systemInstruction: 'Eres un editor pastoral experto. Tu única tarea es recibir un fragmento de texto de un sermón o documento teológico y aplicar la acción solicitada. Debes devolver ÚNICAMENTE el texto modificado, sin saludos, comentarios, ni confirmaciones.'
        };

        const result = await this.generatorService.sendMessage(
            editorAgent,
            session.messages, // We send the chat history to provide context of the theological discussion
            actionPrompt,
            undefined,
            true // Enable thinking for better results
        );

        return result;
    }

    private buildActionPrompt(actionType: MicroActionType, selectedText: string, documentContext?: string): string {
        let instruction = '';

        switch (actionType) {
            case 'REWRITE':
                instruction = 'Reescribe el siguiente texto para mejorar su claridad, fluidez y gramática, manteniendo el significado original.';
                break;
            case 'EXPAND':
                instruction = 'Expande el siguiente texto, añadiendo profundidad, detalles explicativos o ejemplos relevantes al contexto teológico discutido.';
                break;
            case 'SUMMARIZE':
                instruction = 'Resume el siguiente texto, destilando la idea principal en una forma más concisa y directa.';
                break;
            case 'QUOTE_SEARCH':
                instruction = 'Encuentra una cita relevante de un teólogo, predicador histórico o confesión de fe que respalde o ilustre el siguiente texto. Integra la cita orgánicamente en el texto original o colócala al final con su referencia.';
                break;
            case 'MAKE_ACADEMIC':
                instruction = 'Reescribe el siguiente texto elevando el tono para que sea más académico y riguroso teológicamente (usa terminología precisa si aplica).';
                break;
            case 'MAKE_PASTORAL':
                instruction = 'Reescribe el siguiente texto para que tenga un tono más cálido, pastoral, alentador y accesible para la congregación.';
                break;
            default:
                instruction = 'Modifica el siguiente texto según el historial de la conversación.';
        }

        const contextBlock = documentContext
            ? `\n\nContexto del documento (para referencia, no lo reescribas):\n"""\n${documentContext}\n"""\n`
            : '';

        return `${instruction}${contextBlock}\n\nTexto a procesar:\n"""\n${selectedText}\n"""\n\nRecuerda: Devuelve SOLAMENTE el texto resultante.`;
    }
}
