import { useEffect, useState } from 'react';
import { Sprout, Loader2 } from 'lucide-react';
import { parsePassageReference } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Props {
    /** Controls the modal visibility. */
    open: boolean;
    /** When the chat already has context (e.g. user discussed a passage), pre-fill it. */
    suggestedPassage?: string;
    /** Called with the confirmed passage when the pastor activates the agent. */
    onActivate: (passage: string) => Promise<void> | void;
    onCancel: () => void;
    isProcessing: boolean;
}

/**
 * Phase 2.5 PR B (ADR-028) — Activation prompt for the Faculty Socratic
 * Sermon Agent.
 *
 * Surfaced when the pastor clicks "Bosquejo de Sermón" mid-chat (replacing
 * `SermonOutlinePreviewModal` under the `study_depth` flag) or from any
 * other CTA that needs explicit confirmation before activating guided
 * mode. Reuses what we know about the conversation by pre-filling the
 * passage when possible.
 */
export function GuidedSermonActivationPrompt({
    open,
    suggestedPassage,
    onActivate,
    onCancel,
    isProcessing,
}: Props) {
    const { t } = useTranslation('guidedSermon');
    const [passage, setPassage] = useState(suggestedPassage?.trim() ?? '');
    const [error, setError] = useState<string | null>(null);

    // Reset the field each time the modal opens so a cancelled+reopened prompt
    // starts clean (or re-seeds from the suggested passage).
    useEffect(() => {
        if (open) {
            setPassage(suggestedPassage?.trim() ?? '');
            setError(null);
        }
    }, [open, suggestedPassage]);

    const canActivate = passage.trim().length > 0 && !isProcessing;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canActivate) return;
        // Validate against the canon before activating: an unrecognized book
        // (e.g. the typo "1 Cotintios") would create a study whose genre step
        // can never pass. Keep the pastor in the dialog to fix the reference
        // instead of failing server-side with a transient toast.
        const trimmed = passage.trim();
        if (!parsePassageReference(trimmed).ok) {
            setError(t('activation.invalidPassage'));
            return;
        }
        setError(null);
        await onActivate(trimmed);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o && !isProcessing) onCancel(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sprout className="h-5 w-5 text-success" />
                        {t('activation.title')}
                    </DialogTitle>
                    <DialogDescription>{t('activation.description')}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-1.5">
                        <label htmlFor="guided-sermon-passage" className="text-xs font-medium text-foreground">
                            {t('activation.passageLabel')}
                        </label>
                        <Input
                            id="guided-sermon-passage"
                            type="text"
                            value={passage}
                            onChange={(e) => { setPassage(e.target.value); if (error) setError(null); }}
                            placeholder={t('activation.passagePlaceholder')}
                            disabled={isProcessing}
                            aria-invalid={error ? true : undefined}
                            autoFocus
                        />
                        {error ? (
                            <p className="text-[10px] text-destructive">{error}</p>
                        ) : (
                            <p className="text-[10px] text-muted-foreground">{t('activation.passageHint')}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isProcessing}>
                            {t('activation.cancel')}
                        </Button>
                        <Button type="submit" size="sm" disabled={!canActivate}>
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> {t('activation.activating')}
                                </>
                            ) : (
                                <>
                                    <Sprout className="h-4 w-4" /> {t('activation.activate')}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
