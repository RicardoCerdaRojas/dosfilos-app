import {
    IAIAgentRepository,
    IAIChatRepository,
    AIChatSession,
    DEFAULT_LANGUAGE,
    resolveLocalized,
} from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';

export class CreateChatSessionUseCase {
    constructor(
        private agentRepository: IAIAgentRepository,
        private chatRepository: IAIChatRepository
    ) { }

    /**
     * @param projectId Optional. When provided, the new session is born linked
     *                  to the project — this is how the orchestrator picks up
     *                  `project.contextNote` and `project.sourceIds` to scope
     *                  RAG retrieval to the project's curated source set.
     * @param language  Locale used for the placeholder title and for resolving
     *                  the agent's localized `name`. The orchestrator will
     *                  overwrite the title on the first exchange via the
     *                  smart-title generator, so this is short-lived chrome —
     *                  but it has to read correctly while it's visible.
     */
    async execute(
        userId: string,
        agentId: string,
        initialMessage?: string,
        projectId?: string,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
    ): Promise<AIChatSession> {
        const agent = await this.agentRepository.getAgent(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        const agentName = resolveLocalized(agent.name, language);
        let sessionTitle = language === 'en'
            ? `Session with ${agentName}`
            : `Sesión con ${agentName}`;
        if (initialMessage) {
            sessionTitle = initialMessage.length > 50
                ? initialMessage.substring(0, 47) + '...'
                : initialMessage;
        }

        const session = await this.chatRepository.createSession({
            userId,
            agentId,
            title: sessionTitle,
            messages: [],
            ...(projectId ? { projectId } : {}),
        });

        return session;
    }
}
