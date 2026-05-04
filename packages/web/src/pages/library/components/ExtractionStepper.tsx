import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { LibraryResourceEntity } from '@dosfilos/domain';
import type { IndexStatus } from '../hooks/useLibraryResources';

interface ExtractionStepperProps {
    resource: LibraryResourceEntity;
    indexStatus: IndexStatus;
}

type PhaseId = 'uploading' | 'extracting' | 'indexing' | 'ready';
type PhaseState = 'pending' | 'active' | 'done' | 'failed';

interface PhaseDescriptor {
    id: PhaseId;
    state: PhaseState;
}

/**
 * Visual progression stepper for the library extraction pipeline.
 *
 * Renders 4 phases (Subiendo → Extrayendo → Indexando → Listo) with
 * the current phase highlighted, completed phases checked, and pending
 * phases muted. Replaces the static "Por procesar" / "Procesando…"
 * label with a visual journey so the user sees WHERE they are in the
 * pipeline, not just the current state.
 *
 * Drives off `resource.textExtractionStatus` + `indexStatus`:
 *
 *   pending/processing            → Extrayendo (active)
 *   ready ext + indexing          → Extrayendo (done) + Indexando (active)
 *   ready ext + indexed           → all done (Listo)
 *   ready ext + not-indexed/legacy → Extrayendo (done) + Indexando (failed/idle)
 *   failed (any)                  → first failed phase shown red
 *
 * Hidden once the resource hits 'ready' (the card already has a "Listo"
 * pill — no need to also render the stepper, which would just duplicate
 * the signal once the user is done caring).
 *
 * Pure component, ~80 lines. Tone tokens only (no raw colour literals).
 */
export function ExtractionStepper({ resource, indexStatus }: ExtractionStepperProps) {
    const { t } = useTranslation('library');

    // Don't render once the user no longer cares about progression —
    // the green "Listo" pill above already conveys completion.
    if (indexStatus === 'indexed') return null;

    const phases = computePhases(resource, indexStatus);

    return (
        <div
            className="flex items-center gap-1 text-[10px] text-muted-foreground"
            role="list"
            aria-label={t('stepper.ariaLabel')}
        >
            {phases.map((phase, idx) => (
                <div key={phase.id} className="flex items-center gap-1" role="listitem">
                    <PhaseDot state={phase.state} />
                    <span
                        className={cn(
                            'tracking-wide',
                            phase.state === 'active' && 'text-foreground font-medium',
                            phase.state === 'done' && 'text-foreground/70',
                            phase.state === 'failed' && 'text-destructive font-medium',
                        )}
                    >
                        {t(`stepper.phase.${phase.id}`)}
                    </span>
                    {idx < phases.length - 1 && (
                        <span
                            aria-hidden
                            className={cn(
                                'mx-0.5 h-px w-3',
                                phase.state === 'done' ? 'bg-foreground/40' : 'bg-border',
                            )}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

function PhaseDot({ state }: { state: PhaseState }) {
    if (state === 'active') {
        return <Loader2 className="h-3 w-3 animate-spin text-info" aria-hidden />;
    }
    if (state === 'done') {
        return (
            <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-success-subtle text-success-subtle-foreground">
                <Check className="h-2 w-2" aria-hidden />
            </span>
        );
    }
    if (state === 'failed') {
        return (
            <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-destructive/15 text-destructive text-[8px] font-bold" aria-hidden>
                !
            </span>
        );
    }
    // pending
    return <span className="inline-block h-3 w-3 rounded-full border border-border bg-background" aria-hidden />;
}

function computePhases(
    resource: LibraryResourceEntity,
    indexStatus: IndexStatus,
): PhaseDescriptor[] {
    // Phase 1: Upload always succeeds by the time the resource doc
    // exists (we only render this component for existing resources),
    // so it's always 'done'.
    const uploading: PhaseState = 'done';

    // Phase 2: Extracting maps to textExtractionStatus.
    let extracting: PhaseState;
    if (resource.textExtractionStatus === 'failed') extracting = 'failed';
    else if (resource.textExtractionStatus === 'pending'
        || resource.textExtractionStatus === 'processing') extracting = 'active';
    else extracting = 'done';

    // Phase 3: Indexing maps to indexStatus once extraction is done.
    let indexing: PhaseState;
    if (extracting !== 'done') {
        indexing = 'pending';
    } else if (indexStatus === 'indexing' || indexStatus === 'checking') {
        indexing = 'active';
    } else if (indexStatus === 'indexed') {
        indexing = 'done';
    } else if (indexStatus === 'not-indexed') {
        indexing = 'failed';
    } else {
        indexing = 'pending';
    }

    // Phase 4: Ready is reached when both prior phases are done.
    const ready: PhaseState = (extracting === 'done' && indexing === 'done')
        ? 'done'
        : 'pending';

    return [
        { id: 'uploading', state: uploading },
        { id: 'extracting', state: extracting },
        { id: 'indexing', state: indexing },
        { id: 'ready', state: ready },
    ];
}
