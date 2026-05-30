import { useState } from 'react';
import { CheckCircle2, AlertCircle, HelpCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { FidelityVerdict, FidelityVerdictKind } from '@dosfilos/domain';
import { cn } from '@/lib/utils';

interface Props {
    verdict: FidelityVerdict;
    /** Called when the pastor clicks the marker badge to jump to it in the prose. */
    onJumpToMarker?: (marker: number) => void;
}

const VERDICT_META: Record<
    FidelityVerdictKind,
    { label: string; icon: typeof CheckCircle2; tone: string; rowTone: string }
> = {
    supports: {
        label: 'Respalda',
        icon: CheckCircle2,
        tone: 'text-emerald-600 dark:text-emerald-400',
        rowTone: 'border-emerald-200 dark:border-emerald-900/60',
    },
    partial: {
        label: 'Parcial',
        icon: HelpCircle,
        tone: 'text-amber-600 dark:text-amber-400',
        rowTone: 'border-amber-200 dark:border-amber-900/60',
    },
    unrelated: {
        label: 'No respalda',
        icon: AlertCircle,
        tone: 'text-orange-600 dark:text-orange-400',
        rowTone: 'border-orange-200 dark:border-orange-900/60',
    },
    contradicts: {
        label: 'Contradice',
        icon: XCircle,
        tone: 'text-rose-600 dark:text-rose-400',
        rowTone: 'border-rose-200 dark:border-rose-900/60',
    },
};

export function FidelityVerdictRow({ verdict, onJumpToMarker }: Props) {
    const [expanded, setExpanded] = useState(false);
    const meta = VERDICT_META[verdict.verdict];
    const Icon = meta.icon;
    const confidencePct = Math.round(verdict.confidence * 100);

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
                    aria-label={expanded ? 'Contraer detalle' : 'Expandir detalle'}
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
                                aria-label={`Saltar al marcador ${verdict.marker} en el sermón`}
                            >
                                [{verdict.marker}]
                            </button>
                            <span className={cn('text-xs font-medium uppercase tracking-wide', meta.tone)}>
                                {meta.label}
                            </span>
                            {verdict.stale && (
                                <span className="text-xs text-muted-foreground">(obsoleto)</span>
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
                                <p className="font-medium text-foreground/80">Razonamiento</p>
                                <p className="text-muted-foreground">{verdict.reasoning}</p>
                            </div>
                            <div>
                                <p className="font-medium text-foreground/80">Extracto citado</p>
                                <p className="italic text-muted-foreground">"{verdict.citedSource.excerpt}"</p>
                            </div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Modelo: {verdict.modelUsed === 'sonnet' ? 'Sonnet 4.6' : 'Flash'} · {' '}
                                {new Date(verdict.evaluatedAt).toLocaleString('es-ES', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                })}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
