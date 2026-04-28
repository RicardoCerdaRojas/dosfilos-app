import {
    IAIChatRepository,
    IAIProjectRepository,
    IAIGeneratorService,
    AIAgentRole,
    DEFAULT_LANGUAGE,
} from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';

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

    async execute(
        userId: string,
        projectId: string,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
    ): Promise<string> {
        const [project, allSessions] = await Promise.all([
            this.projectRepository.getProject(projectId),
            this.chatRepository.getUserSessions(userId),
        ]);

        if (!project) throw new Error(`Project ${projectId} not found`);

        const projectSessions = allSessions.filter(s => s.projectId === projectId);

        if (projectSessions.length === 0) {
            return language === 'en'
                ? `Ministry series "${project.title}". Add sessions to the project to generate an automatic context.`
                : `Serie ministerial "${project.title}". Agrega sesiones al proyecto para generar un contexto automático.`;
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
            name: { es: 'Analizador de Contexto', en: 'Context Analyzer' },
            role: 'GENERAL_TUTOR' as AIAgentRole,
            isActive: true,
            description: {
                es: 'Motor interno de inferencia de contexto',
                en: 'Internal context analysis engine',
            },
            expertiseArea: {
                es: 'Inferencia de contexto ministerial',
                en: 'Ministerial context inference',
            },
            systemInstruction: {
                es: 'Eres un asistente que analiza conversaciones teológicas y pastorales para inferir el contexto de un proyecto ministerial. ' +
                    'Generas notas de contexto breves y útiles para otros agentes de IA. ' +
                    'Responde siempre en español, con frases concretas y sin saludos ni explicaciones.',
                en: 'You are an assistant that analyzes theological and pastoral conversations to infer the context of a ministry project. ' +
                    'You generate brief, useful context notes for other AI agents. ' +
                    'Always respond in English, with concrete sentences and no greetings or explanations.',
            },
        };

        const prompt = language === 'en'
            ? `These are the topics or questions a pastor has consulted within a work project:\n\n` +
              `${sessionSamples}\n\n` +
              `Generate a brief context note (max 2-3 sentences) that describes:\n` +
              `1. The theological/pastoral theme or focus of the project\n` +
              `2. The pastor's apparent theological level\n` +
              `3. The likely goal or audience\n\n` +
              `This note will be read by AI agents. Be concrete and ministerially useful. Respond ONLY with the note.`
            : `Estos son los temas o preguntas que un pastor ha consultado en un proyecto de trabajo:\n\n` +
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
            undefined,
            undefined,
            language,
        );

        return result.trim();
    }
}
