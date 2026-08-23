import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { sermonService } from '@dosfilos/application';
import { buildWizardProgress, type WizardState } from './buildWizardProgress';


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

            const progress = buildWizardProgress(wizardState);

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

