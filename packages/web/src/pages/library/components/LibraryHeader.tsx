import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Library, Plus, X } from 'lucide-react';

interface LibraryHeaderProps {
    /** Total resources count. */
    totalCount: number;
    /** Resources with extraction + indexing complete. */
    readyCount: number;
    /** Resources awaiting processing. */
    pendingCount: number;
    /** Whether the upload form is currently open. Controls the CTA label/icon. */
    isUploadFormOpen: boolean;
    /** Toggle the upload form open/closed. */
    onToggleUploadForm: () => void;
}

/**
 * Library page editorial header — breadcrumb category, page title, meta line
 * with counts (total / ready / pending), and the primary CTA to add a resource.
 *
 * Pure presentational component: receives counts + a single toggle callback.
 * No side effects, no data fetching.
 */
export function LibraryHeader({
    totalCount,
    readyCount,
    pendingCount,
    isUploadFormOpen,
    onToggleUploadForm,
}: LibraryHeaderProps) {
    const { t } = useTranslation('library');

    return (
        <div className="pb-3 border-b border-border/60 space-y-1">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] font-medium">
                <span className="inline-flex items-center gap-1.5 text-primary">
                    <Library className="h-3 w-3" />
                    <span>{t('header.category')}</span>
                </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-3">
                    <h1 className="font-reading text-[24px] md:text-[28px] leading-tight tracking-[-0.01em] text-foreground">
                        {t('header.title')}
                    </h1>
                    <p className="text-[13px] leading-snug text-muted-foreground">
                        {t('header.metaCount', { count: totalCount })}
                        {readyCount > 0 && <> · {t('header.metaReady', { count: readyCount })}</>}
                        {pendingCount > 0 && (
                            <>
                                {' · '}
                                <span className="text-warning-subtle-foreground font-medium">
                                    {t('header.metaPending', { count: pendingCount })}
                                </span>
                            </>
                        )}
                    </p>
                </div>
                <Button onClick={onToggleUploadForm} className="gap-2 shrink-0">
                    {isUploadFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isUploadFormOpen ? t('header.closeButton') : t('header.addButton')}
                </Button>
            </div>
        </div>
    );
}
