import { useState } from 'react';
import { Sprout, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Props {
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
    suggestedPassage,
    onActivate,
    onCancel,
    isProcessing,
}: Props) {
    const { t } = useTranslation('guidedSermon');
    const [passage, setPassage] = useState(suggestedPassage?.trim() ?? '');

    const canActivate = passage.trim().length > 0 && !isProcessing;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canActivate) return;
        await onActivate(passage.trim());
    };

    return (
        <Card className="p-4 border-info/30 bg-info-subtle/30">
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-start gap-2">
                    <Sprout className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                        <h3 className="text-sm font-semibold text-foreground">{t('activation.title')}</h3>
                        <p className="text-xs text-muted-foreground">{t('activation.description')}</p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="guided-sermon-passage" className="text-xs font-medium text-foreground">
                        {t('activation.passageLabel')}
                    </label>
                    <Input
                        id="guided-sermon-passage"
                        type="text"
                        value={passage}
                        onChange={(e) => setPassage(e.target.value)}
                        placeholder={t('activation.passagePlaceholder')}
                        disabled={isProcessing}
                        autoFocus
                    />
                    <p className="text-[10px] text-muted-foreground">{t('activation.passageHint')}</p>
                </div>

                <div className="flex items-center justify-end gap-2">
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
                </div>
            </form>
        </Card>
    );
}
