import { useState, useCallback, useEffect } from 'react';
import { TrainingUnit, MorphologyBreakdown, PassageSyntaxAnalysis, BiblicalPassage } from '@dosfilos/domain';
import { AnalyzePassageSyntaxUseCase } from '@dosfilos/application';
import { ActionType } from '../components/InteractionPanel';
import { useGreekTutor } from '../GreekTutorProvider';

export interface BoardContent {
    type: ActionType | 'chat';
    title: string;
    content: string;
    timestamp: Date;
    morphologyData?: MorphologyBreakdown; // For visual rendering
    greekWord?: string; // Greek word being studied
    identification?: string; // Grammatical identification
    passage?: string; // Bible passage reference
    syntaxAnalysis?: PassageSyntaxAnalysis; // For syntax view
}

interface UseGreekTutorBoardProps {
    units: TrainingUnit[];
    currentIndex: number;
    morphologyBreakdowns: Record<string, MorphologyBreakdown>;
    onRequestMorphology: (unitId: string) => void;
    onChatMessage: (message: string) => Promise<string>;
    isMorphologyLoading: string | null;
    passage: string; // Bible passage reference for context
    userLanguage?: string; // User's preferred language (e.g., 'Spanish', 'English')
}


interface UseGreekTutorBoardReturn {
    currentContent: BoardContent | null;
    currentContentTitle: string | null;
    currentContentTimestamp: Date | null;
    isLoading: boolean;
    handleActionClick: (action: ActionType) => void;
    handleChatMessage: (message: string) => Promise<void>;
    handleCopy: () => void;
    handleExport: () => void;
    activeAction: ActionType | null;
}

/**
 * Custom hook for managing content board state.
 * Follows Single Responsibility - manages board logic only.
 * Separates UI state from data fetching logic.
 */
export const useGreekTutorBoard = ({
    units,
    currentIndex,
    morphologyBreakdowns,
    onRequestMorphology,
    onChatMessage,
    isMorphologyLoading,
    passage,
    userLanguage = 'Spanish' // Default to Spanish if not provided
}: UseGreekTutorBoardProps): UseGreekTutorBoardReturn => {

    const [currentContent, setCurrentContent] = useState<BoardContent | null>(null);
    const [activeAction, setActiveAction] = useState<ActionType | null>(null);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Get Greek Tutor context at top level (MUST be here, not in callbacks)
    const greekTutorContext = useGreekTutor();

    const currentUnit = units[currentIndex];

    /**
     * Format morphology breakdown for display
     */
    const formatMorphologyContent = useCallback((breakdown: MorphologyBreakdown): string => {
        let content = `# Descomposición Morfológica\n\n`;

        // Word with components in highlighted block
        content += `## Estructura\n\n`;
        content += `\`\`\`\n`;
        content += breakdown.components.map(c => c.part).join(' + ');
        content += `\n\`\`\`\n\n`;
        content += `---\n\n`;

        // Component breakdown without emojis
        content += `## Componentes\n\n`;
        breakdown.components.forEach((component) => {
            const typeLabels: Record<string, string> = {
                'prefix': 'Prefijo',
                'root': 'Raíz',
                'formative': 'Formativo',
                'ending': 'Terminación',
                'other': 'Otro'
            };

            const typeLabel = typeLabels[component.type] || 'Componente';

            content += `### ${component.part}\n\n`;
            content += `> **${typeLabel}**\n>\n`;
            content += `> ${component.meaning}\n\n`;
        });

        content += `---\n\n`;

        // Summary in highlighted format
        if (breakdown.summary) {
            content += `## Síntesis\n\n`;
            content += `> [!TIP]\n`;
            content += `> **Resumen**\n>\n`;
            content += `> ${breakdown.summary}\n`;
        }

        return content;
    }, []);

    /**
     * Handle action button click
     */
    const handleActionClick = useCallback((action: ActionType) => {
        if (!currentUnit) return;

        setActiveAction(action);

        switch (action) {
            case 'morphology': {
                // Check if already loaded
                const existing = morphologyBreakdowns[currentUnit.id];
                if (existing) {
                    console.log('[useGreekTutorBoard] Setting morphology content with data:', existing);
                    setCurrentContent({
                        type: 'morphology',
                        title: 'Descomposición Morfológica',
                        content: formatMorphologyContent(existing),
                        morphologyData: existing, // Include data for visual rendering
                        timestamp: new Date()
                    });
                } else {
                    console.log('[useGreekTutorBoard] Requesting morphology for:', currentUnit.id);
                    // Request it (hook expects unitId, handler will get word from unit)
                    onRequestMorphology(currentUnit.id);
                }
                break;
            }

            case 'recognition': {
                setCurrentContent({
                    type: 'recognition',
                    title: '¿Cómo reconocer esta forma?',
                    content: currentUnit.recognitionGuidance || 'Contenido no disponible',
                    greekWord: currentUnit.greekForm.text,
                    identification: currentUnit.identification,
                    passage,
                    timestamp: new Date()
                });
                break;
            }

            case 'context': {
                setCurrentContent({
                    type: 'context',
                    title: 'Función en Contexto',
                    content: currentUnit.functionInContext,
                    greekWord: currentUnit.greekForm.text,
                    identification: currentUnit.identification,
                    passage,
                    timestamp: new Date()
                });
                break;
            }

            case 'significance': {
                setCurrentContent({
                    type: 'significance',
                    title: 'Significado Teológico',
                    content: currentUnit.significance,
                    greekWord: currentUnit.greekForm.text,
                    identification: currentUnit.identification,
                    passage,
                    timestamp: new Date()
                });
                break;
            }

            case 'quiz': {
                setCurrentContent({
                    type: 'quiz',
                    title: 'Quiz de Comprensión',
                    content: '', // QuizSection handles its own content
                    greekWord: currentUnit.greekForm.text,
                    identification: currentUnit.identification,
                    passage,
                    timestamp: new Date()
                });
                break;
            }

            case 'passage': {
                setCurrentContent({
                    type: 'passage',
                    title: 'Leer Pasaje Completo',
                    content: '', // PassageReader handles its own content
                    greekWord: currentUnit.greekForm.text,
                    identification: currentUnit.identification,
                    passage,
                    timestamp: new Date()
                });
                break;
            }

            case 'syntax': {
                // Syntax analysis requires full passage data
                setIsChatLoading(true); // Reuse existing loading state
                setCurrentContent({
                    type: 'syntax',
                    title: 'Estructura Sintáctica',
                    content: 'Analizando estructura del pasaje...',
                    passage,
                    timestamp: new Date()
                });

                // Execute analysis asynchronously
                (async () => {
                    try {
                        // Step 1: Fetch complete passage data
                        console.log('[useGreekTutorBoard] Fetching passage:', passage);
                        const biblicalPassage = await greekTutorContext.getPassageText.execute(passage);

                        // Step 2: Instantiate Gemini service (same as context)
                        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
                        const greekTutorService = new (await import('@dosfilos/infrastructure')).GeminiGreekTutorService(apiKey);

                        // Step 3: Instantiate use case
                        const analyzeSyntaxUseCase = new AnalyzePassageSyntaxUseCase(
                            greekTutorService,
                            greekTutorContext.sessionRepository
                        );

                        // Step 4: Execute analysis (with caching and user's language)
                        console.log('[useGreekTutorBoard] Analyzing syntax...');
                        const analysis = await analyzeSyntaxUseCase.execute(biblicalPassage, userLanguage);
                        console.log('[useGreekTutorBoard] Analysis complete:', analysis);

                        // Step 5: Update content with results
                        setCurrentContent({
                            type: 'syntax',
                            title: 'Estructura Sintáctica',
                            content: analysis.structureDescription,
                            passage,
                            syntaxAnalysis: analysis,
                            timestamp: new Date()
                        });
                    } catch (error) {
                        console.error('[useGreekTutorBoard] Syntax analysis error:', error);
                        setCurrentContent({
                            type: 'syntax',
                            title: 'Estructura Sintáctica',
                            content: `Error al analizar la sintaxis: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                            passage,
                            timestamp: new Date()
                        });
                    } finally {
                        setIsChatLoading(false);
                    }
                })();
                break;
            }
        }
    }, [currentUnit, morphologyBreakdowns, onRequestMorphology, formatMorphologyContent, passage]);

    /**
     * Handle chat message (placeholder - will connect to real chat later)
     */
    const handleChatMessage = useCallback(async (message: string) => {
        setActiveAction(null);
        setIsChatLoading(true);

        try {
            const answer = await onChatMessage(message);
            setCurrentContent({
                type: 'chat',
                title: 'Respuesta del Tutor',
                content: `**Tu pregunta:** ${message}\n\n---\n\n${answer}`,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Chat error:', error);
            setCurrentContent({
                type: 'chat',
                title: 'Error',
                content: `**Tu pregunta:** ${message}\n\n❌ Hubo un error al procesar tu pregunta. Por favor intenta de nuevo.`,
                timestamp: new Date()
            });
        } finally {
            setIsChatLoading(false);
        }
    }, [onChatMessage]);

    /**
     * Handle copy to clipboard
     */
    const handleCopy = useCallback(() => {
        if (currentContent) {
            navigator.clipboard.writeText(currentContent.content);
            // Could show toast notification here
        }
    }, [currentContent]);

    /**
     * Handle export (passed from parent with context)
     */
    const handleExport = useCallback(() => {
        // Export will be handled by parent with full context
        console.log('Export triggered from board');
    }, []);

    // Update content when morphology is loaded
    const isLoadingMorphology = isMorphologyLoading === currentUnit?.id;

    // Reset content when unit changes
    useEffect(() => {
        console.log('[useGreekTutorBoard] Unit changed to:', currentUnit?.id);
        // Clear content and active action when switching units
        setCurrentContent(null);
        setActiveAction(null);
    }, [currentUnit?.id]);

    // Use useEffect to update content when morphology data arrives
    useEffect(() => {
        // If morphology was requested and just loaded, update content
        if (activeAction === 'morphology' && !isLoadingMorphology && currentUnit) {
            const breakdown = morphologyBreakdowns[currentUnit.id];
            if (breakdown && (!currentContent || currentContent.type !== 'morphology' || !currentContent.morphologyData)) {
                console.log('[useGreekTutorBoard] Morphology data loaded, updating content:', breakdown);
                setCurrentContent({
                    type: 'morphology',
                    title: 'Descomposición Morfológica',
                    content: formatMorphologyContent(breakdown),
                    morphologyData: breakdown, // Include data for visual rendering
                    timestamp: new Date()
                });
            }
        }
    }, [activeAction, isLoadingMorphology, currentUnit, morphologyBreakdowns, currentContent, formatMorphologyContent]);

    return {
        currentContent,
        currentContentTitle: currentContent?.title || null,
        currentContentTimestamp: currentContent?.timestamp || null,
        isLoading: isLoadingMorphology || isChatLoading,
        handleActionClick,
        handleChatMessage,
        handleCopy,
        handleExport,
        activeAction
    };
};
