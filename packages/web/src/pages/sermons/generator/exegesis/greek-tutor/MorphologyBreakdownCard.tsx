import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { MorphologyBreakdown } from '@dosfilos/domain';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MorphologyBreakdownCardProps {
    word: string;
    breakdown: MorphologyBreakdown | null;
    isLoading: boolean;
    onRequestBreakdown: () => void;
}

export const MorphologyBreakdownCard: React.FC<MorphologyBreakdownCardProps> = ({
    word,
    breakdown,
    isLoading,
    onRequestBreakdown
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!isExpanded && !breakdown) {
        return (
            <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                    setIsExpanded(true);
                    if (!breakdown) onRequestBreakdown();
                }}
                className="w-full justify-start text-muted-foreground hover:text-primary"
            >
                <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                ¿Cómo identificar esta forma?
            </Button>
        );
    }

    return (
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-left mb-2"
            >
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span className="font-semibold text-amber-900 dark:text-amber-100">
                        Descomposición Morfológica
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-amber-600" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-amber-600" />
                )}
            </button>

            {isExpanded && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                        </div>
                    ) : breakdown ? (
                        <>
                            {/* Word with components */}
                            <div className="font-mono text-2xl text-center p-4 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                    {breakdown.components.map((component, idx) => (
                                        <div key={idx} className="relative group">
                                            <span className="text-amber-900 dark:text-amber-100 font-bold">
                                                {component.part}
                                            </span>
                                            {idx < breakdown.components.length - 1 && (
                                                <span className="text-amber-400 mx-0.5">+</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Components breakdown */}
                            <div className="space-y-2">
                                {breakdown.components.map((component, idx) => (
                                    <div
                                        key={idx}
                                        className="flex gap-3 items-start p-3 bg-white dark:bg-slate-900 rounded-md border border-amber-100 dark:border-amber-900"
                                    >
                                        <div className="font-mono font-bold text-amber-700 dark:text-amber-300 min-w-[80px]">
                                            {component.part}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
                                                {component.type === 'prefix' && '🔤 Prefijo'}
                                                {component.type === 'root' && '🌱 Raíz'}
                                                {component.type === 'formative' && '🔧 Formativo'}
                                                {component.type === 'ending' && '🎯 Terminación'}
                                                {component.type === 'other' && '📝 Otro'}
                                            </div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300">
                                                {component.meaning}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Summary */}
                            {breakdown.summary && (
                                <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg border-l-4 border-amber-500">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-2">
                                        💡 Resumen
                                    </div>
                                    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {breakdown.summary}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-center text-muted-foreground">
                            No se pudo cargar la descomposición
                        </p>
                    )}
                </div>
            )}
        </Card>
    );
};
