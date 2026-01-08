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
    translate: (key: string) => string; // Translation function
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
    userLanguage = 'Spanish', // Default to Spanish if not provided
    translate
}: UseGreekTutorBoardProps): UseGreekTutorBoardReturn => {

    const [currentContent, setCurrentContent] = useState<BoardContent | null>(null);
    const [activeAction, setActiveAction] = useState<ActionType | null>(null);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Get Greek Tutor context at top level (MUST be here, not in callbacks)
    const greekTutorContext = useGreekTutor();

    const currentUnit = units[currentIndex];

    /**
     * Format morphology breakdown for display
     */
    const formatMorphologyContent = useCallback((breakdown: MorphologyBreakdown): string => {
        let content = `# ${translate('headers.morphologicalDecomposition')}\n\n`;

        // Word with components in highlighted block
        content += `## ${translate('morphology.structure')}\n\n`;
        content += `\`\`\`\n`;
        content += breakdown.components.map(c => c.part).join(' + ');
        content += `\n\`\`\`\n\n`;
        content += `---\n\n`;

        // Component breakdown without emojis
        content += `## ${translate('morphology.components')}\n\n`;
        breakdown.components.forEach((component) => {
            const typeLabels: Record<string, string> = {
                'prefix': translate('morphology.componentTypes.prefix'),
                'root': translate('morphology.componentTypes.root'),
                'formative': translate('morphology.componentTypes.formative'),
                'ending': translate('morphology.componentTypes.ending'),
                'other': translate('morphology.componentTypes.other')
            };

            const typeLabel = typeLabels[component.type] || 'Componente';

            content += `### ${component.part}\n\n`;
            content += `> **${typeLabel}**\n>\n`;
            content += `> ${component.meaning}\n\n`;
        });

        content += `---\n\n`;

        // Summary in highlighted format
        if (breakdown.summary) {
            content += `## ${translate('morphology.synthesis')}\n\n`;
            content += `> [!TIP]\n`;
            content += `> **${translate('morphology.synthesis')}**\n>\n`;
            content += `> ${breakdown.summary}\n`;
        }

        return content;
    }, [translate]);

    /**
     * Handle action button click
     */
    const handleActionClick = useCallback(async (action: ActionType) => {
        if (!currentUnit) return;

        setActiveAction(action);

        switch (action) {
            case 'morphology': {
                // Check if already loaded in cache
                const existing = morphologyBreakdowns[currentUnit.id];
                if (existing) {
                    setCurrentContent({
                        type: 'morphology',
                        title: translate('headers.morphologicalDecomposition'),
                        content: formatMorphologyContent(existing),
                        morphologyData: existing,
                        greekWord: currentUnit.greekForm.text,
                        identification: currentUnit.identification,
                        passage,
                        timestamp: new Date()
                    });
                } else {
                    // Request it (parent component will handle the actual API call)
                    onRequestMorphology(currentUnit.id);
                }
                break;
            }

            case 'recognition': {
                setCurrentContent({
                    type: 'recognition',
                    title: translate('wordAnalysis.recognition.description'),
                    content: currentUnit.recognitionGuidance || translate('session.content.notAvailable'),
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
                    title: translate('wordAnalysis.context.description'),
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
                    title: translate('wordAnalysis.significance.description'),
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
                    title: translate('headers.comprehensionQuiz'),
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
                    title: translate('headers.readPassage'),
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
                    title: translate('headers.syntacticStructure'),
                    content: translate('session.content.analyzing'),
                    passage,
                    timestamp: new Date()
                });

                // Execute analysis asynchronously
                (async () => {
                    try {
                        // Step 1: Fetch complete passage data
                        // Fetching passage
                        const biblicalPassage = await greekTutorContext.getPassageText.execute(passage);

                        // Step 2 & 3: Use provided use case from context (Dependency Injection)
                        // No need to manually instantiate services or use cases - reuse the singleton from provider
                        const analyzeSyntaxUseCase = greekTutorContext.analyzePassageSyntax;

                        // Step 4: Execute analysis (with caching and user's language)
                        console.log('[useGreekTutorBoard] Analyzing syntax in language:', userLanguage);
                        const analysis = await analyzeSyntaxUseCase.execute(biblicalPassage, userLanguage);
                        // Analysis complete

                        // Step 5: Update content with results
                        setCurrentContent({
                            type: 'syntax',
                            title: translate('headers.syntacticStructure'),
                            content: analysis.structureDescription,
                            passage,
                            syntaxAnalysis: analysis,
                            timestamp: new Date()
                        });
                    } catch (error) {
                        console.error('[useGreekTutorBoard] Syntax analysis error:', error);

                        // Use a fallback object indicating error, handled by ContentBoard
                        setCurrentContent({
                            type: 'syntax',
                            title: translate('headers.syntacticStructure'),
                            content: translate('session.errors.syntaxFailed'), // ContentBoard shows a rich error view based on !syntaxAnalysis
                            passage,
                            // syntaxAnalysis: undefined, // Explicitly undefined to trigger error view
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
                title: translate('askTutor.responseTitle'),
                content: `**${translate('askTutor.yourQuestion')}** ${message}\n\n---\n\n${answer}`,
                greekWord: currentUnit?.greekForm.text,
                passage: passage,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Chat error:', error);
            setCurrentContent({
                type: 'chat',
                title: 'Error',
                content: `**${translate('askTutor.yourQuestion')}** ${message}\n\n❌ ${translate('session.errors.general')}`,
                timestamp: new Date()
            });
        } finally {
            setIsChatLoading(false);
        }
    }, [onChatMessage, currentUnit, passage]);

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
        // Export triggered
    }, []);

    // Update content when morphology is loaded
    const isLoadingMorphology = isMorphologyLoading === currentUnit?.id;

    // Reset content when unit changes (but not on initial load)
    useEffect(() => {
        if (isInitialLoad) {
            // Skip reset on first load to preserve auto-triggered content
            setIsInitialLoad(false);
            return;
        }

        // Auto-trigger morphology when user clicks on a different word
        if (currentUnit && handleActionClick) {
            handleActionClick('morphology');
        } else {
            // Fallback: clear content and active action
            setCurrentContent(null);
            setActiveAction(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUnit?.id, isInitialLoad]); // Removed handleActionClick and currentUnit to prevent re-trigger on state changes

    // Use useEffect to update content when morphology data arrives
    useEffect(() => {
        // If morphology was requested and just loaded, update content
        if (activeAction === 'morphology' && !isLoadingMorphology && currentUnit) {
            const breakdown = morphologyBreakdowns[currentUnit.id];
            if (breakdown && (!currentContent || currentContent.type !== 'morphology' || !currentContent.morphologyData)) {
                // Morphology data loaded
                setCurrentContent({
                    type: 'morphology',
                    title: translate('headers.morphologicalDecomposition'),
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
