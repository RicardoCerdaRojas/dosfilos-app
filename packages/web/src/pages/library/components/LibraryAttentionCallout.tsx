import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface LibraryAttentionCalloutProps {
    /** Number of resources awaiting processing. */
    pendingCount: number;
    /** Whether a bulk-process job is already running (callout hides during run). */
    isProcessing: boolean;
    /** Triggered when the user clicks the bulk-process action. */
    onProcessAll: () => void;
}

/**
 * Callout banner shown when the user has resources that haven't been processed
 * yet. Educates the user about why processing matters and offers a single
 * primary action to handle all pending at once.
 *
 * Hides itself if there's nothing pending or if processing is already running
 * (in which case `LibraryProgress` takes over).
 */
export function LibraryAttentionCallout({
    pendingCount,
    isProcessing,
    onProcessAll,
}: LibraryAttentionCalloutProps) {
    const { t } = useTranslation('library');

    if (pendingCount <= 0 || isProcessing) return null;

    return (
        <div className="bg-warning-subtle border border-warning/30 rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-warning text-warning-foreground flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-warning-subtle-foreground font-medium mb-1">
                    {t('attentionCallout.label')}
                </div>
                <h2 className="font-reading text-[19px] leading-tight text-foreground mb-1">
                    {t('attentionCallout.title', { count: pendingCount })}
                </h2>
                <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                    {t('attentionCallout.description')}
                </p>
            </div>
            <Button
                onClick={onProcessAll}
                disabled={isProcessing}
                className="bg-warning hover:bg-warning/90 text-warning-foreground gap-2 shrink-0"
            >
                <RefreshCw className="h-4 w-4" />
                {t('attentionCallout.actionButton')}
            </Button>
        </div>
    );
}
