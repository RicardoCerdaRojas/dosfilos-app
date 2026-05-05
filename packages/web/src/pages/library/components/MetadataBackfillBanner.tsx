import { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import {
    useBackfillLibraryMetadata,
    type UseBackfillLibraryMetadataResult,
} from '../hooks/useBackfillLibraryMetadata';
import type { LibraryResourceEntity } from '@dosfilos/domain';

interface MetadataBackfillBannerProps {
    resources: ReadonlyArray<LibraryResourceEntity>;
}

/**
 * v1.7.1 — Banner shown above the library list when one or more
 * resources are missing the smart-match metadata (`coversBibleBooks`
 * + `scope`). Click runs the inferer over each title and writes the
 * result for resources where the inferer is confident.
 *
 * Self-hides:
 *   - When there are no incomplete resources (the predicate the
 *     `ResourceCard` uses to show the "Faltan datos" pill).
 *   - When the user explicitly dismisses it for the session
 *     (\`Más tarde\` button).
 *
 * After a run, replaces itself with a one-line summary of the result
 * (\`X actualizados, Y necesitan edición manual\`) until the user
 * dismisses or navigates away. The summary is silent if everything
 * was matched — no need to announce success when the pill count went
 * to zero, the visual change speaks for itself.
 */
export function MetadataBackfillBanner({ resources }: MetadataBackfillBannerProps) {
    const { t } = useTranslation('library');
    const backfill = useBackfillLibraryMetadata(resources);
    const [dismissed, setDismissed] = useState(false);
    const [postRunDismissed, setPostRunDismissed] = useState(false);

    if (dismissed) return null;

    // Pre-run: invite the user.
    if (backfill.lastResult === null) {
        if (backfill.incompleteResources.length === 0) return null;
        return (
            <PreRun
                count={backfill.incompleteResources.length}
                isRunning={backfill.isRunning}
                onRun={() => runBackfill(backfill, t)}
                onDismiss={() => setDismissed(true)}
            />
        );
    }

    // Post-run: summary only when there's something interesting to say.
    if (postRunDismissed) return null;
    const r = backfill.lastResult;
    const needsManual = r.skipped + r.failed;
    if (r.updated === 0 && needsManual === 0) return null; // nothing to surface
    return (
        <PostRun
            updated={r.updated}
            needsManual={needsManual}
            failed={r.failed}
            onDismiss={() => setPostRunDismissed(true)}
        />
    );
}

async function runBackfill(
    backfill: UseBackfillLibraryMetadataResult,
    t: (key: string, opts?: Record<string, unknown>) => string,
): Promise<void> {
    try {
        const result = await backfill.runBackfill();
        if (result.failed > 0) {
            toast.warning(
                t('metadataBackfill.toast.partial', {
                    updated: result.updated,
                    failed: result.failed,
                }),
            );
        } else if (result.updated > 0) {
            toast.success(
                t('metadataBackfill.toast.success', {
                    count: result.updated,
                }),
            );
        } else {
            toast.info(t('metadataBackfill.toast.allSkipped'));
        }
    } catch (err) {
        console.error('[MetadataBackfillBanner] backfill failed', err);
        toast.error(t('metadataBackfill.toast.error'));
    }
}

function PreRun({
    count,
    isRunning,
    onRun,
    onDismiss,
}: {
    count: number;
    isRunning: boolean;
    onRun: () => void;
    onDismiss: () => void;
}) {
    const { t } = useTranslation('library');
    return (
        <div className="rounded-lg border border-info/30 bg-info-subtle/50 px-4 py-3 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-info mt-0.5 shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-foreground">
                    {t('metadataBackfill.title', { count })}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {t('metadataBackfill.body')}
                </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <Button
                    type="button"
                    size="sm"
                    onClick={onRun}
                    disabled={isRunning}
                    className="text-xs gap-1.5"
                >
                    {isRunning
                        ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        : <Sparkles className="h-3 w-3" aria-hidden />}
                    {isRunning
                        ? t('metadataBackfill.running')
                        : t('metadataBackfill.cta', { count })}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onDismiss}
                    disabled={isRunning}
                    className="text-xs text-muted-foreground"
                    aria-label={t('metadataBackfill.dismiss')}
                >
                    <X className="h-3 w-3" aria-hidden />
                </Button>
            </div>
        </div>
    );
}

function PostRun({
    updated,
    needsManual,
    failed,
    onDismiss,
}: {
    updated: number;
    needsManual: number;
    failed: number;
    onDismiss: () => void;
}) {
    const { t } = useTranslation('library');
    return (
        <div className="rounded-lg border border-success/30 bg-success-subtle/40 px-4 py-2.5 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-success mt-0.5 shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-foreground">
                    {updated > 0
                        ? t('metadataBackfill.summary.updated', { count: updated })
                        : t('metadataBackfill.summary.noUpdates')}
                </p>
                {needsManual > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {failed > 0
                            ? t('metadataBackfill.summary.manualWithFailures', {
                                manual: needsManual - failed,
                                failed,
                            })
                            : t('metadataBackfill.summary.manual', { count: needsManual })}
                    </p>
                )}
            </div>
            <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-xs text-muted-foreground shrink-0"
                aria-label={t('metadataBackfill.dismiss')}
            >
                <X className="h-3 w-3" aria-hidden />
            </Button>
        </div>
    );
}
