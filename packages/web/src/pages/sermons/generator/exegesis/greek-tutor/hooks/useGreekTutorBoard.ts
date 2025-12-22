import { useState, useCallback } from 'react';
import { TrainingUnit, MorphologyBreakdown } from '@dosfilos/domain';
import { ActionType } from '../components/InteractionPanel';

export interface BoardContent {
    type: ActionType | 'chat';
    title: string;
    content: string;
    timestamp: Date;
}

interface UseGreekTutorBoardProps {
    units: TrainingUnit[];
    currentIndex: number;
    morphologyBreakdowns: Record<string, MorphologyBreakdown>;
    onRequestMorphology: (unitId: string) => void;
    onChatMessage: (message: string) => Promise<string>;
    isMorphologyLoading: string | null;
}


interface UseGreekTutorBoardReturn {
    currentContent: BoardContent | null;
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
    isMorphologyLoading
}: UseGreekTutorBoardProps): UseGreekTutorBoardReturn => {

    const [currentContent, setCurrentContent] = useState<BoardContent | null>(null);
    const [activeAction, setActiveAction] = useState<ActionType | null>(null);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const currentUnit = units[currentIndex];

    /**
     * Format morphology breakdown for display
     */
    const formatMorphologyContent = useCallback((breakdown: MorphologyBreakdown): string => {
        let content = `# Descomposición Morfológica\n\n`;

        // Word with components
        content += `## Estructura\n\n`;
        content += `\`\`\`\n`;
        content += breakdown.components.map(c => c.part).join(' + ');
        content += `\n\`\`\`\n\n`;

        // Component breakdown
        content += `## Componentes\n\n`;
        breakdown.components.forEach((component, idx) => {
            const typeLabels = {
                'prefix': '🔤 Prefijo',
                'root': '🌱 Raíz',
                'formative': '🔧 Formativo',
                'ending': '🎯 Terminación',
                'other': '📝 Otro'
            };

            content += `### ${component.part}\n`;
            content += `**${typeLabels[component.type]}**\n\n`;
            content += `${component.meaning}\n\n`;
        });

        // Summary
        if (breakdown.summary) {
            content += `## 💡 Resumen\n\n`;
            content += `${breakdown.summary}\n`;
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
                    setCurrentContent({
                        type: 'morphology',
                        title: 'Descomposición Morfológica',
                        content: formatMorphologyContent(existing),
                        timestamp: new Date()
                    });
                } else {
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
                    timestamp: new Date()
                });
                break;
            }

            case 'context': {
                setCurrentContent({
                    type: 'context',
                    title: 'Función en Contexto',
                    content: currentUnit.functionInContext,
                    timestamp: new Date()
                });
                break;
            }

            case 'significance': {
                setCurrentContent({
                    type: 'significance',
                    title: 'Significado Teológico',
                    content: currentUnit.significance,
                    timestamp: new Date()
                });
                break;
            }
        }
    }, [currentUnit, morphologyBreakdowns, onRequestMorphology, formatMorphologyContent]);

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

    // If morphology was requested and just loaded, update content
    if (activeAction === 'morphology' && !isLoadingMorphology && currentUnit) {
        const breakdown = morphologyBreakdowns[currentUnit.id];
        if (breakdown && currentContent?.type !== 'morphology') {
            setCurrentContent({
                type: 'morphology',
                title: 'Descomposición Morfológica',
                content: formatMorphologyContent(breakdown),
                timestamp: new Date()
            });
        }
    }

    return {
        currentContent,
        isLoading: isLoadingMorphology || isChatLoading,
        handleActionClick,
        handleChatMessage,
        handleCopy,
        handleExport,
        activeAction
    };
};
