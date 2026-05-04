import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowLeft,
    BookOpenText,
    CheckCircle2,
    CircleDashed,
    Loader2,
    AlertTriangle,
    Sparkles,
    BookPlus,
    Minus,
    Type,
    Check,
    EyeOff,
    GraduationCap,
} from 'lucide-react';
import {
    hasMethodologyBeenShown,
    MethodologyPresentation,
} from '@/components/expository/MethodologyPresentation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import { useFirebase } from '@/context/firebase-context';
import { parseLocalDate } from '@/lib/dateUtils';
import { useExpositoryAssistant } from '@/hooks/series/useExpositoryAssistant';
import {
    clearExpositoryDraft,
    loadExpositoryDraft,
    saveExpositoryDraft,
} from '@/hooks/series/expositoryDraftStorage';
import { seriesService } from '@dosfilos/application';
import {
    getAllBooks,
    type AssistantVerseInput,
    type BibleBookId,
    type BookPanorama,
    type ExegeticalUnit,
    type FidelityIssue,
    type FidelityReview,
    type MacroSection,
    type PlannedSermon,
    type PlannedSermonExpositoryEnrichment,
    type PreachableUnit,
    type SyntacticUnit,
} from '@dosfilos/domain';

/**
 * v1.5 expository assistant wizard.
 *
 * The expository wizard at /dashboard/plans/pericope. Runs
 * the 5-pass pipeline (panorama → macro → micro → preachable →
 * fidelity) with staged UI feedback — each pass appears as a card
 * with state pending / running / done / error and renders its
 * result inline as soon as it lands.
 *
 * D.2 wires Pases 1 (panorama) and 2 (macroestructura). On "Iniciar
 * análisis" we load verses synchronously and then auto-chain
 * panorama → macro; D.3 will continue the chain into micro →
 * preachable → fidelity.
 *
 * Workflow state lives in component state because v1.5 does not
 * persist intermediate runs server-side — only the final
 * SermonSeries does. D.4 will add localStorage draft persistence
 * so a tab close mid-run is recoverable.
 */
export function ExpositoryAssistantPage() {
    const { t, i18n } = useTranslation('series');
    const navigate = useNavigate();
    const { user } = useFirebase();
    const lang: 'es' | 'en' = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';

    const allBooks = useMemo(() => getAllBooks(), []);
    const [bookId, setBookId] = useState<BibleBookId>('2PE');
    const [targetCount, setTargetCount] = useState<number | ''>('');

    // Run state — accumulates as each pass completes.
    const [verses, setVerses] = useState<AssistantVerseInput[] | null>(null);
    const [bookDisplay, setBookDisplay] = useState<string | null>(null);
    const [panorama, setPanorama] = useState<BookPanorama | null>(null);
    const [macroSections, setMacroSections] = useState<MacroSection[] | null>(null);
    const [exegeticalUnits, setExegeticalUnits] = useState<ExegeticalUnit[] | null>(null);
    const [preachableUnits, setPreachableUnits] = useState<PreachableUnit[] | null>(null);
    const [fidelityReview, setFidelityReview] = useState<FidelityReview | null>(null);

    // Series-creation form state — populated once preachable units land.
    const [seriesTitle, setSeriesTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | 'flexible'>('weekly');
    const [creatingSeries, setCreatingSeries] = useState(false);

    // Text zoom for the wizard body content. 1 = default, 2 = large,
    // 3 = larger. Persisted in localStorage so a pastor who picked a
    // larger size doesn't have to re-pick on every visit. Apply via a
    // wrapper class that overrides Tailwind text-* utilities (see
    // index.css `.expository-zoom-*` rules).
    const [textZoom, setTextZoom] = useState<1 | 2 | 3>(() => {
        if (typeof window === 'undefined') return 1;
        const stored = window.localStorage.getItem('expositoryTextZoom');
        const parsed = stored ? Number(stored) : 1;
        return parsed === 2 || parsed === 3 ? (parsed as 2 | 3) : 1;
    });
    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('expositoryTextZoom', String(textZoom));
    }, [textZoom]);
    const zoomClassName = textZoom === 3
        ? 'expository-zoom-larger'
        : textZoom === 2
          ? 'expository-zoom-large'
          : '';

    // Collapsed pass cards — set of pass indices (1..5) currently
    // shown as chips in the strip instead of full cards. State
    // changes go through `togglePass` so they ride a View Transition
    // when supported, producing a card↔chip morph.
    const [collapsedPasses, setCollapsedPasses] = useState<Set<number>>(new Set());

    // Methodology presentation: auto-opens on the first visit ever
    // to teach the pastor what the 5-pass pipeline actually does and
    // why. Subsequent visits open it only when the pastor clicks the
    // "Metodología" button in the header.
    const [methodologyOpen, setMethodologyOpen] = useState(false);
    useEffect(() => {
        if (!hasMethodologyBeenShown()) {
            setMethodologyOpen(true);
        }
    }, []);

    // Pase 5 issue triage. Indices into fidelityReview.issues. The
    // two sets are mutually exclusive (toggling one removes the
    // other) — an issue is either acted upon or actively dismissed,
    // never both. Persists with the draft so triage decisions
    // survive a tab close.
    const [addressedIssues, setAddressedIssues] = useState<Set<number>>(new Set());
    const [ignoredIssues, setIgnoredIssues] = useState<Set<number>>(new Set());
    const toggleIssueAddressed = (idx: number) => {
        setAddressedIssues((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
        setIgnoredIssues((prev) => {
            if (!prev.has(idx)) return prev;
            const next = new Set(prev);
            next.delete(idx);
            return next;
        });
    };
    const toggleIssueIgnored = (idx: number) => {
        setIgnoredIssues((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
        setAddressedIssues((prev) => {
            if (!prev.has(idx)) return prev;
            const next = new Set(prev);
            next.delete(idx);
            return next;
        });
    };
    const togglePass = (index: number) => {
        const apply = () => {
            setCollapsedPasses((prev) => {
                const next = new Set(prev);
                if (next.has(index)) next.delete(index);
                else next.add(index);
                return next;
            });
        };
        // View Transitions API: feature-detected, falls back to
        // instant state change in Firefox. The browser captures
        // before/after snapshots of any element with view-transition-name
        // set in CSS and morphs between them — that's how the card and
        // its chip share the morph identity.
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
            (document as any).startViewTransition(apply);
        } else {
            apply();
        }
    };

    const assistant = useExpositoryAssistant();

    // Hydrate from localStorage on mount. Restoring a draft skips the
    // setup form back to where the pastor was, so they can continue
    // reviewing the analysis without re-running the pipeline.
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        if (hydrated) return;
        const draft = loadExpositoryDraft();
        if (draft) {
            setBookId(draft.bookId);
            if (draft.targetPreachableCount !== undefined) {
                setTargetCount(draft.targetPreachableCount);
            }
            setVerses(draft.verses);
            setBookDisplay(draft.bookDisplay);
            if (draft.panorama) setPanorama(draft.panorama);
            if (draft.macroSections) setMacroSections(draft.macroSections);
            if (draft.exegeticalUnits) setExegeticalUnits(draft.exegeticalUnits);
            if (draft.preachableUnits) setPreachableUnits(draft.preachableUnits);
            if (draft.fidelityReview) setFidelityReview(draft.fidelityReview);
            if (draft.addressedIssueIndices) setAddressedIssues(new Set(draft.addressedIssueIndices));
            if (draft.ignoredIssueIndices) setIgnoredIssues(new Set(draft.ignoredIssueIndices));
            toast.success(t('expository.toast.draftRestored') as string);
        }
        setHydrated(true);
    }, [hydrated, t]);

    // Persist a draft whenever any pass output lands. Keeps the
    // localStorage entry in sync without an explicit "save" button.
    useEffect(() => {
        if (!verses || !bookDisplay) return;
        saveExpositoryDraft({
            bookId,
            displayLanguage: lang,
            bookDisplay,
            ...(typeof targetCount === 'number' ? { targetPreachableCount: targetCount } : {}),
            verses,
            ...(panorama ? { panorama } : {}),
            ...(macroSections ? { macroSections } : {}),
            ...(exegeticalUnits ? { exegeticalUnits } : {}),
            ...(preachableUnits ? { preachableUnits } : {}),
            ...(fidelityReview ? { fidelityReview } : {}),
            ...(addressedIssues.size > 0 ? { addressedIssueIndices: Array.from(addressedIssues) } : {}),
            ...(ignoredIssues.size > 0 ? { ignoredIssueIndices: Array.from(ignoredIssues) } : {}),
        });
    }, [bookId, lang, bookDisplay, targetCount, verses, panorama, macroSections, exegeticalUnits, preachableUnits, fidelityReview, addressedIssues, ignoredIssues]);

    // Pre-fill the series-creation form once preachable units are
    // available — saves the pastor a manual title entry in the
    // common case.
    useEffect(() => {
        if (preachableUnits && bookDisplay && !seriesTitle) {
            setSeriesTitle(t('expository.create.defaultTitle', { book: bookDisplay }) as string);
        }
    }, [preachableUnits, bookDisplay, seriesTitle, t]);

    const handleStart = async () => {
        // Reset prior run state if the pastor restarts.
        setPanorama(null);
        setMacroSections(null);
        setExegeticalUnits(null);
        setPreachableUnits(null);
        setFidelityReview(null);
        // Triage decisions are scoped to a specific review run —
        // a fresh review will produce different issues, so old
        // triage no longer applies.
        setAddressedIssues(new Set());
        setIgnoredIssues(new Set());

        let loaded;
        try {
            loaded = await assistant.loadVerses({ bookId, displayLanguage: lang });
        } catch (err: any) {
            console.error('[expository] loadVerses failed:', err);
            toast.error(err?.message ?? (t('expository.toast.loadFailed') as string));
            return;
        }
        setVerses(loaded.verses);
        setBookDisplay(loaded.book);

        // Surface the source (original-language vs translation
        // fallback) so the pastor knows what the model is reading.
        // The toast is informative on success, warning on fallback —
        // the methodology's credibility depends on the pastor knowing
        // whether they're seeing original Greek/Hebrew or surrogate
        // translation analysis.
        if (loaded.source === 'translation' && loaded.fallbackReason) {
            toast.warning(
                t('expository.toast.translationFallback', {
                    reason: loaded.fallbackReason,
                }) as string,
            );
        } else if (loaded.source !== 'translation') {
            toast.success(
                t(`expository.toast.sourceLoaded.${loaded.source}`) as string,
            );
        }

        // Map the load result's source tag onto the assistant
        // input's sourceLanguage. Lets the prompts emit the right
        // preamble (original-greek / original-hebrew / translation
        // surrogate) so the model knows what it's reading.
        const sourceLanguage =
            loaded.source === 'original-greek'
                ? ('greek' as const)
                : loaded.source === 'original-hebrew'
                  ? ('hebrew' as const)
                  : ('translation' as const);
        const baseInput = {
            book: loaded.book,
            displayLanguage: lang,
            verses: loaded.verses,
            sourceLanguage,
        };
        const targetOpt = typeof targetCount === 'number' ? { targetPreachableCount: targetCount } : {};

        // Run the 5 passes in sequence via nested onSuccess. Each
        // nesting level adds one pass; failures at any level surface
        // a toast and stop the chain (the pastor sees the failed
        // card and can restart).
        assistant.runPanorama.mutate(
            { ...baseInput, ...targetOpt },
            {
                onSuccess: (panoramaResult) => {
                    setPanorama(panoramaResult.payload);

                    assistant.runMacro.mutate(
                        { ...baseInput, panorama: panoramaResult.payload },
                        {
                            onSuccess: (macroResult) => {
                                setMacroSections(macroResult.payload);

                                assistant.runMicro.mutate(
                                    {
                                        ...baseInput,
                                        panorama: panoramaResult.payload,
                                        macroSections: macroResult.payload,
                                    },
                                    {
                                        onSuccess: (microResult) => {
                                            setExegeticalUnits(microResult.payload);

                                            assistant.runPreachable.mutate(
                                                {
                                                    ...baseInput,
                                                    ...targetOpt,
                                                    panorama: panoramaResult.payload,
                                                    macroSections: macroResult.payload,
                                                    exegeticalUnits: microResult.payload,
                                                },
                                                {
                                                    onSuccess: (preachableResult) => {
                                                        setPreachableUnits(preachableResult.payload);

                                                        assistant.runFidelity.mutate(
                                                            {
                                                                ...baseInput,
                                                                panorama: panoramaResult.payload,
                                                                macroSections: macroResult.payload,
                                                                exegeticalUnits: microResult.payload,
                                                                preachableUnits: preachableResult.payload,
                                                            },
                                                            {
                                                                onSuccess: (fidelityResult) => {
                                                                    setFidelityReview(fidelityResult.payload);
                                                                    toast.success(t('expository.toast.pipelineDone') as string);
                                                                },
                                                                onError: (err: any) => {
                                                                    console.error('[expository] runFidelity failed:', err);
                                                                    toast.error(toastErrorMessage(err, t, 'expository.toast.fidelityFailed'));
                                                                },
                                                            },
                                                        );
                                                    },
                                                    onError: (err: any) => {
                                                        console.error('[expository] runPreachable failed:', err);
                                                        toast.error(toastErrorMessage(err, t, 'expository.toast.preachableFailed'));
                                                    },
                                                },
                                            );
                                        },
                                        onError: (err: any) => {
                                            console.error('[expository] runMicro failed:', err);
                                            toast.error(toastErrorMessage(err, t, 'expository.toast.microFailed'));
                                        },
                                    },
                                );
                            },
                            onError: (err: any) => {
                                console.error('[expository] runMacro failed:', err);
                                toast.error(toastErrorMessage(err, t, 'expository.toast.macroFailed'));
                            },
                        },
                    );
                },
                onError: (err: any) => {
                    console.error('[expository] runPanorama failed:', err);
                    toast.error(toastErrorMessage(err, t, 'expository.toast.panoramaFailed'));
                },
            },
        );
    };

    const handleCreateSeries = async () => {
        if (!user?.uid || !preachableUnits || preachableUnits.length === 0 || !bookDisplay) return;
        if (!seriesTitle.trim()) {
            toast.error(t('expository.toast.titleRequired') as string);
            return;
        }

        // Build per-sermon syntactic unit + expository enrichment by
        // looking up the first sourced exegetical unit (preserves the
        // boundary the pastor saw in Pase 4) and packaging the two
        // propositions, pastoral objective, special-case treatment,
        // and macroSection link onto the planned sermon.
        const sermons = preachableUnits.map((p, idx) => {
            const sourced = p.sourcedExegeticalUnitIds
                .map((id) => exegeticalUnits?.find((u) => u.id === id))
                .filter((u): u is ExegeticalUnit => Boolean(u));
            const firstSourced = sourced[0];
            const syntactic: SyntacticUnit | undefined = firstSourced
                ? firstSourced.syntacticUnit
                : undefined;

            const enrichment: PlannedSermonExpositoryEnrichment = {
                exegeticalProposition: p.exegeticalProposition,
                homileticalProposition: p.homileticalProposition,
                pastoralObjective: p.pastoralObjective,
                ...(p.caseTreatment ? { caseTreatment: p.caseTreatment } : {}),
                sourcedExegeticalUnitIds: p.sourcedExegeticalUnitIds,
                ...(firstSourced ? { macroSectionId: firstSourced.macroSectionId } : {}),
                ...(p.fidelityNotes ? { fidelityNotes: p.fidelityNotes } : {}),
            };

            const sermon: PreachableSermonInput = {
                title: p.title,
                description: p.exegeticalProposition,
                passage: p.passage,
                week: idx + 1,
                status: 'planned',
                expositoryEnrichment: enrichment,
            };
            if (syntactic) sermon.syntacticUnit = syntactic;
            return sermon;
        });

        setCreatingSeries(true);
        try {
            const series = await seriesService.createSeriesFromPlan(user.uid, {
                series: {
                    title: seriesTitle.trim(),
                    description: t('expository.create.defaultDescription', {
                        book: bookDisplay,
                        count: preachableUnits.length,
                    }) as string,
                    type: 'expository',
                    startDate: parseLocalDate(startDate),
                    metadata: {
                        expository: { book: bookDisplay },
                    },
                    resourceIds: [],
                },
                sermons,
                frequency,
                expositoryAssistant: {
                    version: panorama ? `expository-v15:${panorama.genre}` : 'expository-v15',
                    status: 'reviewed',
                },
            });

            clearExpositoryDraft();
            toast.success(t('expository.toast.seriesCreated') as string);
            navigate(`/dashboard/plans/${series.id}`);
        } catch (err: any) {
            console.error('[expository] createSeries failed:', err);
            toast.error(err?.message ?? (t('expository.toast.createFailed') as string));
        } finally {
            setCreatingSeries(false);
        }
    };

    const panoramaState = derivePassState(assistant.runPanorama.isPending, panorama, assistant.runPanorama.isError);
    const macroState = derivePassState(assistant.runMacro.isPending, macroSections, assistant.runMacro.isError);
    const microState = derivePassState(assistant.runMicro.isPending, exegeticalUnits, assistant.runMicro.isError);
    const preachableState = derivePassState(assistant.runPreachable.isPending, preachableUnits, assistant.runPreachable.isError);
    const fidelityState = derivePassState(assistant.runFidelity.isPending, fidelityReview, assistant.runFidelity.isError);

    const isRunning =
        assistant.runPanorama.isPending ||
        assistant.runMacro.isPending ||
        assistant.runMicro.isPending ||
        assistant.runPreachable.isPending ||
        assistant.runFidelity.isPending;

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 overflow-y-auto">
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center gap-3">
                    <Link
                        to="/dashboard/plans"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        aria-label={t('expository.back') as string}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 font-serif truncate">
                            {t('expository.title')}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('expository.subtitle')}
                        </p>
                    </div>
                </div>
            </div>

            <main className={`flex-1 max-w-5xl w-full mx-auto px-6 py-8 space-y-6 ${zoomClassName}`}>
                <SetupCard
                    bookId={bookId}
                    onBookIdChange={setBookId}
                    targetCount={targetCount}
                    onTargetCountChange={setTargetCount}
                    lang={lang}
                    allBooks={allBooks}
                    isRunning={isRunning}
                    onStart={handleStart}
                    textZoom={textZoom}
                    onTextZoomChange={setTextZoom}
                    onOpenMethodology={() => setMethodologyOpen(true)}
                    t={t}
                />

                <MethodologyPresentation
                    open={methodologyOpen}
                    onOpenChange={setMethodologyOpen}
                />

                {/* Collapsed-passes strip. Renders only when at least
                    one pass is contracted to a chip. The chips share
                    `view-transition-name` with their corresponding
                    PassCard slot, so toggling collapse triggers a
                    card↔chip morph (Mac-genie-like) where supported. */}
                {collapsedPasses.size > 0 && (
                    <CollapsedStrip
                        collapsedPasses={collapsedPasses}
                        passes={[
                            { index: 1, key: 'panorama', state: panoramaState },
                            { index: 2, key: 'macro', state: macroState },
                            { index: 3, key: 'micro', state: microState },
                            { index: 4, key: 'preachable', state: preachableState },
                            { index: 5, key: 'fidelity', state: fidelityState },
                        ]}
                        onExpand={togglePass}
                        t={t}
                    />
                )}

                {!collapsedPasses.has(1) && (
                    <PassCard
                        index={1}
                        title={t('expository.passes.panorama.title') as string}
                        subtitle={t('expository.passes.panorama.subtitle') as string}
                        state={panoramaState}
                        onCollapse={() => togglePass(1)}
                        t={t}
                    >
                        {panorama && <PanoramaResult panorama={panorama} t={t} />}
                    </PassCard>
                )}

                {!collapsedPasses.has(2) && (
                    <PassCard
                        index={2}
                        title={t('expository.passes.macro.title') as string}
                        subtitle={t('expository.passes.macro.subtitle') as string}
                        state={macroState}
                        onCollapse={() => togglePass(2)}
                        t={t}
                    >
                        {macroSections && bookDisplay && (
                            <MacroResult sections={macroSections} bookDisplay={bookDisplay} t={t} />
                        )}
                    </PassCard>
                )}

                {!collapsedPasses.has(3) && (
                    <PassCard
                        index={3}
                        title={t('expository.passes.micro.title') as string}
                        subtitle={t('expository.passes.micro.subtitle') as string}
                        state={microState}
                        onCollapse={() => togglePass(3)}
                        t={t}
                    >
                        {exegeticalUnits && macroSections && bookDisplay && (
                            <MicroResult
                                units={exegeticalUnits}
                                macros={macroSections}
                                bookDisplay={bookDisplay}
                                t={t}
                            />
                        )}
                    </PassCard>
                )}

                {!collapsedPasses.has(4) && (
                    <PassCard
                        index={4}
                        title={t('expository.passes.preachable.title') as string}
                        subtitle={t('expository.passes.preachable.subtitle') as string}
                        state={preachableState}
                        onCollapse={() => togglePass(4)}
                        t={t}
                    >
                        {preachableUnits && bookDisplay && (
                            <PreachableResult
                                units={preachableUnits}
                                bookDisplay={bookDisplay}
                                onUnitChange={(id, patch) => {
                                    setPreachableUnits((prev) =>
                                        prev
                                            ? prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
                                            : prev,
                                    );
                                }}
                                t={t}
                            />
                        )}
                    </PassCard>
                )}

                {!collapsedPasses.has(5) && (
                    <PassCard
                        index={5}
                        title={t('expository.passes.fidelity.title') as string}
                        subtitle={t('expository.passes.fidelity.subtitle') as string}
                        state={fidelityState}
                        onCollapse={() => togglePass(5)}
                        t={t}
                    >
                        {fidelityReview && (
                            <FidelityResult
                                review={fidelityReview}
                                preachableUnits={preachableUnits ?? []}
                                addressedIssues={addressedIssues}
                                ignoredIssues={ignoredIssues}
                                onToggleAddressed={toggleIssueAddressed}
                                onToggleIgnored={toggleIssueIgnored}
                                t={t}
                            />
                        )}
                    </PassCard>
                )}

                {/* Create-series card — appears once preachable units are ready.
                    The pastor can create the series even before fidelity review
                    completes (the review is advisory, not blocking). */}
                {preachableUnits && preachableUnits.length > 0 && (
                    <CreateSeriesCard
                        seriesTitle={seriesTitle}
                        onSeriesTitleChange={setSeriesTitle}
                        startDate={startDate}
                        onStartDateChange={setStartDate}
                        frequency={frequency}
                        onFrequencyChange={setFrequency}
                        preachableUnits={preachableUnits}
                        creating={creatingSeries}
                        onCreate={handleCreateSeries}
                        t={t}
                    />
                )}
            </main>
        </div>
    );
}

// ── Create series card ─────────────────────────────────────────────────

function CreateSeriesCard({
    seriesTitle,
    onSeriesTitleChange,
    startDate,
    onStartDateChange,
    frequency,
    onFrequencyChange,
    preachableUnits,
    creating,
    onCreate,
    t,
}: {
    seriesTitle: string;
    onSeriesTitleChange: (v: string) => void;
    startDate: string;
    onStartDateChange: (v: string) => void;
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'flexible';
    onFrequencyChange: (v: 'weekly' | 'biweekly' | 'monthly' | 'flexible') => void;
    preachableUnits: ReadonlyArray<PreachableUnit>;
    creating: boolean;
    onCreate: () => void;
    t: (key: string, opts?: Record<string, unknown>) => string;
}) {
    return (
        <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-6">
            <header className="flex items-center gap-2 mb-4">
                <BookPlus className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    {t('expository.create.title')}
                </h2>
            </header>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                {t('expository.create.subtitle')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <Label htmlFor="seriesTitle">{t('expository.create.seriesTitle')}</Label>
                    <Input
                        id="seriesTitle"
                        value={seriesTitle}
                        onChange={(e) => onSeriesTitleChange(e.target.value)}
                        className="mt-1.5 bg-white dark:bg-zinc-900"
                    />
                </div>
                <div>
                    <Label htmlFor="startDate">{t('expository.create.startDate')}</Label>
                    <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => onStartDateChange(e.target.value)}
                        className="mt-1.5 bg-white dark:bg-zinc-900"
                    />
                </div>
                <div>
                    <Label htmlFor="frequency">{t('expository.create.frequency')}</Label>
                    <select
                        id="frequency"
                        value={frequency}
                        onChange={(e) => onFrequencyChange(e.target.value as typeof frequency)}
                        className="mt-1.5 w-full h-10 rounded-md border border-input bg-white dark:bg-zinc-900 px-3 text-sm"
                    >
                        <option value="weekly">{t('expository.create.freq.weekly')}</option>
                        <option value="biweekly">{t('expository.create.freq.biweekly')}</option>
                        <option value="monthly">{t('expository.create.freq.monthly')}</option>
                        <option value="flexible">{t('expository.create.freq.flexible')}</option>
                    </select>
                </div>
            </div>

            <div className="mt-5 flex justify-end">
                <Button
                    onClick={onCreate}
                    disabled={creating || preachableUnits.length === 0}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                >
                    {creating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    {t('expository.create.cta', { count: preachableUnits.length })}
                </Button>
            </div>
        </section>
    );
}

function toastErrorMessage(
    err: any,
    t: (key: string) => string,
    fallbackKey: string,
): string {
    if (err?.isExegesisOverload) return t('expository.toast.overloaded') as string;
    if (err?.message) return err.message;
    return t(fallbackKey) as string;
}

// ── Setup card ──────────────────────────────────────────────────────────

function SetupCard({
    bookId,
    onBookIdChange,
    targetCount,
    onTargetCountChange,
    lang,
    allBooks,
    isRunning,
    onStart,
    textZoom,
    onTextZoomChange,
    onOpenMethodology,
    t,
}: {
    bookId: BibleBookId;
    onBookIdChange: (id: BibleBookId) => void;
    targetCount: number | '';
    onTargetCountChange: (n: number | '') => void;
    lang: 'es' | 'en';
    allBooks: ReadonlyArray<{ id: BibleBookId; nameEs: string; nameEn: string; testament: 'OT' | 'NT' }>;
    isRunning: boolean;
    onStart: () => void;
    textZoom: 1 | 2 | 3;
    onTextZoomChange: (z: 1 | 2 | 3) => void;
    onOpenMethodology: () => void;
    t: (key: string) => string;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <header className="mb-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <BookOpenText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                            {t('expository.setup.title')}
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('expository.setup.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onOpenMethodology}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
                        title={t('expository.setup.methodologyButtonHint') as string}
                    >
                        <GraduationCap className="h-3.5 w-3.5" />
                        {t('expository.setup.methodologyButton')}
                    </button>
                    <TextZoomControl value={textZoom} onChange={onTextZoomChange} t={t} />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <Label htmlFor="book">{t('expository.setup.book')}</Label>
                    <select
                        id="book"
                        value={bookId}
                        onChange={(e) => onBookIdChange(e.target.value as BibleBookId)}
                        disabled={isRunning}
                        className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                    >
                        <optgroup label={t('expository.setup.testamentNT') as string}>
                            {allBooks.filter((b) => b.testament === 'NT').map((b) => (
                                <option key={b.id} value={b.id}>
                                    {lang === 'en' ? b.nameEn : b.nameEs}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label={t('expository.setup.testamentOT') as string}>
                            {allBooks.filter((b) => b.testament === 'OT').map((b) => (
                                <option key={b.id} value={b.id}>
                                    {lang === 'en' ? b.nameEn : b.nameEs}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>
                <div>
                    <Label htmlFor="target">{t('expository.setup.targetCount')}</Label>
                    <Input
                        id="target"
                        type="number"
                        min={3}
                        max={60}
                        value={targetCount}
                        disabled={isRunning}
                        onChange={(e) => {
                            const v = e.target.value;
                            onTargetCountChange(v === '' ? '' : Math.max(1, Number(v)));
                        }}
                        placeholder={t('expository.setup.targetCountPlaceholder') as string}
                        className="mt-1.5"
                    />
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-[11px] text-amber-700 dark:text-amber-300 max-w-xl">
                    {t('expository.setup.translationNote')}
                </p>
                <Button
                    onClick={onStart}
                    disabled={isRunning}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 disabled:opacity-50"
                >
                    {isRunning ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                        <Sparkles className="h-4 w-4 mr-1.5" />
                    )}
                    {isRunning ? t('expository.setup.running') : t('expository.setup.start')}
                </Button>
            </div>
        </section>
    );
}

// ── Text zoom control ──────────────────────────────────────────────────

function TextZoomControl({
    value,
    onChange,
    t,
}: {
    value: 1 | 2 | 3;
    onChange: (z: 1 | 2 | 3) => void;
    t: (key: string) => string;
}) {
    const levels: Array<{ level: 1 | 2 | 3; label: string }> = [
        { level: 1, label: 'A' },
        { level: 2, label: 'A' },
        { level: 3, label: 'A' },
    ];
    const sizeClass = ['text-xs', 'text-sm', 'text-base'];
    return (
        <div
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 p-0.5"
            role="group"
            aria-label={t('expository.setup.textZoomLabel') as string}
            title={t('expository.setup.textZoomLabel') as string}
        >
            <Type className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
            {levels.map(({ level, label }) => (
                <button
                    key={level}
                    type="button"
                    onClick={() => onChange(level)}
                    aria-pressed={value === level}
                    aria-label={t(`expository.setup.textZoom.level${level}`) as string}
                    title={t(`expository.setup.textZoom.level${level}`) as string}
                    className={`px-2 py-1 rounded ${sizeClass[level - 1]} font-semibold transition-colors ${
                        value === level
                            ? 'bg-emerald-500 text-slate-900'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

// ── Pass card primitives ────────────────────────────────────────────────

type PassState = 'pending' | 'running' | 'done' | 'error';

function PassCard({
    index,
    title,
    subtitle,
    state,
    children,
    onCollapse,
    t,
}: {
    index: number;
    title: string;
    subtitle: string;
    state: PassState;
    children?: React.ReactNode;
    onCollapse?: () => void;
    t: (key: string) => string;
}) {
    return (
        <section
            // The shared `view-transition-name` is what the browser
            // uses to identify "this card and the chip with the same
            // name are the same logical entity, morph between them".
            // Each pass needs a unique name so multiple morphs can run
            // independently when the pastor toggles several at once.
            style={{ viewTransitionName: `expository-pass-${index}` } as React.CSSProperties}
            className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
        >
            <header className="flex items-start gap-3">
                <PassStateBadge state={state} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-wide text-slate-400 font-mono">
                            {t('expository.pass')} {index}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {title}
                        </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {subtitle}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400 italic">
                        {t(`expository.state.${state}`)}
                    </span>
                    {onCollapse && (
                        <button
                            type="button"
                            onClick={onCollapse}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            aria-label={t('expository.collapse') as string}
                            title={t('expository.collapse') as string}
                        >
                            <Minus className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </header>
            {children && <div className="mt-4">{children}</div>}
        </section>
    );
}

// ── Collapsed strip ────────────────────────────────────────────────────

function CollapsedStrip({
    collapsedPasses,
    passes,
    onExpand,
    t,
}: {
    collapsedPasses: Set<number>;
    passes: ReadonlyArray<{ index: number; key: string; state: PassState }>;
    onExpand: (index: number) => void;
    t: (key: string) => string;
}) {
    const visible = passes.filter((p) => collapsedPasses.has(p.index));
    return (
        <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/40 px-3 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium px-1">
                    {t('expository.collapsedStrip.label')}
                </span>
                {visible.map((p) => (
                    <button
                        key={p.index}
                        type="button"
                        onClick={() => onExpand(p.index)}
                        // Same view-transition-name as the corresponding
                        // PassCard — that's what makes the browser morph
                        // between the two on toggle.
                        style={{ viewTransitionName: `expository-pass-${p.index}` } as React.CSSProperties}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors"
                        aria-label={t('expository.collapsedStrip.expand') as string}
                    >
                        <ChipStateBadge state={p.state} />
                        <span className="font-mono text-[10px] text-slate-400">
                            {t('expository.pass')} {p.index}
                        </span>
                        <span className="font-medium">
                            {t(`expository.passes.${p.key}.title`)}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
}

function ChipStateBadge({ state }: { state: PassState }) {
    const cls = 'h-3 w-3';
    if (state === 'running') return <Loader2 className={`${cls} animate-spin text-emerald-600 dark:text-emerald-300`} />;
    if (state === 'done') return <CheckCircle2 className={`${cls} text-emerald-600 dark:text-emerald-300`} />;
    if (state === 'error') return <AlertTriangle className={`${cls} text-rose-600 dark:text-rose-300`} />;
    return <CircleDashed className={`${cls} text-slate-400`} />;
}

function PassStateBadge({ state }: { state: PassState }) {
    if (state === 'running') {
        return (
            <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
            </div>
        );
    }
    if (state === 'done') {
        return (
            <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
            </div>
        );
    }
    if (state === 'error') {
        return (
            <div className="shrink-0 w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
            </div>
        );
    }
    return (
        <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center">
            <CircleDashed className="h-4 w-4" />
        </div>
    );
}

// ── Pass 1 result ───────────────────────────────────────────────────────

function PanoramaResult({ panorama, t }: { panorama: BookPanorama; t: (key: string) => string }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <ResultRow
                label={t('expository.results.panorama.genre')}
                value={t(`expository.results.panorama.genreLabel.${panorama.genre}`)}
            />
            <ResultRow label={t('expository.results.panorama.theme')} value={panorama.centralTheme} />
            <ResultRow label={t('expository.results.panorama.purpose')} value={panorama.purpose} fullWidth />
            <ResultRow label={t('expository.results.panorama.problem')} value={panorama.pastoralProblem} fullWidth />
            <ResultRow
                label={t('expository.results.panorama.movements')}
                value={panorama.movements.join(' / ')}
                fullWidth
            />
            {panorama.keyTerms.length > 0 && (
                <ResultRow
                    label={t('expository.results.panorama.keyTerms')}
                    value={panorama.keyTerms.join(', ')}
                    fullWidth
                />
            )}
            {panorama.redemptiveHistoryNote && (
                <ResultRow
                    label={t('expository.results.panorama.redemptiveHistory')}
                    value={panorama.redemptiveHistoryNote}
                    fullWidth
                />
            )}
        </div>
    );
}

function ResultRow({
    label,
    value,
    fullWidth,
    mono,
}: {
    label: string;
    value: string;
    fullWidth?: boolean;
    mono?: boolean;
}) {
    return (
        <div className={fullWidth ? 'md:col-span-2' : ''}>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-0.5">
                {label}
            </p>
            <p className={`text-slate-700 dark:text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>
                {value}
            </p>
        </div>
    );
}

// Local mirror of the createSeriesFromPlan sermons[] item shape so the
// page can construct it without importing the application layer's
// internal types.
type PreachableSermonInput = {
    title: string;
    description: string;
    passage?: string;
    week: number;
    syntacticUnit?: SyntacticUnit;
    status?: PlannedSermon['status'];
    expositoryEnrichment?: PlannedSermonExpositoryEnrichment;
};

function derivePassState(
    isPending: boolean,
    payload: unknown,
    isError: boolean,
): PassState {
    if (isPending) return 'running';
    if (payload) return 'done';
    if (isError) return 'error';
    return 'pending';
}

function formatRange(s: { chapterStart: number; verseStart: number; chapterEnd: number; verseEnd: number }): string {
    if (s.chapterStart === s.chapterEnd) {
        if (s.verseStart === s.verseEnd) return `${s.chapterStart}:${s.verseStart}`;
        return `${s.chapterStart}:${s.verseStart}-${s.verseEnd}`;
    }
    return `${s.chapterStart}:${s.verseStart}-${s.chapterEnd}:${s.verseEnd}`;
}

// ── Pass 2 result ───────────────────────────────────────────────────────

function MacroResult({
    sections,
    bookDisplay,
    t,
}: {
    sections: ReadonlyArray<MacroSection>;
    bookDisplay: string;
    t: (key: string) => string;
}) {
    return (
        <ul className="space-y-2">
            {sections.map((s) => (
                <li
                    key={s.id}
                    className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 px-3 py-2.5"
                >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {s.title}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {bookDisplay} {formatRange(s)}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                            {t(`expository.results.macro.function.${s.functionInBook}`)}
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{s.theme}</p>
                </li>
            ))}
        </ul>
    );
}

// ── Pass 3 result ───────────────────────────────────────────────────────

function MicroResult({
    units,
    macros,
    bookDisplay,
    t,
}: {
    units: ReadonlyArray<ExegeticalUnit>;
    macros: ReadonlyArray<MacroSection>;
    bookDisplay: string;
    t: (key: string) => string;
}) {
    // Group units by their macroSectionId to preserve the macro→micro
    // hierarchy in the UI (matches how the pastor reads the analysis).
    const unitsByMacro = new Map<string, ExegeticalUnit[]>();
    units.forEach((u) => {
        const arr = unitsByMacro.get(u.macroSectionId) ?? [];
        arr.push(u);
        unitsByMacro.set(u.macroSectionId, arr);
    });
    return (
        <div className="space-y-4">
            {macros.map((m) => {
                const macroUnits = unitsByMacro.get(m.id) ?? [];
                if (macroUnits.length === 0) return null;
                return (
                    <div key={m.id}>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-1.5">
                            {m.title} <span className="font-mono normal-case text-slate-500">· {bookDisplay} {formatRange(m)}</span>
                        </p>
                        <ul className="space-y-1.5">
                            {macroUnits.map((u) => (
                                <li
                                    key={u.id}
                                    className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 px-3 py-2"
                                >
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                            {u.suggestedTitle}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                            {bookDisplay} {formatRange(u.syntacticUnit)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                                        <span className="font-medium">{t('expository.results.micro.function')}:</span> {u.functionInArgument}
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 italic mb-1">
                                        {u.centralIdea}
                                    </p>
                                    {u.literarySignals.length > 0 && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            <span className="font-medium">{t('expository.results.micro.signals')}:</span> {u.literarySignals.join('; ')}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}

// ── Pass 4 result ───────────────────────────────────────────────────────

function PreachableResult({
    units,
    bookDisplay,
    onUnitChange,
    t,
}: {
    units: ReadonlyArray<PreachableUnit>;
    bookDisplay: string;
    onUnitChange: (id: string, patch: Partial<PreachableUnit>) => void;
    t: (key: string) => string;
}) {
    return (
        <div className="space-y-3">
            {/* Preliminary-output disclaimer. The propositions below are
                LLM-generated panoramic readings, not exegetically validated
                conclusions. Surfaced prominently so a serious pastor or
                seminary student treats them as starting hypotheses to
                confirm via the paper workflow, not as authoritative
                output. */}
            <div className="rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <p>{t('expository.results.preachable.preliminaryBanner')}</p>
                </div>
            </div>
            <ol className="space-y-3">
                {units.map((u, idx) => (
                    <li
                        key={u.id}
                        className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 px-4 py-3"
                    >
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-semibold">
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    {/* Title is editable inline. Auto-saves
                                        to component state on every keystroke;
                                        the existing localStorage draft useEffect
                                        debounces the persistence. */}
                                    <input
                                        type="text"
                                        value={u.title}
                                        onChange={(e) => onUnitChange(u.id, { title: e.target.value })}
                                        className="text-sm font-semibold text-slate-800 dark:text-slate-100 bg-transparent border-0 px-1 -mx-1 rounded hover:bg-white dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-colors min-w-0 flex-1"
                                        aria-label={t('expository.results.preachable.editTitle') as string}
                                    />
                                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                                        {u.passage || `${bookDisplay} ${formatRange(u)}`}
                                    </span>
                                    {u.caseTreatment && (
                                        <span className="text-[10px] uppercase tracking-wide font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                                            {t(`expository.results.preachable.case.${u.caseTreatment}`)}
                                        </span>
                                    )}
                                    <span className="text-[10px] uppercase tracking-wide font-medium text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/30 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {t('expository.results.preachable.preliminaryChip')}
                                    </span>
                                </div>
                                <EditablePropositionRow
                                    label={t('expository.results.preachable.exegeticalProp') as string}
                                    value={u.exegeticalProposition}
                                    onChange={(v) => onUnitChange(u.id, { exegeticalProposition: v })}
                                />
                                <EditablePropositionRow
                                    label={t('expository.results.preachable.homileticalProp') as string}
                                    value={u.homileticalProposition}
                                    onChange={(v) => onUnitChange(u.id, { homileticalProposition: v })}
                                />
                                <EditablePropositionRow
                                    label={t('expository.results.preachable.objective') as string}
                                    value={u.pastoralObjective}
                                    onChange={(v) => onUnitChange(u.id, { pastoralObjective: v })}
                                />
                            </div>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
}

/**
 * Inline-editable proposition row. Renders as plain text by default
 * (no border, transparent bg) but reveals an editor border on hover/
 * focus — Notion-style "looks like text, edits like text". The
 * textarea uses `field-sizing: content` (Chromium 123+, Safari 18+)
 * to auto-grow with the content; Firefox falls back to a fixed
 * `rows={3}` minimum until that property ships there.
 */
function EditablePropositionRow({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="mb-1">
            <span className="text-[11px] uppercase tracking-wide text-slate-400 font-medium block">
                {label}
            </span>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={Math.max(2, Math.ceil(value.length / 90))}
                className="text-xs text-slate-700 dark:text-slate-300 bg-transparent border border-transparent rounded px-1.5 py-1 -mx-1.5 w-full resize-none hover:border-slate-200 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 focus:border-emerald-400 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none transition-colors"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
        </div>
    );
}

// ── Pass 5 result ───────────────────────────────────────────────────────

function FidelityResult({
    review,
    preachableUnits,
    addressedIssues,
    ignoredIssues,
    onToggleAddressed,
    onToggleIgnored,
    t,
}: {
    review: FidelityReview;
    preachableUnits: ReadonlyArray<PreachableUnit>;
    addressedIssues: Set<number>;
    ignoredIssues: Set<number>;
    onToggleAddressed: (idx: number) => void;
    onToggleIgnored: (idx: number) => void;
    t: (key: string) => string;
}) {
    const confidencePct = Math.round(review.overallConfidence * 100);
    const confidenceTone = review.overallConfidence >= 0.85
        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30'
        : review.overallConfidence >= 0.7
          ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30'
          : 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/30';

    const unitTitle = (id: string | null) => {
        if (!id) return t('expository.results.fidelity.global') as string;
        const found = preachableUnits.find((u) => u.id === id);
        return found ? found.title : id;
    };

    const totalIssues = review.issues.length;
    const triagedCount = addressedIssues.size + ignoredIssues.size;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-[11px] uppercase tracking-wide font-semibold px-3 py-1 rounded ${confidenceTone}`}>
                    {t('expository.results.fidelity.confidence')}: {confidencePct}%
                </span>
                {totalIssues === 0 && (
                    <span className="text-xs text-emerald-700 dark:text-emerald-300">
                        {t('expository.results.fidelity.noIssues')}
                    </span>
                )}
                {totalIssues > 0 && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('expository.results.fidelity.triagedSummary', {
                            triaged: triagedCount,
                            total: totalIssues,
                        })}
                    </span>
                )}
            </div>
            {totalIssues > 0 && (
                <ul className="space-y-2">
                    {review.issues.map((issue, idx) => (
                        <FidelityIssueRow
                            key={idx}
                            issue={issue}
                            unitLabel={unitTitle(issue.unitId)}
                            isAddressed={addressedIssues.has(idx)}
                            isIgnored={ignoredIssues.has(idx)}
                            onToggleAddressed={() => onToggleAddressed(idx)}
                            onToggleIgnored={() => onToggleIgnored(idx)}
                            t={t}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

function FidelityIssueRow({
    issue,
    unitLabel,
    isAddressed,
    isIgnored,
    onToggleAddressed,
    onToggleIgnored,
    t,
}: {
    issue: FidelityIssue;
    unitLabel: string;
    isAddressed: boolean;
    isIgnored: boolean;
    onToggleAddressed: () => void;
    onToggleIgnored: () => void;
    t: (key: string) => string;
}) {
    // Triaged rows mute their severity tone — once acted upon or
    // ignored, they shouldn't visually scream as urgent anymore.
    // Untriaged rows keep their full severity treatment.
    const isTriaged = isAddressed || isIgnored;
    const tone = isTriaged
        ? 'border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/30'
        : issue.severity === 'critical'
          ? 'border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/20'
          : issue.severity === 'warning'
            ? 'border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20'
            : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40';
    const badgeTone = issue.severity === 'critical'
        ? 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/30'
        : issue.severity === 'warning'
          ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30'
          : 'text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-zinc-800';
    const triageBadgeTone = isAddressed
        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30'
        : 'text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-zinc-800';
    const triageBadgeLabel = isAddressed
        ? t('expository.results.fidelity.addressed')
        : t('expository.results.fidelity.ignored');

    return (
        <li className={`rounded-lg border px-3 py-2 transition-colors ${tone} ${isTriaged ? 'opacity-75' : ''}`}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded ${badgeTone}`}>
                    {t(`expository.results.fidelity.severity.${issue.severity}`)}
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{unitLabel}</span>
                {isTriaged && (
                    <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded ${triageBadgeTone}`}>
                        {triageBadgeLabel}
                    </span>
                )}
                <div className="ml-auto flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={onToggleAddressed}
                        aria-pressed={isAddressed}
                        title={t('expository.results.fidelity.toggleAddressed') as string}
                        className={`p-1 rounded text-[11px] transition-colors ${
                            isAddressed
                                ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        }`}
                    >
                        <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onToggleIgnored}
                        aria-pressed={isIgnored}
                        title={t('expository.results.fidelity.toggleIgnored') as string}
                        className={`p-1 rounded text-[11px] transition-colors ${
                            isIgnored
                                ? 'bg-slate-500 text-white hover:bg-slate-400'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800'
                        }`}
                    >
                        <EyeOff className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            <p className={`text-xs ${isTriaged ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-300/60' : 'text-slate-700 dark:text-slate-300'}`}>
                {issue.description}
            </p>
            {issue.recommendation && (
                <p className={`mt-1 text-xs ${isTriaged ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>
                    <span className="font-medium">{t('expository.results.fidelity.recommendation')}:</span> {issue.recommendation}
                </p>
            )}
        </li>
    );
}
