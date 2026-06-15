import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, AlertTriangle, Plus, ArrowLeft, Sparkles, X } from 'lucide-react';
import { inferLanguageFromBook, PASTORAL_SEED_THRESHOLDS, type KeyWordCandidate, type WordStudyLanguage } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { LocalBibleService } from '@/services/LocalBibleService';
import { useIdentifyKeyWords } from '@/hooks/useIdentifyKeyWords';
import { useAnalyzeWordPastorally } from '@/hooks/useAnalyzeWordPastorally';
import { KeyWordsPicker } from '@/pages/sermons/generator/pastoralSeed/wordStudy/KeyWordsPicker';

const T = PASTORAL_SEED_THRESHOLDS.wordStudies;

interface DraftStudy {
    word: string;
    reference: string;
    pastorDiscovery: string;
}

interface Props {
    passage: string;
    /**
     * Envía la lista ESTRUCTURADA de estudios (sin texto + re-parseo). Devuelve
     * el resultado de la validación determinista.
     */
    onSubmit: (args: { studies: DraftStudy[]; renderedText: string }) => Promise<{
        accepted: boolean;
        reasons: string[];
        advancedTo: string | null;
    } | null>;
    /** True while a turn is being sent/processed — collapses the helper out of the way. */
    busy?: boolean;
}

/**
 * Inline helper for guided Step 4 (Estudio de Palabras). Surfaces the passage's
 * candidate key words + their lexical DATA (manifesto: system = data, pastor =
 * discovery). El pastor escribe su descubrimiento por palabra, lo AGREGA a una
 * lista estructurada, y al final la ENVÍA completa — sin pasar por el chat ni
 * por re-parseo de texto. Reusa la maquinaria de Fase 1.5.
 */
export function GuidedWordStudyHelper({ passage, onSubmit, busy }: Props) {
    const { t } = useTranslation('guidedSermon');
    const [open, setOpen] = useState(true);
    const [selected, setSelected] = useState<KeyWordCandidate | null>(null);
    const [studies, setStudies] = useState<DraftStudy[]>([]);
    const [discovery, setDiscovery] = useState('');
    const [reasons, setReasons] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const analysisRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selected) analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [selected]);

    useEffect(() => {
        if (busy) {
            setOpen(false);
            setSelected(null);
        }
    }, [busy]);

    const language: WordStudyLanguage = useMemo(() => {
        const parsed = LocalBibleService.parseReference(passage);
        return parsed?.book ? inferLanguageFromBook(parsed.book) : 'greek';
    }, [passage]);

    const { candidates, loading, error } = useIdentifyKeyWords({ passage, language, enabled: open });
    const { analysis, loading: analysisLoading, error: analysisError, analyze, reset } = useAnalyzeWordPastorally();

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

    const addStudy = () => {
        if (!analysis || !selected || discovery.trim().length === 0) return;
        setStudies((prev) => [
            ...prev,
            { word: analysis.word.original, reference: selected.verseRef, pastorDiscovery: discovery.trim() },
        ]);
        setDiscovery('');
        setSelected(null);
    };
    const removeStudy = (i: number) => setStudies((prev) => prev.filter((_, idx) => idx !== i));

    const build = (): string =>
        studies.map((s) => `${s.word} (${s.reference}): ${s.pastorDiscovery}`).join('\n');

    const handleSubmit = async () => {
        setSubmitting(true);
        setReasons([]);
        try {
            const result = await onSubmit({ studies, renderedText: build() });
            if (result && !result.accepted) setReasons(result.reasons);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rounded-lg border border-info/30 bg-info/5 overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-info hover:bg-info/10 transition-colors"
                aria-expanded={open}
            >
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Sparkles className="h-4 w-4" />
                {t('wordStudy.helperTitle')}
            </button>

            {open && (
                <div className="px-3 pb-3 space-y-3 max-h-[46vh] overflow-y-auto">
                    {!selected && (
                        <>
                            <p className="text-[11px] text-muted-foreground">{t('wordStudy.helperHint')}</p>
                            {loading && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    {t('wordStudy.identifying')}
                                </div>
                            )}
                            {error && !loading && (
                                <div className="flex items-start gap-2 text-xs text-destructive">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                            {!loading && !error && candidates.length > 0 && (
                                <KeyWordsPicker candidates={candidates} selectedLemma={null} language={language} onSelect={setSelected} />
                            )}
                        </>
                    )}

                    {selected && (
                        <div ref={analysisRef} className="rounded-md border border-info/40 bg-card p-3 space-y-2 scroll-mt-2">
                            <button
                                onClick={() => setSelected(null)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-info hover:underline"
                            >
                                <ArrowLeft className="h-3 w-3" />
                                {t('wordStudy.backToList')}
                            </button>
                            {analysisLoading && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    {t('wordStudy.analyzing')}
                                </div>
                            )}
                            {analysisError && !analysisLoading && <p className="text-xs text-destructive">{analysisError}</p>}
                            {analysis && !analysisLoading && (
                                <>
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-foreground">{analysis.word.original}</span>
                                        <span className="text-xs text-muted-foreground italic">{analysis.word.transliteration}</span>
                                        <Badge variant="outline" className="text-[10px] border-info/30 bg-info/10 text-info">{selected.verseRef}</Badge>
                                    </div>
                                    <p className="text-xs text-foreground">
                                        <span className="font-medium text-muted-foreground">{t('wordStudy.gloss')}: </span>
                                        {analysis.gloss.primary}
                                    </p>
                                    {analysis.gloss.semanticRange.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1">
                                            <span className="text-[11px] font-medium text-muted-foreground">{t('wordStudy.semanticRange')}:</span>
                                            {analysis.gloss.semanticRange.map((s, i) => (
                                                <Badge key={i} variant="secondary" className="text-[10px] font-normal">{s}</Badge>
                                            ))}
                                        </div>
                                    )}
                                    {analysis.grammaticalFunctionInVerse && (
                                        <p className="text-xs text-foreground">
                                            <span className="font-medium text-muted-foreground">{t('wordStudy.functionInVerse')}: </span>
                                            {analysis.grammaticalFunctionInVerse}
                                        </p>
                                    )}
                                    {analysis.resonances.length > 0 && (
                                        <div className="text-xs text-foreground">
                                            <span className="font-medium text-muted-foreground">{t('wordStudy.resonances')}:</span>
                                            <ul className="mt-0.5 space-y-0.5">
                                                {analysis.resonances.map((r, i) => (
                                                    <li key={i} className="text-[11px]"><span className="font-medium">{r.reference}</span> — {r.howRelated}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <p className="text-[11px] text-info-subtle-foreground bg-info-subtle/40 rounded px-2 py-1">
                                        {t('wordStudy.discoveryPrompt')}
                                    </p>
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-[11px] font-semibold text-foreground">{t('wordStudy.discoveryLabel')}</label>
                                        <span className={cn('text-[10px] tabular-nums', discovery.trim().length >= T.pastorDiscoveryMinChars ? 'text-success' : 'text-muted-foreground')}>
                                            {discovery.trim().length}/{T.pastorDiscoveryMinChars}
                                        </span>
                                    </div>
                                    <textarea
                                        value={discovery}
                                        onChange={(e) => setDiscovery(e.target.value)}
                                        rows={2}
                                        placeholder={t('wordStudy.discoveryPlaceholder')}
                                        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                    <Button
                                        size="sm"
                                        className="h-7 gap-1.5 text-xs"
                                        disabled={discovery.trim().length < T.pastorDiscoveryMinChars}
                                        onClick={addStudy}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        {t('wordStudy.addStudy')}
                                    </Button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Lista acumulada + envío (visible siempre que haya estudios). */}
                    {studies.length > 0 && (
                        <div className="rounded-md border border-border bg-card p-2 space-y-1.5">
                            <p className="text-[11px] font-semibold text-foreground">
                                {t('wordStudy.listTitle', { count: studies.length, min: T.minWordStudies })}
                            </p>
                            {studies.map((s, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                                    <span className="flex-1">
                                        <span className="font-medium">{s.word}</span> <span className="text-muted-foreground">({s.reference})</span> — {s.pastorDiscovery}
                                    </span>
                                    <button onClick={() => removeStudy(i)} className="text-muted-foreground hover:text-destructive shrink-0" aria-label={t('wordStudy.removeStudy')}>
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                            {reasons.length > 0 && (
                                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
                                    <p className="font-medium">{t('wordStudy.missing')}</p>
                                    <ul className="list-disc pl-4">{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                                </div>
                            )}
                            <Button
                                size="sm"
                                className="w-full h-8 gap-1.5 text-xs"
                                disabled={submitting || busy || studies.length < T.minWordStudies}
                                onClick={handleSubmit}
                            >
                                {submitting ? t('wordStudy.submitting') : t('wordStudy.submit')}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
