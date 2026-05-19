import { useState, useCallback, useEffect, useRef } from 'react';
import { sermonService } from '@dosfilos/application';
import { ExegeticalStudy, HomileticalAnalysis, Sermon, SermonContent } from '@dosfilos/domain';

type DerivedContext = NonNullable<NonNullable<Sermon['wizardProgress']>['derivedContext']>;

interface WizardState {
    step: number;
    passage: string;
    exegesis: ExegeticalStudy | null;
    homiletics: HomileticalAnalysis | null;
    draft: SermonContent | null;
    derivedContext?: DerivedContext | null;
}

export function useAutoSave(
    sermonId: string | null,
    wizardState: WizardState,
    userId: string
) {
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const previousStateRef = useRef<WizardState | null>(null);

    const save = useCallback(async () => {
        if (!sermonId || !userId) {
            return;
        }

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

            await sermonService.updateWizardProgress(sermonId, progress);

            setLastSaved(new Date());
            previousStateRef.current = wizardState; // Update previous state after successful save
        } catch (error) {
            console.error('Error auto-saving sermon:', error);
        } finally {
            setSaving(false);
        }
    }, [sermonId, wizardState, userId]);

    // Auto-save ONLY when content actually changes
    useEffect(() => {
        if (!sermonId) return;

        const prev = previousStateRef.current;

        // Skip if this is the first render or no previous state
        if (!prev) {
            previousStateRef.current = wizardState;
            return;
        }

        // Check if any content has actually changed
        const exegesisChanged = prev.exegesis !== wizardState.exegesis;
        const homileticsChanged = prev.homiletics !== wizardState.homiletics;
        const draftChanged = prev.draft !== wizardState.draft;
        const stepChanged = prev.step !== wizardState.step;

        // Only save if there's a real change
        if (exegesisChanged || homileticsChanged || draftChanged || stepChanged) {
            save();
        }
    }, [wizardState.exegesis, wizardState.homiletics, wizardState.draft, wizardState.step, sermonId, save]);

    return { saving, lastSaved, save };
}
