import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Book, MessageSquare, Lightbulb, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { QuizSection } from './QuizSection';
import { useGreekTutor } from '../GreekTutorProvider';
import { TrainingUnit } from '@dosfilos/domain';

export interface TheologicalSignificanceDisplayProps {
    content: string; // Markdown content from backend
    greekWord: string;
    passage: string;
    // Phase 3A: Quiz integration
    unit?: TrainingUnit;
    sessionId?: string;
    fileSearchStoreId?: string;
}

/**
 * Visual component for displaying theological significance.
 * Presents the pastoral and homiletical implications of the Greek form.
 * Following Single Responsibility - handles theological display only.
 */
export const TheologicalSignificanceDisplay: React.FC<TheologicalSignificanceDisplayProps> = ({
    content,
    greekWord,
    passage,
    unit,
    sessionId,
    fileSearchStoreId
}) => {
    const [questionsExpanded, setQuestionsExpanded] = useState(false);
    const { generateQuiz, submitQuizAnswer } = useGreekTutor();

    // Parse content to extract preaching points if formatted
    const extractPreachingPoints = (markdown: string): string[] => {
        const points: string[] = [];
        const lines = markdown.split('\n');

        for (const line of lines) {
            // Look for bullet points or numbered lists
            const bulletMatch = line.match(/^[\s]*[-*]\s+(.+)/);
            const numberMatch = line.match(/^[\s]*\d+[\.\)]\s+(.+)/);
            
            if (bulletMatch && bulletMatch[1]) {
                points.push(bulletMatch[1].trim());
            } else if (numberMatch && numberMatch[1]) {
                points.push(numberMatch[1].trim());
            }
        }

        return points.slice(0, 5); // Limit to first 5 points
    };

    const preachingPoints = extractPreachingPoints(content);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h5 className="text-sm text-muted-foreground">
                    Implicaciones pastorales de <span className="font-mono text-primary">{greekWord}</span> en {passage}
                </h5>
            </div>

            {/* Del Texto al Púlpito - Flow Cards */}
            <div>
                <h3 className="text-lg font-bold mb-4">Del Texto al Púlpito</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Step 1: Exégesis */}
                    <Card className="p-4 border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/10 to-blue-500/5 hover:shadow-md transition-all">
                        <div className="space-y-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Book className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-1">1. Exégesis</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Descubre el significado original en el contexto griego
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Step 2: Teología */}
                    <Card className="p-4 border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/10 to-purple-500/5 hover:shadow-md transition-all">
                        <div className="space-y-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <Lightbulb className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-1">2. Teología</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Conecta con la doctrina y el evangelio
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Step 3: Aplicación */}
                    <Card className="p-4 border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/10 to-green-500/5 hover:shadow-md transition-all">
                        <div className="space-y-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-1">3. Aplicación</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Proclama con fidelidad y relevancia pastoral
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="border-t border-border" />

            {/* Main Content */}
            <Card className="p-6 md:p-8">
                <div className="prose prose-slate dark:prose-invert max-w-none
                              prose-headings:font-bold prose-headings:tracking-tight
                              prose-h1:text-2xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
                              prose-p:leading-relaxed prose-p:mb-4
                              prose-li:leading-relaxed
                              prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                              prose-strong:text-foreground prose-strong:font-semibold
                              prose-blockquote:border-l-primary prose-blockquote:bg-primary/5
                              prose-ul:list-disc prose-ul:pl-6
                              prose-ol:list-decimal prose-ol:pl-6">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                    </ReactMarkdown>
                </div>
            </Card>

            {/* Preaching Points - if detected */}
            {preachingPoints.length > 0 && (
                <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
                    <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 text-amber-600" />
                            </div>
                            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wide">
                                Puntos de Predicación
                            </h4>
                        </div>
                        <ul className="space-y-2">
                            {preachingPoints.map((point, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                    <span className="text-amber-600 mt-0.5">→</span>
                                    <span className="text-foreground/90 leading-relaxed">{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>
            )}

            {/* Reflective Questions - Accordion */}
            <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/5">
                <button
                    onClick={() => setQuestionsExpanded(!questionsExpanded)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-purple-500/5 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Lightbulb className="w-4 h-4 text-purple-600" />
                        </div>
                        <h4 className="text-sm font-bold text-purple-900 dark:text-purple-100 uppercase tracking-wide">
                            Preguntas Reflexivas
                        </h4>
                    </div>
                    {questionsExpanded ? (
                        <ChevronDown className="w-5 h-5 text-purple-600" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-purple-600" />
                    )}
                </button>
                
                {questionsExpanded && (
                    <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top duration-300">
                        <div className="border-t border-purple-500/20 pt-3 space-y-2">
                            <p className="text-sm text-foreground/90 leading-relaxed">
                                • ¿Cómo cambia este detalle gramatical tu comprensión del pasaje?
                            </p>
                            <p className="text-sm text-foreground/90 leading-relaxed">
                                • ¿Qué verdad teológica resalta esta construcción griega?
                            </p>
                            <p className="text-sm text-foreground/90 leading-relaxed">
                                • ¿Cómo puedes comunicar esta profundidad exegética a tu congregación de manera accesible?
                            </p>
                            <p className="text-sm text-foreground/90 leading-relaxed">
                                • ¿Qué aplicación pastoral surge de este insight?
                            </p>
                        </div>
                    </div>
                )}
            </Card>

            {/* Pastoral Application Tip */}
            <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-green-500/5">
                <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <Book className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100 uppercase tracking-wide">
                            Consejo Pastoral
                        </h4>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                        El conocimiento del griego es un <strong>regalo pastoral</strong>, no un adorno académico. 
                        Usa estos insights para alimentar a tu rebaño con la Palabra de Dios en su riqueza original, 
                        pero siempre traduce la profundidad exegética a la claridad homilética.
                    </p>
                </div>
            </Card>
            
            {/* Phase 3A: Interactive Quiz Section */}
            {unit && sessionId && (
                <div className="border-t border-border pt-6">
                    <QuizSection
                        unit={unit}
                        sessionId={sessionId}
                        generateQuizUseCase={generateQuiz}
                        submitQuizAnswerUseCase={submitQuizAnswer}
                        fileSearchStoreId={fileSearchStoreId}
                    />
                </div>
            )}
        </div>
    );
};
