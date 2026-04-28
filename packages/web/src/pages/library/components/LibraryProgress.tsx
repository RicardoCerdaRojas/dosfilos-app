import { useTranslation } from '@/i18n';
import { Loader2 } from 'lucide-react';

export interface LibraryProgressState {
    /** Index of the resource currently being processed (1-based). */
    current: number;
    /** Total resources in the bulk-process job. */
    total: number;
    /** Title of the resource currently being processed (for the live label). */
    currentTitle: string;
}

interface LibraryProgressProps {
    /** Progress state. When `null`, the component renders nothing. */
    progress: LibraryProgressState | null;
}

/**
 * Inline progress strip shown while a bulk-process job is running. Replaces
 * the `LibraryAttentionCallout` during the run; pairs naturally with it.
 *
 * Renders nothing when `progress` is null — caller can pass through without
 * conditional rendering.
 */
export function LibraryProgress({ progress }: LibraryProgressProps) {
    const { t } = useTranslation('library');

    if (!progress) return null;

    const percent = (progress.current / progress.total) * 100;

    return (
        <div className="bg-info-subtle border border-info/30 rounded-xl p-4 flex items-center gap-4">
            <Loader2 className="h-5 w-5 animate-spin text-info shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground truncate">
                    {t('progress.processing', {
                        current: progress.current,
                        total: progress.total,
                        title: progress.currentTitle,
                    })}
                </div>
                <div className="mt-1.5 h-1.5 w-full bg-info/15 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-info transition-all"
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
