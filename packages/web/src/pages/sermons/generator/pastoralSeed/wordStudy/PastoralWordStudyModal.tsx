import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/i18n';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import {
    inferLanguageFromBook,
    type KeyWordCandidate,
    type WordStudy,
    type WordStudyLanguage,
} from '@dosfilos/domain';
import { LocalBibleService } from '@/services/LocalBibleService';
import { useIdentifyKeyWords } from '@/hooks/useIdentifyKeyWords';
import { useAnalyzeWordPastorally } from '@/hooks/useAnalyzeWordPastorally';
import { KeyWordsPicker } from './KeyWordsPicker';
import { WordAnalysisPanel } from './WordAnalysisPanel';
import { DiscoveryEditor } from './DiscoveryEditor';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    passage: string;
    /** Forced language override. When omitted the modal infers from the passage book. */
    languageOverride?: WordStudyLanguage;
    /** Existing studies — used to mark already-studied lemmas (future iteration). */
    existingStudies?: WordStudy[];
    /** Save handler. Wires up to `usePastoralSeed.addWordStudy` from MorphologyStep. */
    onAddWordStudy: (study: WordStudy) => Promise<void>;
}

/**
 * Pastoral Fidelity Phase 1.5 — top-level surface that replaces the
 * `GreekTutorOverlay` embed in `MorphologyStep`. Three internal panes:
 *
 *   1. `KeyWordsPicker` — 5-8 LLM-ranked candidates (PR1).
 *   2. `WordAnalysisPanel` — selected word's detailed analysis (PR2).
 *   3. `DiscoveryEditor` — pastor's "descubrimiento pastoral" (PR3).
 *
 * The modal owns the analysis hook so the cache id can be threaded
 * down to `DiscoveryEditor.onSave` as `wordAnalysisId`.
 */
export function PastoralWordStudyModal({
    isOpen,
    onClose,
    passage,
    languageOverride,
    onAddWordStudy,
}: Props) {
    const { t } = useTranslation('wordStudy');

    const language: WordStudyLanguage = useMemo(() => {
        if (languageOverride) return languageOverride;
        const parsed = LocalBibleService.parseReference(passage);
        if (!parsed?.book) return 'greek';
        return inferLanguageFromBook(parsed.book);
    }, [languageOverride, passage]);

    const [selected, setSelected] = useState<KeyWordCandidate | null>(null);
    useEffect(() => {
        if (!isOpen) setSelected(null);
    }, [isOpen, passage, language]);

    const { candidates, loading, error, refresh } = useIdentifyKeyWords({
        passage,
        language,
        enabled: isOpen,
    });

    const {
        analysis,
        cacheHit,
        cacheId,
        loading: analysisLoading,
        error: analysisError,
        analyze,
        reset: resetAnalysis,
    } = useAnalyzeWordPastorally();

    const triggerAnalyze = useCallback((candidate: KeyWordCandidate) => {
        void analyze({
            word: candidate.word,
            lemma: candidate.lemma,
            transliteration: candidate.transliteration,
            verseRef: candidate.verseRef,
            passage,
            language,
        });
    }, [analyze, passage, language]);

    useEffect(() => {
        if (selected) {
            triggerAnalyze(selected);
        } else {
            resetAnalysis();
        }
    }, [selected, triggerAnalyze, resetAnalysis]);

    return (
        <Dialog open={isOpen} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('modal.title')}</DialogTitle>
                    <DialogDescription>
                        {t('modal.subtitle')}{' '}
                        <span className="text-xs">
                            ({language === 'greek' ? t('modal.languageGreek') : t('modal.languageHebrew')})
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:gap-8 mt-4">
                    <section aria-label="Palabras sugeridas">
                        {loading && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t('modal.loading')}
                            </div>
                        )}
                        {error && !loading && (
                            <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                                <div className="flex items-start gap-2 text-destructive">
                                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                                    <p className="font-medium">{t('modal.errorTitle')}</p>
                                </div>
                                <p className="text-xs text-muted-foreground">{error}</p>
                                <Button size="sm" variant="outline" onClick={() => void refresh()}>
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    {t('modal.retry')}
                                </Button>
                            </div>
                        )}
                        {!loading && !error && candidates.length === 0 && (
                            <p className="text-sm text-muted-foreground">{t('modal.noCandidates')}</p>
                        )}
                        {!loading && !error && candidates.length > 0 && (
                            <KeyWordsPicker
                                candidates={candidates}
                                selectedLemma={selected?.lemma ?? null}
                                language={language}
                                onSelect={(c) => setSelected(c)}
                            />
                        )}
                    </section>

                    <section aria-label="Análisis y descubrimiento" className="space-y-5">
                        <WordAnalysisPanel
                            selected={selected}
                            language={language}
                            analysis={analysis}
                            cacheHit={cacheHit}
                            loading={analysisLoading}
                            error={analysisError}
                            onRetry={() => selected && triggerAnalyze(selected)}
                        />
                        {selected && analysis && !analysisLoading && !analysisError && (
                            <div className="border-t border-border pt-4">
                                <DiscoveryEditor
                                    selected={selected}
                                    language={language}
                                    wordAnalysisId={cacheId}
                                    onSave={onAddWordStudy}
                                    onSaved={() => {/* MorphologyStep refreshes via seed hook */}}
                                />
                            </div>
                        )}
                    </section>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        {t('modal.close')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
