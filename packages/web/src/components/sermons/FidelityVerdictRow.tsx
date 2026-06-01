import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, HelpCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { FidelityVerdict, FidelityVerdictKind } from '@dosfilos/domain';
import { cn } from '@/lib/utils';

interface Props {
    verdict: FidelityVerdict;
    /** Called when the pastor clicks the marker badge to jump to it in the prose. */
    onJumpToMarker?: (marker: number) => void;
}

/** Per-verdict icon + semantic-token tones. Labels come from i18n at render. */
const VERDICT_META: Record<
    FidelityVerdictKind,
    { icon: typeof CheckCircle2; tone: string; rowTone: string }
> = {
    supports: {
        icon: CheckCircle2,
        tone: 'text-success',
        rowTone: 'border-success/30',
    },
    partial: {
        icon: HelpCircle,
        tone: 'text-warning',
        rowTone: 'border-warning/30',
    },
    unrelated: {
        icon: AlertCircle,
        tone: 'text-info',
        rowTone: 'border-info/30',
    },
    contradicts: {
        icon: XCircle,
        tone: 'text-destructive',
        rowTone: 'border-destructive/30',
    },
};

export function FidelityVerdictRow({ verdict, onJumpToMarker }: Props) {
    const { t, i18n } = useTranslation('sermonDetail');
    const [expanded, setExpanded] = useState(false);
    const meta = VERDICT_META[verdict.verdict];
    const Icon = meta.icon;
    const confidencePct = Math.round(verdict.confidence * 100);
    const dateLocale = i18n.language.startsWith('en') ? 'en-US' : 'es-ES';
    const evaluatedAt = new Date(verdict.evaluatedAt).toLocaleString(dateLocale, {
        dateStyle: 'short',
        timeStyle: 'short',
    });

    return (
        <div
            className={cn(
                'rounded-md border bg-card/50 p-3 text-sm transition-colors',
                meta.rowTone,
                verdict.stale && 'opacity-60',
            )}
            data-testid={`fidelity-verdict-row-${verdict.marker}`}
        >
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={expanded ? t('fidelityReview.collapse') : t('fidelityReview.expand')}
                >
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', meta.tone)} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onJumpToMarker?.(verdict.marker)}
                                className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground/80 hover:bg-muted/80"
                                aria-label={t('fidelityReview.jumpToMarker', { marker: verdict.marker })}
                            >
                                [{verdict.marker}]
                            </button>
                            <span className={cn('text-xs font-medium uppercase tracking-wide', meta.tone)}>
                                {t(`fidelityReview.verdict.${verdict.verdict}`)}
                            </span>
                            {verdict.stale && (
                                <span className="text-xs text-muted-foreground">{t('fidelityReview.stale')}</span>
                            )}
                        </div>
                        <span className="text-xs text-muted-foreground">{confidencePct}%</span>
                    </div>
                    <p className="line-clamp-2 text-foreground/90">{verdict.claim}</p>
                    <p className="text-xs text-muted-foreground">
                        {verdict.citedSource.title}
                        {verdict.citedSource.author ? ` · ${verdict.citedSource.author}` : ''}
                    </p>
                    {expanded && (
                        <div className="mt-2 space-y-2 border-t border-border/60 pt-2 text-xs">
                            <div>
                                <p className="font-medium text-foreground/80">{t('fidelityReview.reasoning')}</p>
                                <p className="text-muted-foreground">{verdict.reasoning}</p>
                            </div>
                            <div>
                                <p className="font-medium text-foreground/80">{t('fidelityReview.citedExcerpt')}</p>
                                <p className="italic text-muted-foreground">"{verdict.citedSource.excerpt}"</p>
                            </div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {t('fidelityReview.modelLine', {
                                    model: verdict.modelUsed === 'sonnet' ? 'Sonnet 4.6' : 'Flash',
                                    date: evaluatedAt,
                                })}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
