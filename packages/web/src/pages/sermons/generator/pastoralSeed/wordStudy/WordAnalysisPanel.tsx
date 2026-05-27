import { useTranslation } from '@/i18n';
import { Loader2, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { KeyWordCandidate, PastoralWordAnalysis, WordStudyLanguage } from '@dosfilos/domain';
import { ResonanceCard } from './ResonanceCard';

interface Props {
    selected: KeyWordCandidate | null;
    language: WordStudyLanguage;
    analysis: PastoralWordAnalysis | null;
    cacheHit: boolean | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

/**
 * Pastoral Fidelity Phase 1.5 — pane 2 of the modal. Pure render
 * component: receives analysis state from the parent modal (which owns
 * the `useAnalyzeWordPastorally` hook so the cache id can be threaded
 * down to `DiscoveryEditor`).
 */
export function WordAnalysisPanel({
    selected,
    language,
    analysis,
    cacheHit,
    loading,
    error,
    onRetry,
}: Props) {
    const { t } = useTranslation('wordStudy');
    const isRtl = language === 'hebrew';

    if (!selected) {
        return <p className="text-xs text-muted-foreground">{t('analysis.placeholder')}</p>;
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('analysis.loading')}
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <div className="flex items-start gap-2 text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <p className="font-medium">{t('analysis.errorTitle')}</p>
                </div>
                <p className="text-xs text-muted-foreground">{error}</p>
                <Button size="sm" variant="outline" onClick={onRetry}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {t('analysis.retry')}
                </Button>
            </div>
        );
    }

    if (!analysis) {
        return <p className="text-xs text-muted-foreground">{t('analysis.placeholder')}</p>;
    }

    return (
        <div className="space-y-4">
            <header className="space-y-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                        dir={isRtl ? 'rtl' : 'ltr'}
                        className="font-serif text-lg font-medium"
                    >
                        {analysis.word.original}
                    </span>
                    <span className="text-xs text-muted-foreground">{analysis.word.transliteration}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground italic">{analysis.word.lemma}</span>
                </div>
                {cacheHit && (
                    <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        {t('analysis.cacheHit')}
                    </p>
                )}
            </header>

            <section className="space-y-1">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('analysis.glossLabel')}
                </h5>
                <p className="text-sm">{analysis.gloss.primary}</p>
                {analysis.gloss.semanticRange.length > 0 && (
                    <ul className="list-disc list-inside text-xs space-y-0.5 text-muted-foreground">
                        {analysis.gloss.semanticRange.map((sense, i) => (
                            <li key={i}>{sense}</li>
                        ))}
                    </ul>
                )}
            </section>

            {analysis.grammaticalFunctionInVerse && (
                <section className="space-y-1">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('analysis.functionLabel')}
                    </h5>
                    <p className="text-sm leading-snug">{analysis.grammaticalFunctionInVerse}</p>
                </section>
            )}

            {analysis.resonances.length > 0 && (
                <section className="space-y-2">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('analysis.resonancesLabel')}
                    </h5>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {analysis.resonances.map((r, i) => (
                            <ResonanceCard key={`${r.reference}-${i}`} resonance={r} />
                        ))}
                    </div>
                </section>
            )}

            {analysis.theologicalWeight && (
                <section className="space-y-1">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('analysis.weightLabel')}
                    </h5>
                    <p className="text-sm leading-snug">{analysis.theologicalWeight}</p>
                </section>
            )}
        </div>
    );
}
