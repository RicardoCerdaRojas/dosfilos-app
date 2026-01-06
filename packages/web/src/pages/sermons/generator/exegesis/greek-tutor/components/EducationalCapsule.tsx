import React from 'react';
import { Card } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import { GreekCapsule } from '../constants/greekCapsules';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from '@/i18n';

export interface EducationalCapsuleProps {
    capsule: GreekCapsule;
    onRefresh?: () => void;
}

/**
 * Educational capsule component for the empty state of the Greek Tutor board.
 * Displays educational content about Biblical Greek concepts.
 */
export const EducationalCapsule: React.FC<EducationalCapsuleProps> = ({ 
    capsule,
    onRefresh 
}) => {
    const { t } = useTranslation('greekTutor');
    
    return (
        <div className="max-w-3xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Lightbulb className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-foreground">{t('concepts.keyConceptTitle')}</h3>
                    <p className="text-xs text-muted-foreground">{t('concepts.keyConceptSubt

itle')}</p>
                </div>
            </div>

            {/* Content Card */}
            <Card className="p-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-md">
                <div className="space-y-6">
                    {/* Title */}
                    <h4 className="text-2xl font-bold text-primary leading-tight">
                        {capsule.title}
                    </h4>

                    {/* Content with proper markdown rendering */}
                    <div className="prose prose-slate dark:prose-invert max-w-none
                                    prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-3
                                    prose-strong:text-foreground prose-strong:font-bold
                                    prose-ul:space-y-2 prose-li:text-foreground/90
                                    prose-headings:text-foreground prose-headings:font-bold">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {capsule.content}
                        </ReactMarkdown>
                    </div>

                    {/* Example if present */}
                    {capsule.example && (
                        <div className="pt-6 border-t border-primary/20">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                {t('concepts.practicalExample')}
                            </p>
                            <blockquote className="border-l-4 border-primary pl-4 py-3 bg-primary/5 rounded-r">
                                <p className="text-sm text-foreground/90 italic leading-relaxed m-0">
                                    {capsule.example}
                                </p>
                            </blockquote>
                        </div>
                    )}
                </div>
            </Card>

            {/* Instruction */}
            <div className="text-center space-y-2 py-2">
                <p className="text-sm text-muted-foreground">
                    {t('concepts.selectActionPrompt')}
                </p>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors font-medium"
                    >
                        {t('concepts.seeOtherConcept')}
                    </button>
                )}
            </div>
        </div>
    );
};
