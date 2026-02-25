import {
    IAIChatRepository,
    IAIAgentRepository,
    IAIGeneratorService,
    IAIProjectRepository,
    AIChatMessage,
    AIAgent
} from '@dosfilos/domain';

/**
 * OrchestratedMessageUseCase — Fan-out Multi-Agent Coordinator
 *
 * Architecture:
 *
 *   User message
 *       │
 *       ▼
 *   [Step 1] Router Agent (lightweight Gemini call ~1s)
 *            Analyzes the question, returns:
 *            - strategy: 'single' | 'fanout'
 *            - agentIds: string[]
 *       │
 *       ├─ strategy: 'single' ──► Specialist responds directly (streaming)
 *       │
 *       └─ strategy: 'fanout' ──► Parallel calls to all selected specialists
 *                                 │
 *                                 ▼
 *                            [Step 3] Synthesis Agent
 *                            Consolidates all specialist responses
 *                            into a single coherent answer (streaming)
 *       │
 *       ▼
 *   Response saved to Firestore with agent attribution
 */

interface RouterDecision {
    strategy: 'single' | 'fanout';
    agentIds: string[];
    reasoning?: string;
}

export class OrchestratedMessageUseCase {
    constructor(
        private agentRepository: IAIAgentRepository,
        private chatRepository: IAIChatRepository,
        private generatorService: IAIGeneratorService,
        private projectRepository?: IAIProjectRepository
    ) { }

    async execute(
        userId: string,
        sessionId: string,
        messageContent: string,
        onChunk?: (text: string) => void,
        onAgentsSelected?: (agents: AIAgent[]) => void,
        lengthPreference?: 'concise' | 'detailed'
    ): Promise<{ response: string; selectedAgents: AIAgent[] }> {
        const session = await this.chatRepository.getSession(userId, sessionId);
        if (!session) throw new Error('Session not found');

        const allAgents = await this.agentRepository.getAllAgents();
        const activeAgents = allAgents.filter(a => a.isActive);
        if (activeAgents.length === 0) throw new Error('No active agents available');

        // ── Step 1: Route ─────────────────────────────────────────────────────────
        const decision = await this.routeQuestion(activeAgents, session.messages, messageContent);

        const selectedAgents = decision.agentIds
            .map(id => activeAgents.find(a => a.id === id))
            .filter((a): a is AIAgent => !!a);

        const finalAgents = selectedAgents.length > 0 ? selectedAgents : [activeAgents[0]];

        onAgentsSelected?.(finalAgents);

        // ── Step 2: Save user message ─────────────────────────────────────────────
        const generateId = () => {
            try {
                return (globalThis.crypto as any)?.randomUUID?.() ||
                    Math.random().toString(36).substring(2) + Date.now().toString(36);
            } catch (e) {
                return Math.random().toString(36).substring(2) + Date.now().toString(36);
            }
        };

        const userMessage: AIChatMessage = {
            id: generateId(),
            role: 'user',
            content: messageContent,
            timestamp: new Date()
        };

        try {
            await this.chatRepository.addMessageToSession(userId, sessionId, userMessage);
        } catch (error) {
            console.error('[OrchestratedMessageUseCase] Failed to save user message:', error);
            throw error;
        }

        // ── Project contextNote injection ─────────────────────────────────────────
        // If the session belongs to a project with a contextNote, prepend it to the
        // message so the specialist gets enriched context without the user needing
        // to repeat it every time.
        let enrichedMessage = messageContent;
        if (session.projectId && this.projectRepository) {
            const project = await this.projectRepository.getProject(session.projectId);
            if (project?.contextNote) {
                enrichedMessage = `[Contexto del proyecto "${project.title}": ${project.contextNote}]\n\n${messageContent}`;
            }
        }

        const history = [...session.messages, userMessage];
        let finalResponse = '';

        if (decision.strategy === 'fanout' && finalAgents.length > 1) {
            // ── Step 3a: Fan-out — call all specialists in parallel ────────────────
            const specialistResponses = await Promise.all(
                finalAgents.map(agent =>
                    this.generatorService
                        .sendMessage(agent, history, enrichedMessage, lengthPreference)
                        .then(response => ({ agent, response }))
                        .catch(() => null)
                )
            );

            const validResponses = specialistResponses.filter(
                (r): r is { agent: AIAgent; response: string } => !!r
            );

            if (validResponses.length === 0) throw new Error('All specialist calls failed');

            // ── Step 3b: Synthesis — consolidate & stream ─────────────────────────
            finalResponse = await this.synthesize(
                validResponses,
                enrichedMessage,
                onChunk,
                lengthPreference
            );
        } else {
            // ── Step 3 (single): Stream directly from the selected specialist ──────
            if (onChunk) {
                finalResponse = await this.generatorService.sendMessageStream(
                    finalAgents[0],
                    history,
                    enrichedMessage,
                    onChunk,
                    lengthPreference
                );
            } else {
                finalResponse = await this.generatorService.sendMessage(
                    finalAgents[0],
                    history,
                    enrichedMessage,
                    lengthPreference
                );
            }
        }

        const modelMessage: AIChatMessage = {
            id: generateId(),
            role: 'model',
            content: finalResponse,
            timestamp: new Date()
        };
        await this.chatRepository.addMessageToSession(userId, sessionId, modelMessage);

        return { response: finalResponse, selectedAgents: finalAgents };
    }

    /**
     * Router: lightweight Gemini call that decides strategy and which agents to use.
     */
    private async routeQuestion(
        agents: AIAgent[],
        history: AIChatMessage[],
        message: string
    ): Promise<RouterDecision> {
        const agentManifest = agents
            .map(a =>
                `  - id: "${a.id}" | name: "${a.name}"\n` +
                `    routing: "${a.routingDescription ?? a.expertiseArea}"`
            )
            .join('\n');

        const routerPrompt = `
Eres el enrutador de un sistema multi-agente para un seminario teológico.
Analiza la pregunta y decide qué especialistas deben responderla.

ESPECIALISTAS DISPONIBLES:
${agentManifest}

PREGUNTA: "${message}"

HISTORIAL RECIENTE:
${history.slice(-2).map(m => `${m.role}: ${m.content.substring(0, 120)}`).join('\n')}

REGLAS:
1. Si la pregunta cae claramente en UNA sola especialidad → strategy: "single"
2. Si la pregunta abarca EXPLÍCITAMENTE 2+ especialidades distintas → strategy: "fanout"
3. Prefiere "single" cuando tengas dudas (menor costo y latencia)
4. Máximo 3 agentes en fanout

Responde ÚNICAMENTE con JSON válido sin texto adicional:
{"strategy":"single","agentIds":["id1"],"reasoning":"una línea"}
`.trim();

        const routerAgent: AIAgent = {
            id: '__router__',
            name: 'Router',
            role: 'orchestrator',
            systemInstruction: 'Responde SOLO con JSON válido.',
            expertiseArea: 'routing',
            description: 'Internal routing agent',
            isActive: true,
        };

        try {
            const raw = await this.generatorService.sendMessage(routerAgent, [], routerPrompt);
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]) as RouterDecision;
                if (parsed.strategy && Array.isArray(parsed.agentIds) && parsed.agentIds.length > 0) {
                    return parsed;
                }
            }
        } catch {
            // Fallthrough to fallback
        }

        return { strategy: 'single', agentIds: [agents[0].id] };
    }

    /**
     * Synthesis: consolidates multiple specialist responses into one
     * coherent document and streams the result to the UI.
     */
    private async synthesize(
        specialistResponses: { agent: AIAgent; response: string }[],
        originalQuestion: string,
        onChunk?: (text: string) => void,
        lengthPreference?: 'concise' | 'detailed'
    ): Promise<string> {
        const specialistSection = specialistResponses
            .map(({ agent, response }) =>
                `=== ${agent.name} (${agent.expertiseArea}) ===\n${response}`
            )
            .join('\n\n');

        const synthesisPrompt = `
Eres un sintetizador de respuestas teológicas especializadas.
Integra las siguientes respuestas de diferentes especialistas en UN SOLO documento
cohesivo, bien estructurado y sin repeticiones innecesarias.

PREGUNTA ORIGINAL: "${originalQuestion}"

RESPUESTAS DE LOS ESPECIALISTAS:
${specialistSection}

INSTRUCCIONES:
- Integra las perspectivas de forma natural, indicando de qué especialidad proviene cada idea
- Mantén el rigor teológico de cada especialista
- Crea UN documento unificado, no concatenes las respuestas
- Usa Markdown para estructurar la respuesta final
- Comienza directamente con el contenido integrado
`.trim();

        const synthAgent: AIAgent = {
            id: '__synthesizer__',
            name: 'Sintetizador',
            role: 'synthesizer',
            systemInstruction: 'Integras respuestas de múltiples especialistas teológicos en un documento cohesivo.',
            expertiseArea: 'synthesis',
            description: 'Internal synthesis agent',
            isActive: true,
        };

        if (onChunk) {
            return this.generatorService.sendMessageStream(
                synthAgent, [], synthesisPrompt, onChunk, lengthPreference
            );
        }
        return this.generatorService.sendMessage(synthAgent, [], synthesisPrompt, lengthPreference);
    }
}
