import { useState } from 'react';
import { toast } from 'sonner';
import { sermonGeneratorService } from '@dosfilos/application';
import { WorkflowPhase, normalizeHomileticalApproach, type ApproachType } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';

interface UseDraftRefinementParams {
    draft: any;
    setDraft: (d: any) => void;
    expandedSectionId: string | null;
    setMessages: React.Dispatch<React.SetStateAction<any[]>>;
    setModifiedSections: React.Dispatch<React.SetStateAction<Set<string>>>;
    sendGeneralMessage: (message: string, role: 'user' | 'assistant') => Promise<void>;
    contentHistory: any;
    config: any;
    rules: any;
    homiletics: any;
    exegesis: any;
    passage: string;
}

interface UseDraftRefinementResult {
    isAiProcessing: boolean;
    handleSendMessage: (message: string, role?: 'user' | 'assistant') => Promise<void>;
}

/**
 * Encapsulates the draft chat → section refinement flow used by `StepDraft`.
 * Mirrors `useHomileticsRefinement` but with sermon-specific context.
 */
export function useDraftRefinement({
    draft,
    setDraft,
    expandedSectionId,
    setMessages,
    setModifiedSections,
    sendGeneralMessage,
    contentHistory,
    config,
    rules,
    homiletics,
    exegesis,
    passage,
}: UseDraftRefinementParams): UseDraftRefinementResult {
    const { t } = useTranslation('generator');
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const handleSendMessage = async (message: string, role: 'user' | 'assistant' = 'user') => {
        if (expandedSectionId || role === 'assistant') {
            setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), role, content: message, timestamp: new Date() },
            ]);
        }

        if (role === 'user') {
            setIsAiProcessing(true);
            try {
                const { GeminiAIService } = await import('@dosfilos/infrastructure');
                const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
                const { getValueByPath } = await import('@/utils/path-utils');

                const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
                if (!apiKey) {
                    throw new Error('API key not configured');
                }
                const aiService = new GeminiAIService();

                let currentContextStr = '';
                if (expandedSectionId && draft) {
                    const sectionConfig = getSectionConfig('sermon', expandedSectionId);
                    if (sectionConfig) {
                        const currentContent = getValueByPath(draft, sectionConfig.path);
                        currentContextStr =
                            typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent);
                    }
                }

                const validation = await aiService.validateContext(message, currentContextStr.substring(0, 500));
                if (!validation.isValid) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: (Date.now() + 1).toString(),
                            role: 'assistant' as const,
                            content: validation.refusalMessage || t('drafting.errors.refine'),
                            timestamp: new Date(),
                        },
                    ]);
                    setIsAiProcessing(false);
                    return;
                }
            } catch (error) {
                console.error('Error in context validation:', error);
            }
        }

        if (role === 'user' && expandedSectionId && draft) {
            try {
                const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
                const { getValueByPath, setValueByPath } = await import('@/utils/path-utils');

                const sectionConfig = getSectionConfig('sermon', expandedSectionId);
                if (!sectionConfig) {
                    throw new Error('Section configuration not found');
                }

                let currentContent = getValueByPath(draft, sectionConfig.path);

                if (typeof currentContent === 'string') {
                    const trimmed = currentContent.trim();
                    if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('```')) {
                        try {
                            let cleaned = trimmed;
                            cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
                            cleaned = cleaned.replace(/\s*```$/, '');
                            cleaned = cleaned.trim();
                            currentContent = JSON.parse(cleaned);
                        } catch (e) {
                            console.log('Could not parse stored content, treating as string');
                        }
                    }
                }

                const contentString =
                    typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent, null, 2);

                const getFormattingInstructions = (sectionId: string): string => {
                    switch (sectionId) {
                        case 'body':
                            return `
FORMATO: Devuelve un array JSON de objetos con esta estructura exacta:
[
  {
    "point": "Título del punto",
    "content": "Desarrollo del contenido...",
    "illustration": "Ilustración opcional..."
  }
]`;
                        default:
                            return `
FORMATO: Usa markdown para mejor legibilidad:
- **Negritas** para énfasis
- Párrafos separados para ideas distintas`;
                    }
                };

                const refinementSources: Array<{ author: string; title: string; page?: number; snippet: string }> = [];

                // Normalize on read: persisted studies may hold legacy values
                // (expository/thematic/narrative/topical). Maps to the six-form
                // catalog; expository → unset (was a condition, not a form).
                const homileticalApproach = normalizeHomileticalApproach(
                    homiletics?.homileticalApproach,
                ).approach;
                const exegeticalProposition = exegesis?.exegeticalProposition;
                const homileticalProposition = homiletics?.homileticalProposition;

                let sermonContextStr = '';
                if (passage || homileticalApproach) {
                    const APPROACH_LABELS: Record<ApproachType, string> = {
                        'temático': 'Temático',
                        'pastoral': 'Pastoral',
                        'teológico': 'Teológico',
                        'apologético': 'Apologético',
                        'evangelístico': 'Evangelístico',
                        'narrativo': 'Narrativo',
                    };
                    const approachLabel = homileticalApproach
                        ? APPROACH_LABELS[homileticalApproach]
                        : 'No especificado';
                    sermonContextStr = `

CONTEXTO COMPLETO DEL SERMÓN (usa esta información para mantener coherencia):
- Pasaje: ${passage || 'No especificado'}
- Enfoque Homilético: ${approachLabel}
- Proposición Exegética: ${exegeticalProposition || 'No especificada'}
- Proposición Homilética: ${homileticalProposition || 'No especificada'}
${rules?.targetAudience ? `- Audiencia: ${rules.targetAudience}` : ''}
${rules?.tone ? `- Tono: ${rules.tone}` : ''}

El contenido refinado DEBE mantener coherencia con el enfoque y las proposiciones del sermón.
`;
                }

                const instruction = `Refina el contenido de la sección "${sectionConfig.label}" según esta instrucción: ${message}
${sermonContextStr}
IMPORTANTE:
- Devuelve SOLO el contenido refinado, sin explicaciones adicionales
- NO agregues prefijos como "Aquí está..." o "El contenido refinado es..."
${getFormattingInstructions(sectionConfig.id)}`;

                const aiResponse = await sermonGeneratorService.refineContent(contentString, instruction, {
                    phase: 'sermon',
                    aiModel: config?.advanced?.aiModel,
                    temperature:
                        config?.[WorkflowPhase.DRAFTING]?.temperature || config?.advanced?.globalTemperature,
                });

                let parsedContent: any;
                if (Array.isArray(currentContent) || sectionConfig.type === 'array') {
                    try {
                        let cleanedResponse = aiResponse.trim();
                        cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
                        cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
                        cleanedResponse = cleanedResponse.trim();
                        parsedContent = JSON.parse(cleanedResponse);
                        if (!Array.isArray(parsedContent)) throw new Error('Expected array');
                    } catch (parseError) {
                        console.error('Failed to parse array response:', parseError);
                        toast.error(t('exegesis.errors.parseError'));
                        throw new Error(t('exegesis.errors.invalidArray'));
                    }
                } else if (typeof currentContent === 'object' || sectionConfig.type === 'object') {
                    try {
                        let cleanedResponse = aiResponse.trim();
                        cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
                        cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
                        cleanedResponse = cleanedResponse.trim();
                        parsedContent = JSON.parse(cleanedResponse);
                    } catch (parseError) {
                        console.error('Failed to parse object response:', parseError);
                        parsedContent = aiResponse;
                    }
                } else {
                    parsedContent = aiResponse.trim();
                }

                contentHistory.saveVersion(
                    expandedSectionId,
                    currentContent,
                    t('drafting.versions.beforeRefinement', { summary: message.substring(0, 50) }),
                    undefined,
                );

                const updated = JSON.parse(JSON.stringify(draft));
                setValueByPath(updated, sectionConfig.path, parsedContent);
                setDraft(updated);
                setModifiedSections((prev) => new Set(prev).add(expandedSectionId));

                contentHistory.saveVersion(
                    expandedSectionId,
                    parsedContent,
                    message.substring(0, 100),
                    t('drafting.versions.refinedSummary', { section: sectionConfig.label }),
                );

                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant' as const,
                        content:
                            refinementSources.length > 0
                                ? `✅ ${t('drafting.success.refinedSectionWithSources', { section: `"${sectionConfig.label}"`, count: refinementSources.length })}`
                                : `✅ ${t('drafting.success.refinedSection', { section: `"${sectionConfig.label}"` })}`,
                        timestamp: new Date(),
                        sources: refinementSources.length > 0 ? refinementSources : undefined,
                    },
                ]);
                toast.success(t('drafting.success.refined'));
            } catch (error: any) {
                console.error('Error refining section:', error);
                toast.error(error.message || t('drafting.errors.refining'));
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant' as const,
                        content: `Error: ${error.message || t('drafting.errors.processFailed')}`,
                        timestamp: new Date(),
                    },
                ]);
            } finally {
                setIsAiProcessing(false);
            }
        } else if (role === 'user' && !expandedSectionId) {
            await sendGeneralMessage(message, role);
        }
    };

    return { isAiProcessing, handleSendMessage };
}
