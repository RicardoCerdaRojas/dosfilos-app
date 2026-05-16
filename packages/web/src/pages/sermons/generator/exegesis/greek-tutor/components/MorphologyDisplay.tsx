import React from 'react';
import { Card } from '@/components/ui/card';
import { MorphologyBreakdown } from '@dosfilos/domain';
import { ComponentBadge } from './ComponentBadge';
import { InsightCard } from './InsightCard';
import { ArrowRight, GraduationCap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from '@/i18n';

export interface MorphologyDisplayProps {
    breakdown: MorphologyBreakdown;
}

const COMPONENT_BORDER_CLASS: Record<string, string> = {
    prefix: 'border-l-info',
    root: 'border-l-success',
    formative: 'border-l-warning',
    ending: 'border-l-primary',
};

export const MorphologyDisplay: React.FC<MorphologyDisplayProps> = ({ breakdown }) => {
    const { t } = useTranslation('greekTutor');

    const getComponentLabel = (type: string): string => {
        switch (type) {
            case 'prefix': return t('morphology.componentTypes.prefix');
            case 'root': return t('morphology.componentTypes.root');
            case 'formative': return t('morphology.componentTypes.formative');
            case 'ending': return t('morphology.componentTypes.ending');
            default: return t('morphology.componentTypes.other');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Pedagogical Tip — surfaced at top so users read the guidance before working through components */}
            <Card className="border-warning/30 bg-warning-subtle/40">
                <div className="p-3 flex items-start gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-warning/15 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-warning" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold text-warning-subtle-foreground uppercase tracking-wide">
                            {t('morphology.pedagogicalTip')}
                        </h4>
                        <p className="text-sm text-foreground/90 leading-relaxed">
                            {t('morphology.tipContent')}
                        </p>
                    </div>
                </div>
            </Card>

            <div>
                <h5 className="text-sm text-muted-foreground">
                    {t('morphology.analysisTitle')}
                </h5>
            </div>

            <div className="space-y-3">
                <h3 className="text-lg font-bold text-foreground">{t('morphology.structure')}</h3>
                <Card className="p-6 bg-gradient-to-br from-muted/50 to-background border-2">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        {breakdown.components.map((component, idx) => (
                            <React.Fragment key={idx}>
                                <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                    <div className="px-4 py-3 bg-primary/10 border-2 border-primary/30 rounded-lg hover:scale-105 transition-transform">
                                        <span className="text-2xl font-mono font-bold text-primary">
                                            {component.part}
                                        </span>
                                    </div>
                                    <ComponentBadge
                                        type={component.type}
                                        label={getComponentLabel(component.type)}
                                    />
                                </div>
                                {idx < breakdown.components.length - 1 && (
                                    <ArrowRight className="w-6 h-6 text-muted-foreground shrink-0 hidden sm:block" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </Card>
            </div>

            <div className="border-t border-border" />

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-foreground">{t('morphology.components')}</h3>
                <div className="grid gap-4 sm:grid-cols-1">
                    {breakdown.components.map((component, idx) => (
                        <Card
                            key={idx}
                            className={`p-5 border-l-4 hover:shadow-md transition-all duration-300 animate-in slide-in-from-left ${COMPONENT_BORDER_CLASS[component.type] ?? 'border-l-muted-foreground'}`}
                            style={{ animationDelay: `${idx * 150}ms` }}
                        >
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-3xl font-mono font-bold text-foreground">
                                        {component.part}
                                    </span>
                                    <ComponentBadge
                                        type={component.type}
                                        label={getComponentLabel(component.type)}
                                    />
                                </div>
                                <p className="text-base text-foreground/90 leading-relaxed pl-1">
                                    {component.meaning}
                                </p>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {breakdown.summary && (
                <>
                    <div className="border-t border-border" />
                    <InsightCard title={t('morphology.synthesis')}>
                        <div className="prose prose-sm dark:prose-invert max-w-none
                                        prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:my-0
                                        prose-strong:text-foreground prose-strong:font-bold">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {breakdown.summary}
                            </ReactMarkdown>
                        </div>
                    </InsightCard>
                </>
            )}
        </div>
    );
};
