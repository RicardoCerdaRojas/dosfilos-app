import { useState } from 'react';
import { toast } from 'sonner';
import { sermonGeneratorService } from '@dosfilos/application';
import { WorkflowPhase, type HomileticalAnalysis } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sources?: Array<{ author: string; title: string; page?: number; snippet: string }>;
}

interface UseHomileticsRefinementParams {
    formattedHomiletics: any;
    homiletics: HomileticalAnalysis | null;
    setHomiletics: (h: HomileticalAnalysis) => void;
    expandedSectionId: string | null;
    modifiedSections: Set<string>;
    setModifiedSections: React.Dispatch<React.SetStateAction<Set<string>>>;
    setMessages: React.Dispatch<React.SetStateAction<any[]>>;
    sendGeneralMessage: (message: string, role: 'user' | 'assistant') => Promise<void>;
    config: any;
    rules: any;
    exegesis: any;
    passage: string;
}

interface UseHomileticsRefinementResult {
    isAiProcessing: boolean;
    handleSendMessage: (message: string, role?: 'user' | 'assistant') => Promise<void>;
}

/**
 * Encapsulates the homiletics chat → section refinement flow.
 * Validates the user's intent against the AI safety filter, then either
 * refines the expanded section or delegates to the general chat handler.
 */
export function useHomileticsRefinement({
    formattedHomiletics,
    homiletics,
    setHomiletics,
    expandedSectionId,
    setModifiedSections,
    setMessages,
    sendGeneralMessage,
    config,
    rules,
    exegesis,
    passage,
}: UseHomileticsRefinementParams): UseHomileticsRefinementResult {
    const { t } = useTranslation('generator');
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const handleSendMessage = async (message: string, role: 'user' | 'assistant' = 'user') => {
        // Manually add to local state when modifying a section (refinement) or
        // for assistant messages. General chat is handled via sendGeneralMessage.
        if (expandedSectionId || role === 'assistant') {
            const newMessage: ChatMessage = {
                id: Date.now().toString(),
                role,
                content: message,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, newMessage]);
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
                const aiService = new GeminiAIService(apiKey);

                let currentContextStr = '';
                if (expandedSectionId && formattedHomiletics) {
                    const sectionConfig = getSectionConfig('homiletics', expandedSectionId);
                    if (sectionConfig) {
                        const currentContent = getValueByPath(formattedHomiletics, sectionConfig.path);
                        currentContextStr = typeof currentContent === 'string'
                            ? currentContent
                            : JSON.stringify(currentContent);
                    }
                }

                const validation = await aiService.validateContext(message, currentContextStr.substring(0, 500));
                if (!validation.isValid) {
                    setMessages(prev => [
                        ...prev,
                        {
                            id: (Date.now() + 1).toString(),
                            role: 'assistant' as const,
                            content: validation.refusalMessage || t('homiletics.errors.refine'),
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

        if (role === 'user' && expandedSectionId && formattedHomiletics) {
            try {
                const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
                const { getValueByPath, setValueByPath } = await import('@/utils/path-utils');

                const sectionConfig = getSectionConfig('homiletics', expandedSectionId);
                if (!sectionConfig) {
                    throw new Error('Section configuration not found');
                }

                const currentContent = getValueByPath(formattedHomiletics, sectionConfig.path);
                const contentString = typeof currentContent === 'string'
                    ? currentContent
                    : JSON.stringify(currentContent, null, 2);

                const getFormattingInstructions = (sectionId: string): string => {
                    switch (sectionId) {
                        case 'outline':
                            return `
FORMATO: Devuelve un objeto JSON con esta estructura exacta:
{
  "mainPoints": [
    {
      "title": "Título del punto",
      "description": "Descripción...",
      "scriptureReferences": ["Ref1", "Ref2"]
    }
  ]
}`;
                        default:
                            return `
FORMATO: Usa markdown para mejor legibilidad:
- **Negritas** para énfasis
- Párrafos separados para ideas distintas`;
                    }
                };

                const refinementSources: Array<{ author: string; title: string; page?: number; snippet: string }> = [];

                let contextStr = '';
                const libraryContextStr = '';

                if (passage || exegesis) {
                    contextStr = `

CONTEXTO DEL ANÁLISIS HOMILÉTICO:
- Pasaje: ${passage || exegesis?.passage || 'No especificado'}
${exegesis?.exegeticalProposition ? `- Proposición Exegética: ${exegesis.exegeticalProposition}` : ''}
${rules?.targetAudience ? `- Audiencia: ${rules.targetAudience}` : ''}
${rules?.tone ? `- Tono: ${rules.tone}` : ''}

El contenido refinado DEBE mantener coherencia con el análisis exegético y las preferencias del pastor.
`;
                }

                const _instruction = `Refina el contenido de la sección "${sectionConfig.label}" según esta instrucción: ${message}
${contextStr}${libraryContextStr}
IMPORTANTE:
- Devuelve SOLO el contenido refinado, sin explicaciones adicionales
- NO agregues prefijos como "Aquí está..." o "El contenido refinado es..."
${getFormattingInstructions(sectionConfig.id)}`;

                const aiResponse = await sermonGeneratorService.refineContent(contentString, _instruction, {
                    phase: 'homiletics',
                    aiModel: config?.advanced?.aiModel,
                    temperature: config?.[WorkflowPhase.HOMILETICS]?.temperature || config?.advanced?.globalTemperature,
                });

                let parsedContent: any;
                if (sectionConfig.type === 'object') {
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

                const updatedHomiletics = JSON.parse(JSON.stringify(formattedHomiletics));
                setValueByPath(updatedHomiletics, sectionConfig.path, parsedContent);

                setHomiletics(updatedHomiletics);
                setModifiedSections(prev => new Set(prev).add(expandedSectionId));

                setMessages(prev => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant' as const,
                        content: `✅ ${t('homiletics.success.refined').replace('Sección', '')} "${sectionConfig.label}"`,
                        timestamp: new Date(),
                        sources: refinementSources.length > 0 ? refinementSources : undefined,
                    },
                ]);
                toast.success(t('homiletics.success.refined'));
            } catch (error: any) {
                console.error('Error refining section:', error);
                toast.error(error.message || t('homiletics.errors.refine'));
                setMessages(prev => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant' as const,
                        content: `Error: ${error.message || t('homiletics.errors.processFailed')}`,
                        timestamp: new Date(),
                    },
                ]);
            } finally {
                setIsAiProcessing(false);
            }
        } else if (role === 'user' && !expandedSectionId) {
            await sendGeneralMessage(message, role);
        }

        // Avoid the "modifiedSections used but never read" lint by referencing it.
        // (The actual mutation happened above.)
        void homiletics;
    };

    return { isAiProcessing, handleSendMessage };
}
