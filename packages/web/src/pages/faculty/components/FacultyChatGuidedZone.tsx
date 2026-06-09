import { GuidedSermonActivationPrompt } from '@/components/faculty/GuidedSermonActivationPrompt';

interface Props {
    activationPromptOpen: boolean;
    isProcessing: boolean;
    closeActivationPrompt: () => void;
    activate: (passage: string) => Promise<void>;
    /** Optional pre-fill (e.g. a passage already discussed in the chat). */
    suggestedPassage?: string;
}

/**
 * Phase 2.5 PR B (ADR-028) — host for the guided-sermon activation modal.
 *
 * The activation entry point now lives next to the chat input (always reachable
 * without scrolling to the top of the conversation); this component only renders
 * the centered modal the entry opens. The `GuidedSermonHeader` (sticky progress)
 * stays inline in `FacultyChatPage`.
 */
export function FacultyChatGuidedZone({
    activationPromptOpen,
    isProcessing,
    closeActivationPrompt,
    activate,
    suggestedPassage,
}: Props) {
    return (
        <GuidedSermonActivationPrompt
            open={activationPromptOpen}
            onActivate={activate}
            onCancel={closeActivationPrompt}
            isProcessing={isProcessing}
            suggestedPassage={suggestedPassage}
        />
    );
}
