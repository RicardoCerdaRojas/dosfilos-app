import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, AlertTriangle, ArrowDownToLine, ArrowLeft, Sparkles } from 'lucide-react';
import { inferLanguageFromBook, type KeyWordCandidate, type WordStudyLanguage } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n';
import { LocalBibleService } from '@/services/LocalBibleService';
import { useIdentifyKeyWords } from '@/hooks/useIdentifyKeyWords';
import { useAnalyzeWordPastorally } from '@/hooks/useAnalyzeWordPastorally';
import { KeyWordsPicker } from '@/pages/sermons/generator/pastoralSeed/wordStudy/KeyWordsPicker';

interface Props {
    passage: string;
    /** Prefills the chat input with a scaffolded study line for the chosen word. */
    onInsert: (text: string) => void;
    /** True while a turn is being sent/processed — collapses the helper out of the way. */
    busy?: boolean;
}

/**
 * Inline helper for guided Step 4 (Estudio de Palabras). Surfaces the passage's
 * candidate key words + their lexical DATA (original form, gloss, semantic
 * range, usage) so the pastor doesn't need Greek/Hebrew or to leave the flow.
 * The pastor still writes his own DISCOVERY in the chat — this only provides the
 * data (manifesto: system = data, pastor = discovery). Reuses the Fase 1.5
 * pastoral word-study machinery (`identifyKeyWords` + `analyzeWordPastorally`).
 */
export function GuidedWordStudyHelper({ passage, onInsert, busy }: Props) {
    const { t } = useTranslation('guidedSermon');
    const [open, setOpen] = useState(true);
    const [selected, setSelected] = useState<KeyWordCandidate | null>(null);
    const analysisRef = useRef<HTMLDivElement>(null);

    // The candidate list can be long; bring the analysis into view when a word
    // is picked so it doesn't load off-screen at the bottom of the list.
    useEffect(() => {
        if (selected) {
            analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selected]);

    // Collapse the helper while the pastor's turn is being sent/processed so the
    // panel gets out of the way of the agent's reply. The pastor re-opens it
    // (the title bar stays) to study the next word.
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
                    {/* List view — hidden while a word is in focus. */}
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
                                <KeyWordsPicker
                                    candidates={candidates}
                                    selectedLemma={null}
                                    language={language}
                                    onSelect={setSelected}
                                />
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
                            {analysisError && !analysisLoading && (
                                <p className="text-xs text-destructive">{analysisError}</p>
                            )}
                            {analysis && !analysisLoading && (
                                <>
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-foreground">{analysis.word.original}</span>
                                        <span className="text-xs text-muted-foreground italic">{analysis.word.transliteration}</span>
                                        <Badge variant="outline" className="text-[10px] border-info/30 bg-info/10 text-info">
                                            {selected.verseRef}
                                        </Badge>
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
                                                    <li key={i} className="text-[11px]">
                                                        <span className="font-medium">{r.reference}</span> — {r.howRelated}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <p className="text-[11px] text-info-subtle-foreground bg-info-subtle/40 rounded px-2 py-1">
                                        {t('wordStudy.discoveryPrompt')}
                                    </p>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 gap-1.5 text-xs border-info/30 text-info hover:bg-info/10"
                                        onClick={() => onInsert(`${analysis.word.original} (${selected.verseRef}): `)}
                                    >
                                        <ArrowDownToLine className="h-3.5 w-3.5" />
                                        {t('wordStudy.useInAnswer')}
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
