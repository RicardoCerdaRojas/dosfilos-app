import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { sermonService } from '@dosfilos/application';
import { ExegeticalStudy, HomileticalAnalysis, Sermon, SermonContent, SermonPersonalization } from '@dosfilos/domain';

type DerivedContext = NonNullable<NonNullable<Sermon['wizardProgress']>['derivedContext']>;

interface WizardState {
    step: number;
    passage: string;
    exegesis: ExegeticalStudy | null;
    homiletics: HomileticalAnalysis | null;
    draft: SermonContent | null;
    derivedContext?: DerivedContext | null;
    personalization?: SermonPersonalization | null;
    audienceRigor?: 'beginner' | 'seminary' | null;
}

export function useAutoSave(
    sermonId: string | null,
    wizardState: WizardState,
    userId: string
) {
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const previousStateRef = useRef<WizardState | null>(null);
    // Always read the latest wizardState inside `save` without re-creating
    // `save` (and the autosave effect) on every render.
    const wizardStateRef = useRef(wizardState);
    wizardStateRef.current = wizardState;
    // Surface a toast only once per failure burst so a flaky connection
    // doesn't spam the user with identical toasts on every keystroke.
    // Reset on first success so the next failure burst surfaces again.
    const failureToastShownRef = useRef(false);

    const save = useCallback(async () => {
        if (!sermonId || !userId) {
            return;
        }
        const wizardState = wizardStateRef.current;

        // Only save if we have at least one phase completed
        if (!wizardState.exegesis && !wizardState.homiletics && !wizardState.draft) {
            return;
        }

        try {
            setSaving(true);

            // Build progress object, filtering out undefined values
            const progress: any = {
                currentStep: wizardState.step,
                passage: wizardState.passage,
                lastSaved: new Date()
            };

            if (wizardState.exegesis) progress.exegesis = wizardState.exegesis;
            if (wizardState.homiletics) progress.homiletics = wizardState.homiletics;
            if (wizardState.draft) progress.draft = wizardState.draft;
            // derivedContext must persist across auto-saves —
            // updateWizardProgress replaces the whole object, so we
            // re-include it on every save when present. Wizard-native
            // sermons (no paper, no Faculty origin) carry no
            // derivedContext and this branch is skipped.
            if (wizardState.derivedContext) progress.derivedContext = wizardState.derivedContext;
            // Persist personalization when any field is populated. Skip
            // the empty default object so we don't write an empty
            // wizardProgress.personalization for users who never opened
            // the pastoral context panel.
            if (wizardState.personalization && hasAnyField(wizardState.personalization)) {
                progress.personalization = wizardState.personalization;
            }
            // Only persist non-default rigor (seminary). Beginner is the
            // implicit default; persisting it would write to every legacy
            // sermon unnecessarily.
            if (wizardState.audienceRigor === 'seminary') {
                progress.audienceRigor = 'seminary';
            }

            await sermonService.updateWizardProgress(sermonId, progress);

            setLastSaved(new Date());
            previousStateRef.current = wizardState; // Update previous state after successful save
            failureToastShownRef.current = false; // Reset so next burst surfaces
        } catch (error) {
            console.error('Error auto-saving sermon:', error);
            // Surface persistence failure to the user — they cannot
            // detect it otherwise and lose work assuming auto-save
            // worked. One toast per failure burst to avoid spam.
            if (!failureToastShownRef.current) {
                failureToastShownRef.current = true;
                toast.error(
                    'No se pudo guardar tu progreso. Reintentaremos en el próximo cambio. Si el problema persiste, copia tu contenido antes de cerrar.',
                    { duration: 8000 },
                );
            }
        } finally {
            setSaving(false);
        }
    }, [sermonId, userId]);

    // Auto-save when content actually changes — DEBOUNCED so a burst of
    // keystrokes (e.g. typing pastoral notes) coalesces into one save instead
    // of firing per character and flickering the "Guardando…" indicator.
    useEffect(() => {
        if (!sermonId) return;

        const prev = previousStateRef.current;

        // Skip if this is the first render or no previous state
        if (!prev) {
            previousStateRef.current = wizardState;
            return;
        }

        // Check if any content has actually changed
        const changed =
            prev.exegesis !== wizardState.exegesis ||
            prev.homiletics !== wizardState.homiletics ||
            prev.draft !== wizardState.draft ||
            prev.step !== wizardState.step ||
            prev.personalization !== wizardState.personalization ||
            prev.audienceRigor !== wizardState.audienceRigor;

        if (!changed) return;

        const timer = setTimeout(() => { void save(); }, 800);
        return () => clearTimeout(timer);
    }, [wizardState.exegesis, wizardState.homiletics, wizardState.draft, wizardState.step, wizardState.personalization, wizardState.audienceRigor, sermonId, save]);

    return { saving, lastSaved, save };
}

function hasAnyField(p: SermonPersonalization): boolean {
    return Boolean(
        p.tone ||
        p.situationalContext?.trim() ||
        p.congregationDescription?.trim() ||
        p.pastoralEmphasis?.trim() ||
        p.illustrations?.trim() ||
        p.preacherNotes?.trim()
    );
}
