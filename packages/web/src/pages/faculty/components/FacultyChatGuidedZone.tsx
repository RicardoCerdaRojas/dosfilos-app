import { Sprout } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { GuidedSermonActivationPrompt } from '@/components/faculty/GuidedSermonActivationPrompt';

interface Props {
    effectiveSessionId: string;
    isFlagEnabled: boolean;
    hasGuidedSession: boolean;
    activationPromptOpen: boolean;
    isProcessing: boolean;
    openActivationPrompt: () => void;
    closeActivationPrompt: () => void;
    activate: (passage: string) => Promise<void>;
}

/**
 * Phase 2.5 PR B (ADR-028) — guided-sermon CTA banner + activation prompt
 * inline in the chat scroll. The `GuidedSermonHeader` (sticky, outside the
 * scroll) stays inline in `FacultyChatPage` for layout reasons.
 *
 * Extracted from `chat.tsx` (Boy-Scout) to isolate the guided-sermon
 * activation UI for future iteration without churning the parent.
 */
export function FacultyChatGuidedZone({
    effectiveSessionId,
    isFlagEnabled,
    hasGuidedSession,
    activationPromptOpen,
    isProcessing,
    openActivationPrompt,
    closeActivationPrompt,
    activate,
}: Props) {
    const { t } = useTranslation('guidedSermon');
    const showCtaBanner =
        isFlagEnabled && !hasGuidedSession && !!effectiveSessionId && !activationPromptOpen;
    return (
        <>
            {showCtaBanner && (
                <div className="rounded-lg border border-info/30 bg-info-subtle/30 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Sprout className="h-4 w-4 text-success" />
                        <div>
                            <p className="text-sm font-medium text-foreground">{t('cta.startGuided')}</p>
                            <p className="text-xs text-muted-foreground">{t('cta.startGuidedDescription')}</p>
                        </div>
                    </div>
                    <Button size="sm" onClick={openActivationPrompt}>
                        <Sprout className="h-4 w-4" /> {t('cta.startGuided')}
                    </Button>
                </div>
            )}
            {activationPromptOpen && (
                <GuidedSermonActivationPrompt
                    onActivate={activate}
                    onCancel={closeActivationPrompt}
                    isProcessing={isProcessing}
                />
            )}
        </>
    );
}
