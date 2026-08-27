import { Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ExegeticalUnit, type FidelityReview } from '@dosfilos/domain';

export interface RefinePreachableCtaProps {
    review: FidelityReview;
    addressedIssues: Set<number>;
    ignoredIssues: Set<number>;
    isRefining: boolean;
    onRefine: () => void;
    t: (key: string, opts?: Record<string, unknown>) => string;
}

export function RefinePreachableCta({
    review,
    addressedIssues,
    ignoredIssues,
    isRefining,
    onRefine,
    t,
}: RefinePreachableCtaProps) {
    const openCount = review.issues
        .filter((_, idx) => !addressedIssues.has(idx) && !ignoredIssues.has(idx))
        .length;
    if (openCount === 0) return null;
    return (
        <div className="mt-4 pt-4 border-t border-border/60 flex items-start gap-3">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                    {t('expository.results.fidelity.refineCtaTitle')}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                    {t('expository.results.fidelity.refineCtaBody', { count: openCount })}
                </p>
            </div>
            <Button
                type="button"
                size="sm"
                onClick={onRefine}
                disabled={isRefining}
                className="shrink-0"
            >
                {isRefining
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
                {isRefining
                    ? t('expository.results.fidelity.refining')
                    : t('expository.results.fidelity.refine')}
            </Button>
        </div>
    );
}

export interface StrictContinueCtaProps {
    units: ReadonlyArray<ExegeticalUnit>;
    confirmed: Set<string>;
    isRunning: boolean;
    onContinue: () => void;
    t: (key: string, opts?: Record<string, unknown>) => string;
}

export function StrictContinueCta({ units, confirmed, isRunning, onContinue, t }: StrictContinueCtaProps) {
    const total = units.length;
    const confirmedCount = units.filter((u) => confirmed.has(u.id)).length;
    const allConfirmed = confirmedCount === total && total > 0;
    return (
        <div className="mt-4 pt-4 border-t border-border/60 flex items-start gap-3">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                    {t('expository.passes.micro.strictCtaTitle')}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                    {t('expository.passes.micro.strictCtaBody', { confirmed: confirmedCount, total })}
                </p>
            </div>
            <Button
                type="button"
                size="sm"
                onClick={onContinue}
                disabled={!allConfirmed || isRunning}
                className="shrink-0"
                title={!allConfirmed ? (t('expository.passes.micro.strictBlocked') as string) : undefined}
            >
                {isRunning
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                {t('expository.passes.micro.strictContinue')}
            </Button>
        </div>
    );
}
