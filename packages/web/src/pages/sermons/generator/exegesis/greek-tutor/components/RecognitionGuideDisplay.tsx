import React from 'react';
import { Card } from '@/components/ui/card';
import { Eye, CheckCircle2, AlertTriangle } from 'lucide-react';
import { StepIndicator, Step } from './StepIndicator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface RecognitionGuideDisplayProps {
    content: string; // Markdown content from backend
    greekWord: string;
    identification: string; // e.g., "Presente Activo Indicativo..."
}

/**
 * Visual component for displaying recognition guidance.
 * Transforms markdown content into a structured, pedagogical visual guide.
 * Following Single Responsibility - handles recognition display only.
 */
export const RecognitionGuideDisplay: React.FC<RecognitionGuideDisplayProps> = ({
    content,
    greekWord,
    identification
}) => {
    // Parse markdown to extract steps if formatted properly
    // For MVP, we'll render markdown but add visual enhancements
    const parseStepsFromMarkdown = (markdown: string): Step[] | null => {
        // Try to detect numbered list pattern in markdown
        const lines = markdown.split('\n');
        const steps: Step[] = [];
        let currentNumber = 1;

        for (const line of lines) {
            // Match patterns like "1. ", "1) ", or "**1.**"
            const match = line.match(/^[\s]*(?:\*\*)?(\d+)[\.\)]\s*(?:\*\*)?(.+)/);
            if (match && match[2]) {
                steps.push({
                    number: currentNumber++,
                    title: match[2].replace(/\*\*/g, '').trim(),
                    description: '' // Will be filled from following lines if needed
                });
            }
        }

        return steps.length > 0 ? steps : null;
    };

    const detectedSteps = parseStepsFromMarkdown(content);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h5 className="text-sm text-muted-foreground">
                    Guía paso a paso para identificar <span className="font-mono text-primary">{greekWord}</span>
                </h5>
            </div>

            {/* Identification Summary Card */}
            <Card className="p-5 bg-gradient-to-br from-primary/10 to-purple-500/5 border-2 border-primary/20">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <Eye className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-primary uppercase tracking-wide mb-1">
                            Identificación
                        </h3>
                        <p className="text-base leading-relaxed text-foreground">
                            {identification}
                        </p>
                    </div>
                </div>
            </Card>

            <div className="border-t border-border" />

            {/* Render steps if detected, otherwise markdown */}
            {detectedSteps ? (
                <>
                    <div>
                        <h3 className="text-lg font-bold mb-4">Pasos para reconocer</h3>
                        <StepIndicator steps={detectedSteps} />
                    </div>
                </>
            ) : (
                <Card className="p-6 md:p-8">
                    <div className="prose prose-slate dark:prose-invert max-w-none
                                  prose-headings:font-bold prose-headings:tracking-tight
                                  prose-h1:text-2xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                                  prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
                                  prose-p:leading-relaxed prose-p:mb-4
                                  prose-li:leading-relaxed
                                  prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                                  prose-strong:text-foreground prose-strong:font-semibold
                                  prose-blockquote:border-l-primary prose-blockquote:bg-primary/5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                </Card>
            )}

            {/* Quick Reference Tip */}
            <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5">
                <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <h4 className="text-sm font-bold text-green-900 dark:text-green-100 uppercase tracking-wide">
                            Consejo Práctico
                        </h4>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                        Al identificar formas verbales griegas, busca primero la <strong>terminación</strong> para determinar 
                        persona y número, luego el <strong>tema temporal</strong> para el tiempo, y finalmente 
                        analiza prefijos (aumento, reduplicación) para confirmar el aspecto.
                    </p>
                </div>
            </Card>

            {/* Warning about similar forms */}
            <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
                <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                        </div>
                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wide">
                            ¡Atención!
                        </h4>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                        Algunas formas son visualmente similares pero funcionan diferente. Presta especial atención 
                        al contexto sintáctico para distinguir entre formas que comparten terminaciones idénticas.
                    </p>
                </div>
            </Card>
        </div>
    );
};
