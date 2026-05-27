import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sprout, Save, Loader2, BookOpen, PanelRightOpen, Scale } from 'lucide-react';
import { usePastoralSeed } from '@/hooks/usePastoralSeed';
import { useThreeWitnessesGate, usePastoralFidelityGate } from '@/hooks/usePastoralFidelityGate';
import { useWizard } from '../WizardContext';
import { PASTORAL_SEED_STEP_ORDER, PastoralSeedStepKey } from '@dosfilos/domain';
import { WitnessGate } from './witnesses/WitnessGate';
import { PastoralSeedBreadcrumb, BreadcrumbStep } from './PastoralSeedBreadcrumb';
import { ReadingStep } from './ReadingStep';
import { SyntaxStep } from './SyntaxStep';
import { MorphologyStep } from './MorphologyStep';
import { RecognitionStep } from './RecognitionStep';
import { FunctionStep } from './FunctionStep';
import { InsightStep } from './InsightStep';
import { BibleReaderPanel } from '@/components/bible/BibleReaderPanel';
import { cn } from '@/lib/utils';

const STEP_TITLES: Record<PastoralSeedStepKey, string> = {
    reading: 'Lectura',
    syntax: 'Sintaxis',
    morphology: 'Morfología',
    recognition: 'Reconocimiento',
    function: 'Función',
    insight: 'Insight',
};

interface Props {
    sermonId: string | null;
    userId: string;
    passage: string;
    /**
     * Fired when the seed has all six steps valid and the pastor clicks
     * "Continuar al borrador". Receives the completed `PastoralSeed`
     * so the caller can synthesize an `ExegeticalStudy` payload (via
     * `seedToExegesis`) for the downstream homiletics + draft phases
     * — those legacy steps still require the `exegesis` slot to be
     * populated. The wizard does NOT navigate; the parent decides
     * (typically `setStep(2)`).
     */
    onSeedCompleted: (seed: import('@dosfilos/domain').PastoralSeed) => void;
    /** Optional pre-fill payload from derivedContext (paper / Faculty). */
    derivedSuggestions?: {
        firstImpression?: string;
        mainClauseNote?: string;
        originalAudienceFunction?: string;
        note: string;
    };
    /** Optional banner above the wizard summarising the origin (paper / Faculty). */
    headerBanner?: React.ReactNode;
}

/**
 * Orchestrator for the six-step spine (ADR-002). Linear breadcrumb,
 * one sub-step rendered at a time, autosave via `usePastoralSeed`.
 * The wizard never lets the pastor jump forward to an unfinished step;
 * "Continuar a homiletics" only enables once every sub-step validates.
 */
export function PastoralSeedWizard({
    sermonId,
    userId,
    passage,
    onSeedCompleted,
    derivedSuggestions,
    headerBanner,
}: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    // Phase 2 (ADR-011): after the six-step seed completes, the wizard
    // can route through a three-witnesses validation gate before the
    // draft. Only when the `three_witnesses` sub-flag is on; otherwise
    // "Continuar al borrador" calls `onSeedCompleted` as in Phase 1.
    const [phase, setPhase] = useState<'seed' | 'witnesses'>('seed');
    const threeWitnesses = useThreeWitnessesGate();
    const { confessionalWitnessesEnabled } = usePastoralFidelityGate();
    // Bible reader sticky to the right by default — pastor needs the
    // text visible while doing every step. Toggleable so power users
    // can reclaim horizontal real estate when working on Insight (the
    // single step that's pure pastor output, no text consultation).
    const [bibleOpen, setBibleOpen] = useState(true);

    const {
        seed,
        loading,
        saving,
        lastSavedAt,
        evaluation,
        updateStep,
        appendToolUsage,
        appendPasteEvent,
        addWordStudy,
        saveWitnessReview,
        flush,
    } = usePastoralSeed({
        sermonId,
        userId,
        passage,
        enabled: true,
    });

    // Publish live completed-steps counter to the wizard context so
    // the global header pipeline can show `n/6` updating in real time
    // as the pastor types. Without this lift, the header relied on a
    // one-shot Firestore fetch and stayed stale until step navigation.
    const { setSeedCompletedSteps } = useWizard();
    useEffect(() => {
        setSeedCompletedSteps(evaluation?.completedSteps.length ?? 0);
    }, [evaluation, setSeedCompletedSteps]);

    const breadcrumbSteps = useMemo<BreadcrumbStep[]>(
        () =>
            PASTORAL_SEED_STEP_ORDER.map((key, i) => ({
                key,
                index: i + 1,
                title: STEP_TITLES[key],
                completed: evaluation?.perStep[key]?.valid ?? false,
            })),
        [evaluation],
    );

    const currentKey = PASTORAL_SEED_STEP_ORDER[currentIndex];

    const handleAdvance = async () => {
        await flush();
        if (currentIndex < PASTORAL_SEED_STEP_ORDER.length - 1) {
            setCurrentIndex((i) => i + 1);
            return;
        }
        if (!evaluation?.completed || !seed) return;
        // Last seed step done. Route through the witness gate when the
        // sub-flag is on; otherwise advance straight to the draft.
        if (threeWitnesses.enabled) {
            setPhase('witnesses');
            return;
        }
        onSeedCompleted(seed);
    };

    const handleJumpTo = (key: PastoralSeedStepKey) => {
        const next = PASTORAL_SEED_STEP_ORDER.indexOf(key);
        if (next === -1) return;
        setCurrentIndex(next);
    };

    if (loading || !seed) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Cargando tu estudio…</p>
            </div>
        );
    }

    // Phase 2 — three-witnesses validation gate (7th "Validación" phase).
    if (phase === 'witnesses') {
        return (
            <div className="max-w-7xl mx-auto py-3 px-2 space-y-4">
                <header className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-emerald-600" />
                        <h1 className="text-base font-semibold">Paso 7 · Validación</h1>
                        <span className="text-xs text-muted-foreground hidden md:inline">
                            · Tres testigos antes del borrador.
                        </span>
                    </div>
                </header>
                <WitnessGate
                    seed={seed}
                    confessionalWitnessesEnabled={confessionalWitnessesEnabled}
                    onProceed={async (review) => {
                        await saveWitnessReview(review);
                        onSeedCompleted(seed);
                    }}
                    onReviseClaim={() => {
                        setPhase('seed');
                        setCurrentIndex(PASTORAL_SEED_STEP_ORDER.indexOf('insight'));
                    }}
                    onBack={() => setPhase('seed')}
                />
            </div>
        );
    }

    const stepValidation = evaluation?.perStep[currentKey];
    const stepValid = stepValidation?.valid ?? false;

    const renderStep = () => {
        const common = { passage } as const;
        switch (currentKey) {
            case 'reading':
                return (
                    <ReadingStep
                        {...common}
                        data={seed.reading}
                        suggestion={derivedSuggestions?.firstImpression}
                        validation={stepValidation}
                        onChange={(patch) => updateStep('reading', patch)}
                    />
                );
            case 'syntax':
                return (
                    <SyntaxStep
                        {...common}
                        data={seed.syntax}
                        suggestion={derivedSuggestions?.mainClauseNote}
                        validation={stepValidation}
                        onChange={(patch) => updateStep('syntax', patch)}
                        onLogToolUsage={(tool) =>
                            appendToolUsage({
                                tool,
                                step: 'syntax',
                                invokedAt: new Date(),
                                durationSeconds: 0,
                            })
                        }
                    />
                );
            case 'morphology':
                return (
                    <MorphologyStep
                        {...common}
                        sermonId={sermonId}
                        data={seed.morphology}
                        validation={stepValidation}
                        onAddWordStudy={addWordStudy}
                        onChange={(patch) => updateStep('morphology', patch)}
                        onLogToolUsage={(tool) =>
                            appendToolUsage({
                                tool,
                                step: 'morphology',
                                invokedAt: new Date(),
                                durationSeconds: 0,
                            })
                        }
                    />
                );
            case 'recognition':
                return (
                    <RecognitionStep
                        {...common}
                        data={seed.recognition}
                        validation={stepValidation}
                        onChange={(patch) => updateStep('recognition', patch)}
                        onLogToolUsage={(tool) =>
                            appendToolUsage({
                                tool,
                                step: 'recognition',
                                invokedAt: new Date(),
                                durationSeconds: 0,
                            })
                        }
                    />
                );
            case 'function':
                return (
                    <FunctionStep
                        {...common}
                        data={seed.function}
                        suggestion={derivedSuggestions?.originalAudienceFunction}
                        validation={stepValidation}
                        onChange={(patch) => updateStep('function', patch)}
                        onLogToolUsage={(tool) =>
                            appendToolUsage({
                                tool,
                                step: 'function',
                                invokedAt: new Date(),
                                durationSeconds: 0,
                            })
                        }
                    />
                );
            case 'insight':
                return (
                    <InsightStep
                        {...common}
                        data={seed.insight}
                        validation={stepValidation}
                        onChange={(patch) => updateStep('insight', patch)}
                        onPasteEvent={(event) => appendPasteEvent(event)}
                    />
                );
        }
    };

    const isLastStep = currentIndex === PASTORAL_SEED_STEP_ORDER.length - 1;
    const seedCompleted = evaluation?.completed ?? false;

    return (
        <div className="max-w-7xl mx-auto py-3 px-2">
            <header className="space-y-2 mb-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Sprout className="h-4 w-4 text-emerald-600" />
                        <h1 className="text-base font-semibold">Estudio personal</h1>
                        <span className="text-xs text-muted-foreground hidden md:inline">
                            · Tú estudias; el sistema desarrolla.
                        </span>
                    </div>
                    {!bibleOpen && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBibleOpen(true)}
                            title="Mostrar Biblia"
                        >
                            <PanelRightOpen className="h-4 w-4" />
                            <BookOpen className="h-4 w-4 ml-1" />
                            <span className="ml-1 hidden sm:inline">Biblia</span>
                        </Button>
                    )}
                </div>
                {derivedSuggestions && (
                    <Card className="p-3 bg-amber-50 border-amber-300 text-sm dark:bg-amber-950/30 dark:border-amber-700">
                        <p className="font-medium mb-1">Pre-llenado parcial disponible</p>
                        <p className="text-muted-foreground">{derivedSuggestions.note}</p>
                    </Card>
                )}
                {headerBanner}
                <PastoralSeedBreadcrumb
                    steps={breadcrumbSteps}
                    currentIndex={currentIndex}
                    onJumpTo={handleJumpTo}
                />
            </header>

            {/* Two-column layout: step content + sticky Bible reader.
                Bible defaults to open because every step (except Insight)
                benefits from having the text visible. Pastor can collapse. */}
            <div
                className={cn(
                    'grid gap-4',
                    bibleOpen ? 'grid-cols-1 lg:grid-cols-[1fr_420px]' : 'grid-cols-1',
                )}
            >
                <div className="space-y-4">
                    <Card className="p-6">{renderStep()}</Card>

                    <footer className="flex flex-wrap items-center justify-between gap-3 px-1">
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            {saving ? (
                                <>
                                    <Loader2 className="h-3 w-3 animate-spin" /> Guardando…
                                </>
                            ) : lastSavedAt ? (
                                <>
                                    <Save className="h-3 w-3" /> Guardado {lastSavedAt.toLocaleTimeString()}
                                </>
                            ) : (
                                <span>Cambios se guardan automáticamente.</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {currentIndex > 0 && (
                                <Button variant="outline" onClick={() => setCurrentIndex((i) => i - 1)}>
                                    Anterior
                                </Button>
                            )}
                            {!isLastStep && (
                                <Button onClick={handleAdvance} disabled={!stepValid}>
                                    Siguiente
                                </Button>
                            )}
                            {isLastStep && (
                                <Button
                                    onClick={handleAdvance}
                                    disabled={!seedCompleted}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {seedCompleted
                                        ? threeWitnesses.enabled
                                            ? 'Continuar a validación →'
                                            : 'Continuar al borrador →'
                                        : 'Completa los 6 pasos para continuar'}
                                </Button>
                            )}
                        </div>
                    </footer>
                </div>

                {bibleOpen && (
                    <aside className="lg:sticky lg:top-4 lg:self-start lg:h-[calc(100vh-8rem)]">
                        <div className="h-full rounded-lg border bg-card overflow-hidden">
                            <BibleReaderPanel
                                passage={passage}
                                onClose={() => setBibleOpen(false)}
                            />
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
