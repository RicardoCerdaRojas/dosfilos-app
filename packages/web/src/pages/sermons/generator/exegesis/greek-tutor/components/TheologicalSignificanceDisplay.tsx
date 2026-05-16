import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Book, MessageSquare, Lightbulb, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { QuizSection } from './QuizSection';
import { useGreekTutor } from '../GreekTutorProvider';
import { TrainingUnit } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';

export interface TheologicalSignificanceDisplayProps {
    content: string;
    greekWord: string;
    passage: string;
    unit?: TrainingUnit;
    sessionId?: string;
    fileSearchStoreId?: string;
}

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
    const { t } = useTranslation('greekTutor');

    const extractPreachingPoints = (markdown: string): string[] => {
        const points: string[] = [];
        const lines = markdown.split('\n');
        for (const line of lines) {
            const bulletMatch = line.match(/^[\s]*[-*]\s+(.+)/);
            const numberMatch = line.match(/^[\s]*\d+[\.\)]\s+(.+)/);
            if (bulletMatch && bulletMatch[1]) {
                points.push(bulletMatch[1].trim());
            } else if (numberMatch && numberMatch[1]) {
                points.push(numberMatch[1].trim());
            }
        }
        return points.slice(0, 5);
    };

    const preachingPoints = extractPreachingPoints(content);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h5 className="text-sm text-muted-foreground">
                    {t('studyUnit.theology.pastoralImplications', { word: greekWord, passage })}
                </h5>
            </div>

            <div>
                <h3 className="text-lg font-bold mb-4">{t('studyUnit.theology.textToPulpit')}</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="p-4 border-l-4 border-l-info bg-info-subtle/40 hover:shadow-md transition-all">
                        <div className="space-y-3">
                            <div className="w-10 h-10 rounded-lg bg-info/15 flex items-center justify-center">
                                <Book className="w-5 h-5 text-info" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-1">{t('studyUnit.theology.step1Title')}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {t('studyUnit.theology.step1Desc')}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 border-l-4 border-l-primary bg-primary/5 hover:shadow-md transition-all">
                        <div className="space-y-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                                <Lightbulb className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-1">{t('studyUnit.theology.step2Title')}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {t('studyUnit.theology.step2Desc')}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 border-l-4 border-l-success bg-success-subtle/40 hover:shadow-md transition-all">
                        <div className="space-y-3">
                            <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-success" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-1">{t('studyUnit.theology.step3Title')}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {t('studyUnit.theology.step3Desc')}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="border-t border-border" />

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

            {preachingPoints.length > 0 && (
                <Card className="border-2 border-warning/30 bg-warning-subtle/40">
                    <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 text-warning" />
                            </div>
                            <h4 className="text-sm font-bold text-warning-subtle-foreground uppercase tracking-wide">
                                {t('studyUnit.theology.preachingPoints')}
                            </h4>
                        </div>
                        <ul className="space-y-2">
                            {preachingPoints.map((point, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                    <span className="text-warning mt-0.5">→</span>
                                    <span className="text-foreground/90 leading-relaxed">{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>
            )}

            <Card className="border-2 border-primary/30 bg-primary/5">
                <button
                    onClick={() => setQuestionsExpanded(!questionsExpanded)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-primary/10 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                            <Lightbulb className="w-4 h-4 text-primary" />
                        </div>
                        <h4 className="text-sm font-bold text-primary uppercase tracking-wide">
                            {t('studyUnit.theology.reflectiveQuestionsTitle')}
                        </h4>
                    </div>
                    {questionsExpanded ? (
                        <ChevronDown className="w-5 h-5 text-primary" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-primary" />
                    )}
                </button>

                {questionsExpanded && (
                    <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top duration-300">
                        <div className="border-t border-primary/20 pt-3 space-y-2">
                            {(t('studyUnit.theology.reflectiveQuestions', { returnObjects: true }) as string[]).map((question, idx) => (
                                <p key={idx} className="text-sm text-foreground/90 leading-relaxed">
                                    • {question}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            <Card className="border-2 border-success/30 bg-success-subtle/40">
                <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
                            <Book className="w-4 h-4 text-success" />
                        </div>
                        <h4 className="text-sm font-bold text-success-subtle-foreground uppercase tracking-wide">
                            {t('studyUnit.theology.pastoralAdvice')}
                        </h4>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                        {t('studyUnit.theology.pastoralText')}
                    </p>
                </div>
            </Card>

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
