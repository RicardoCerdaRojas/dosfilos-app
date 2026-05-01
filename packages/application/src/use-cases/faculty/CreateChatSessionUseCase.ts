import {
    IAIAgentRepository,
    IAIChatRepository,
    AIChatSession,
    AIChatSessionContext,
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
     * @param context   Optional refs to the surface the session was launched
     *                  from (paper / series / pericope). The orchestrator
     *                  hydrates these on each turn to enrich the system
     *                  prompt — see `OrchestratedMessageUseCase` Phase 4
     *                  enrichment block. Sanitized here to drop undefined
     *                  fields before persistence (Firestore rejects them).
     */
    async execute(
        userId: string,
        agentId: string,
        initialMessage?: string,
        projectId?: string,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
        context?: AIChatSessionContext,
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

        const sanitizedContext = sanitizeContext(context);

        const session = await this.chatRepository.createSession({
            userId,
            agentId,
            title: sessionTitle,
            messages: [],
            ...(projectId ? { projectId } : {}),
            ...(sanitizedContext ? { context: sanitizedContext } : {}),
        });

        return session;
    }
}

/**
 * Drops undefined keys and returns null when the resulting object is
 * empty — so we either persist a clean object or skip the field entirely.
 * Firestore rejects undefined values, and an empty `{}` is just noise on
 * the doc.
 */
function sanitizeContext(
    context: AIChatSessionContext | undefined,
): AIChatSessionContext | null {
    if (!context) return null;
    const out: AIChatSessionContext = {};
    if (context.paperId) out.paperId = context.paperId;
    if (context.seriesId) out.seriesId = context.seriesId;
    if (context.pericopeId) out.pericopeId = context.pericopeId;
    return Object.keys(out).length > 0 ? out : null;
}
