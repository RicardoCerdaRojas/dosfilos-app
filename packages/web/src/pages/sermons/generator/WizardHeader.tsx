import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BookOpen, Mic2, FileText, Check, LogOut, Sprout } from 'lucide-react';
import { useWizard } from './WizardContext';
import { Button } from '@/components/ui/button';
import { LibraryStatusBadge } from '@/components/library/LibraryStatusBadge';
import { ExegesisQuotaBadge } from '@/components/exegesis/ExegesisQuotaBadge';
import { WizardSourcesBadge } from '@/components/sermons/WizardSourcesBadge';
import { usePastoralFidelityGate } from '@/hooks/usePastoralFidelityGate';
import { PASTORAL_SEED_STEP_ORDER } from '@dosfilos/domain';

interface WizardHeaderProps {
    currentStep: number;
    onExit?: () => void;
}

interface Phase {
    step: number;
    label: string;
    icon: typeof BookOpen;
    /** Pastoral-only label: short title that fits inside the chip when flag-on. */
    pastoralLabel?: string;
}

const LEGACY_PHASES: Phase[] = [
    { step: 1, label: 'Exégesis', icon: BookOpen },
    { step: 2, label: 'Homilética', icon: Mic2 },
    { step: 3, label: 'Redacción', icon: FileText },
];

const PASTORAL_PHASES: Phase[] = [
    { step: 0, label: 'Pasaje', icon: BookOpen },
    { step: 1, label: `Estudio (${PASTORAL_SEED_STEP_ORDER.length} pasos)`, icon: Sprout, pastoralLabel: 'Estudio' },
    { step: 2, label: 'Homilética', icon: Mic2 },
    { step: 3, label: 'Redacción', icon: FileText },
];

/**
 * Wizard top bar. Renders a pipeline of phases + right-side action
 * widgets (sources / quota / library / exit).
 *
 * Pastoral Fidelity Phase 1 reshapes the pipeline:
 *   - Adds Step 0 (Pasaje) as a first-class phase under flag-on, so
 *     the pastor doesn't see a misleading "Preparando…" label while
 *     entering the passage.
 *   - Step 1 becomes "Estudio (N pasos)" with a `n/N` sub-counter
 *     computed live from the persisted `PastoralSeed`. `N` derives from
 *     `PASTORAL_SEED_STEP_ORDER.length` (8 since Phase 1.6, ADR-022).
 *   - Quota + exit widgets are hidden on Step 0 — nothing to save
 *     yet and surfacing quota at that point reads as friction.
 */
export function WizardHeader({ currentStep, onExit }: WizardHeaderProps) {
    const { setStep, exegesis, homiletics, seedCompletedSteps } = useWizard();
    const navigate = useNavigate();
    const pastoralGate = usePastoralFidelityGate();
    const goToBilling = () => navigate('/dashboard/settings/billing');

    const usePastoral = pastoralGate.allowed;
    const PHASES: Phase[] = usePastoral ? PASTORAL_PHASES : LEGACY_PHASES;

    // `seedCompletedSteps` is published by `PastoralSeedWizard` into
    // the shared `WizardContext` on every state change, so the badge
    // updates in real time as the pastor types. Previous version
    // fetched Firestore one-shot on `sermonId/step` changes and went
    // stale while the pastor was still inside Step 1.

    const handleStepClick = (step: number) => {
        if (step === 0) {
            setStep(0);
            return;
        }
        if (step === 1) {
            setStep(1);
            return;
        }
        if (step === 2 && (exegesis || (usePastoral && seedCompletedSteps === PASTORAL_SEED_STEP_ORDER.length))) {
            setStep(2);
            return;
        }
        if (step === 3 && homiletics) {
            setStep(3);
        }
    };

    // Step 0 (passage entry) is a clean "getting started" state — no
    // sermon doc yet, no quota consumed. Hide the right-side widgets to
    // avoid surfacing actions that have nothing to act on.
    const showRightWidgets = currentStep > 0;

    return (
        <div className="border-b bg-background flex-shrink-0">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {PHASES.map((p, index) => {
                            const Icon = p.icon;
                            const isActive = p.step === currentStep;
                            const isCompleted = p.step < currentStep;
                            const isClickable =
                                p.step === 0
                                || p.step === 1
                                || (p.step === 2 && (!!exegesis || (usePastoral && seedCompletedSteps === PASTORAL_SEED_STEP_ORDER.length)))
                                || (p.step === 3 && !!homiletics);

                            const isPastoralStudyStep = usePastoral && p.step === 1;
                            const subCounter = isPastoralStudyStep
                                ? `${seedCompletedSteps}/${PASTORAL_SEED_STEP_ORDER.length}`
                                : null;

                            return (
                                <div
                                    key={p.step}
                                    className={cn('flex items-center', isClickable && 'cursor-pointer')}
                                    onClick={() => isClickable && handleStepClick(p.step)}
                                >
                                    {index > 0 && (
                                        <div className="relative h-[2px] w-8 sm:w-12 mx-1 sm:mx-2 bg-muted overflow-hidden">
                                            <div
                                                className={cn(
                                                    'absolute inset-0 bg-gradient-to-r from-primary to-primary/80 transition-transform duration-500',
                                                    isCompleted ? 'translate-x-0' : '-translate-x-full',
                                                )}
                                            />
                                        </div>
                                    )}
                                    <div
                                        className={cn(
                                            'flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300',
                                            isActive && 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md scale-105',
                                            isCompleted && 'bg-primary/10 text-primary hover:bg-primary/20',
                                            !isActive && !isCompleted && 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        <div className={cn('transition-transform duration-300', isActive && 'scale-110')}>
                                            {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                        </div>
                                        <span className="text-sm font-medium hidden sm:inline">
                                            {p.pastoralLabel && isActive ? p.pastoralLabel : p.label}
                                        </span>
                                        {subCounter && isActive && (
                                            <span
                                                className={cn(
                                                    'text-xs font-semibold rounded-full px-1.5 py-0.5',
                                                    'bg-primary-foreground/20',
                                                )}
                                            >
                                                {subCounter}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {showRightWidgets && (
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-medium text-muted-foreground hidden md:block">
                                {usePastoral
                                    ? `Paso ${Math.max(currentStep, 0)} de 3`
                                    : currentStep <= 0
                                        ? 'Preparando…'
                                        : `Paso ${Math.min(currentStep, 3)} de 3`}
                            </div>
                            <WizardSourcesBadge />
                            <ExegesisQuotaBadge variant="compact" onUpgradePlan={goToBilling} />
                            <LibraryStatusBadge />
                            {onExit && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onExit}
                                    className="text-muted-foreground hover:text-destructive gap-2"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span className="hidden sm:inline">Guardar y Salir</span>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
