import { IAIChatRepository, IAIProjectRepository, IAIGeneratorService, AIAgentRole } from '@dosfilos/domain';

/**
 * Analyzes the first user message from each session in a project and uses
 * Gemini to suggest a contextNote describing the project's theme, audience,
 * and theological goals.
 *
 * SUGGEST ONLY — does NOT persist the contextNote.
 * The user edits and confirms before saving via UpdateProjectUseCase.
 */
export class GenerateProjectContextUseCase {
    constructor(
        private readonly chatRepository: IAIChatRepository,
        private readonly projectRepository: IAIProjectRepository,
        private readonly generatorService: IAIGeneratorService,
    ) { }

    async execute(userId: string, projectId: string): Promise<string> {
        const [project, allSessions] = await Promise.all([
            this.projectRepository.getProject(projectId),
            this.chatRepository.getUserSessions(userId),
        ]);

        if (!project) throw new Error(`Project ${projectId} not found`);

        const projectSessions = allSessions.filter(s => s.projectId === projectId);

        if (projectSessions.length === 0) {
            return `Serie ministerial "${project.title}". Agrega sesiones al proyecto para generar un contexto automático.`;
        }

        // Collect the first user message from each session as a sample
        const sessionSamples = projectSessions
            .map(s => {
                const firstUserMsg = s.messages.find(m => m.role === 'user');
                return firstUserMsg ? `- "${firstUserMsg.content}"` : null;
            })
            .filter(Boolean)
            .slice(0, 10)
            .join('\n');

        const contextAnalyzer = {
            id: 'system_context_analyzer',
            name: 'Context Analyzer',
            role: 'GENERAL_TUTOR' as AIAgentRole,
            isActive: true,
            description: 'Internal context analysis engine',
            expertiseArea: 'Ministerial context inference',
            systemInstruction:
                'Eres un asistente que analiza conversaciones teológicas y pastorales para inferir el contexto de un proyecto ministerial. ' +
                'Generas notas de contexto breves y útiles para otros agentes de IA. ' +
                'Responde siempre en español, con frases concretas y sin saludos ni explicaciones.',
        };

        const prompt =
            `Estos son los temas o preguntas que un pastor ha consultado en un proyecto de trabajo:\n\n` +
            `${sessionSamples}\n\n` +
            `Genera una nota de contexto breve (máximo 2-3 oraciones) que describa:\n` +
            `1. El tema o enfoque teológico/pastoral del proyecto\n` +
            `2. El nivel teológico aparente del pastor\n` +
            `3. El posible objetivo o audiencia\n\n` +
            `Esta nota será leída por agentes de IA. Sé concreto y ministerialmente útil. Responde SOLO con la nota.`;

        const result = await this.generatorService.sendMessage(
            contextAnalyzer,
            [],
            prompt,
        );

        return result.trim();
    }
}
