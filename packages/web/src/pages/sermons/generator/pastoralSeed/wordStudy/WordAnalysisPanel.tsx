import { useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { Loader2, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { KeyWordCandidate, WordStudyLanguage } from '@dosfilos/domain';
import { useAnalyzeWordPastorally } from '@/hooks/useAnalyzeWordPastorally';
import { ResonanceCard } from './ResonanceCard';

interface Props {
    selected: KeyWordCandidate | null;
    passage: string;
    language: WordStudyLanguage;
}

/**
 * Pastoral Fidelity Phase 1.5 — renders the LLM-driven pastoral
 * analysis of the selected key word. Fires `analyzeWord` on selection
 * change. The callable handles cache lookup transparently; we display a
 * subtle indicator when the result came from cache so devs/admins can
 * verify behaviour in QA.
 */
export function WordAnalysisPanel({ selected, passage, language }: Props) {
    const { t } = useTranslation('wordStudy');
    const { analysis, cacheHit, loading, error, analyze, reset } = useAnalyzeWordPastorally();
    const isRtl = language === 'hebrew';

    useEffect(() => {
        if (!selected) {
            reset();
            return;
        }
        void analyze({
            word: selected.word,
            lemma: selected.lemma,
            transliteration: selected.transliteration,
            verseRef: selected.verseRef,
            passage,
            language,
        });
    }, [selected, passage, language, analyze, reset]);

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
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => selected && void analyze({
                        word: selected.word,
                        lemma: selected.lemma,
                        transliteration: selected.transliteration,
                        verseRef: selected.verseRef,
                        passage,
                        language,
                    })}
                >
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
                <div className="flex items-baseline gap-2">
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
