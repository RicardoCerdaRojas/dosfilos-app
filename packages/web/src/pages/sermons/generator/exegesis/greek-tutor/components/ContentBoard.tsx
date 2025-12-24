import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EducationalCapsule } from './EducationalCapsule';
import { getRandomCapsule } from '../constants/greekCapsules';
import { MorphologyDisplay } from './MorphologyDisplay';
import { RecognitionGuideDisplay } from './RecognitionGuideDisplay';
import { ContextFunctionDisplay } from './ContextFunctionDisplay';
import { TheologicalSignificanceDisplay } from './TheologicalSignificanceDisplay';
import { QuizSection } from './QuizSection';
import { PassageReader } from './PassageReader';
import { PassageSyntaxView } from './PassageSyntaxView';
import { BiblicalPassage, PassageSyntaxAnalysis } from '@dosfilos/domain';
import { useGreekTutor } from '../GreekTutorProvider';
import { MorphologyBreakdown } from '@dosfilos/domain';
import { TutorResponseDisplay } from './TutorResponseDisplay';

export interface BoardContent {
    type: 'morphology' | 'recognition' | 'context' | 'significance' | 'chat' | 'quiz' | 'passage' | 'syntax';
    title: string;
    content: string;
    timestamp: Date;
    morphologyData?: MorphologyBreakdown; // For visual rendering
    greekWord?: string; // Greek word being studied
    identification?: string; // Grammatical identification
    passage?: string; // Bible passage reference
    syntaxAnalysis?: PassageSyntaxAnalysis; // For syntax view
}

export interface ContentBoardProps {
    content: BoardContent | null;
    isLoading: boolean;
    onWordClick?: (wordIndex: number) => void; // For word click in syntax analysis
    // Phase 3A: Quiz integration
    currentUnit?: import('@dosfilos/domain').TrainingUnit;
    units?: import('@dosfilos/domain').TrainingUnit[]; // For passage reader
    sessionId?: string;
    fileSearchStoreId?: string;
    onUnitAdded?: (unit: import('@dosfilos/domain').TrainingUnit) => void; // Callback when new unit is added from passage reader
    onSaveInsight?: (data: {
        title?: string;
        content: string;
        question: string;
        tags: string[];
        greekWord?: string;
        passage?: string;
    }) => Promise<void>; // Callback to save tutor responses as insights
}

/**
 * Content board - main display area showing tutor responses.
 * Follows Single Responsibility - renders markdown content with utilities.
 */
export const ContentBoard: React.FC<ContentBoardProps> = ({
    content,
    isLoading,
    onWordClick,
    currentUnit,
    units = [],
    sessionId,
    fileSearchStoreId,
    onUnitAdded,
    onSaveInsight
}) => {
    const [currentCapsule, setCurrentCapsule] = useState(() => getRandomCapsule());
    const { generateQuiz, submitQuizAnswer } = useGreekTutor();

    const handleRefreshCapsule = () => {
        setCurrentCapsule(getRandomCapsule());
    };

    // Empty state with educational capsule
    if (!content && !isLoading) {
        return (
            <div className="h-full flex items-start justify-start p-8 pt-12 bg-gradient-to-br from-background via-muted/20 to-background overflow-auto">
                <EducationalCapsule 
                    capsule={currentCapsule}
                    onRefresh={handleRefreshCapsule}
                />
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="h-full flex items-start justify-start pt-20">
                <div className="text-center space-y-4 w-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">
                        Consultando con el tutor...
                    </p>
                </div>
            </div>
        );
    }

    // Content display
    if (!content) return null;

    return (
        <div className="h-full flex flex-col">
            {/* Scrollable content area - header is now in parent */}
            <ScrollArea className="flex-1">
                <div className="p-6 max-w-5xl mx-auto">
                    {/* Use visual component for morphology when data is available */}
                    {(() => {
                        if (content.type === 'morphology' && content.morphologyData) {
                            return <MorphologyDisplay breakdown={content.morphologyData} />;
                        }
                        
                        if (content.type === 'recognition' && content.greekWord && content.identification) {
                            return (
                                <RecognitionGuideDisplay
                                    content={content.content}
                                    greekWord={content.greekWord}
                                    identification={content.identification}
                                />
                            );
                        }
                        
                        if (content.type === 'context' && content.greekWord && content.passage) {
                            return (
                                <ContextFunctionDisplay
                                    content={content.content}
                                    greekWord={content.greekWord}
                                    passage={content.passage}
                                />
                            );
                        }
                        
                        if (content.type === 'quiz' && currentUnit && sessionId) {
                            return (
                                <div className="space-y-4">
                                    <h5 className="text-muted-foreground">
                                        Pon a prueba lo que has aprendido sobre <span className="font-mono text-primary">{currentUnit.greekForm.text}</span>
                                    </h5>
                                    <QuizSection
                                        unit={currentUnit}
                                        sessionId={sessionId}
                                        generateQuizUseCase={generateQuiz}
                                        submitQuizAnswerUseCase={submitQuizAnswer}
                                        fileSearchStoreId={fileSearchStoreId}
                                    />
                                </div>
                            );
                        }
                        
                        if (content.type === 'passage' && content.passage && sessionId) {
                            return <PassageReaderWrapper 
                                passage={content.passage}
                                sessionId={sessionId}
                                units={units}
                                fileSearchStoreId={fileSearchStoreId}
                                onUnitAdded={onUnitAdded}
                            />;
                        }
                        
                        // Syntax Analysis View
                        if (content.type === 'syntax' && content.syntaxAnalysis) {
                            return (
                                <Card className="p-6 md:p-8 shadow-sm">
                                    <PassageSyntaxView 
                                        analysis={content.syntaxAnalysis} 
                                        onWordClick={onWordClick}
                                    />
                                </Card>
                            );
                        }
                        
                        if (content.type === 'significance' && content.greekWord && content.passage) {
                            return (
                                <TheologicalSignificanceDisplay
                                    content={content.content}
                                    greekWord={content.greekWord}
                                    passage={content.passage}
                                />
                            );
                        }
                        
                        // Chat responses with enhanced design
                        if (content.type === 'chat') {
                            // Extract question and answer from content
                            const parts = content.content.split('\n\n---\n\n');
                            const questionLine = parts[0]?.replace('**Tu pregunta:** ', '') || '';
                            const answer = parts[1] || content.content;
                            
                            return (
                                <TutorResponseDisplay
                                    question={questionLine}
                                    answer={answer}
                                    greekWord={content.greekWord}
                                    passage={content.passage}
                                    onSaveInsight={onSaveInsight}
                                />
                            );
                        }
                        
                        // Fallback to markdown for all other types or when data is missing
                        return (
                            <Card className="p-6 md:p-8 shadow-sm">
                                <div className="prose prose-slate dark:prose-invert max-w-none 
                                              prose-headings:font-bold prose-headings:tracking-tight
                                              prose-h1:text-2xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                                              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
                                              prose-p:leading-relaxed prose-p:mb-4
                                              prose-li:leading-relaxed
                                              prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-medium
                                              prose-pre:bg-muted prose-pre:border prose-pre:border-border
                                              prose-strong:text-foreground prose-strong:font-semibold
                                              prose-blockquote:border-l-4 prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r prose-blockquote:not-italic
                                              prose-hr:border-border prose-hr:my-8">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {content.content}
                                    </ReactMarkdown>
                                </div>
                            </Card>
                        );
                    })()}
                </div>
            </ScrollArea>
        </div>
    );
};

/**
 * Wrapper component to handle passage loading
 */
const PassageReaderWrapper: React.FC<{
    passage: string;
    sessionId: string;
    units: import('@dosfilos/domain').TrainingUnit[];
    fileSearchStoreId?: string;
    onUnitAdded?: (unit: import('@dosfilos/domain').TrainingUnit) => void;
}> = ({ passage, sessionId, units, fileSearchStoreId, onUnitAdded }) => {
    const [biblicalPassage, setBiblicalPassage] = useState<BiblicalPassage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { getPassageText } = useGreekTutor();

    useEffect(() => {
        const loadPassage = async () => {
            // Loading passage
            setIsLoading(true);
            setError(null);
            
            try {
                const result = await getPassageText.execute(passage, fileSearchStoreId);
                setBiblicalPassage(result);
                // Passage loaded successfully
            } catch (err) {
                console.error('[PassageReaderWrapper] Error loading passage:', err);
                setError(err instanceof Error ? err.message : 'Error al cargar pasaje');
            } finally {
                setIsLoading(false);
            }
        };

        if (passage) {
            loadPassage();
        }
    }, [passage, fileSearchStoreId]);

    return (
        <PassageReader
            passage={biblicalPassage}
            sessionId={sessionId}
            currentUnits={units}
            fileSearchStoreId={fileSearchStoreId}
            isLoading={isLoading}
            onUnitAdded={onUnitAdded}
        />
    );
};
