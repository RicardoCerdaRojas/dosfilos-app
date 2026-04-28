import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Book, Plus } from 'lucide-react';

interface LibraryEmptyStateProps {
    /**
     * Whether the user's library is truly empty (zero resources) vs filtered to
     * zero (resources exist but the search/filter excluded them all).
     */
    isLibraryEmpty: boolean;
    /** Whether the upload form is already open (hides the CTA to avoid duplication). */
    isUploadFormOpen: boolean;
    /** Triggered when the user clicks "Add first resource" CTA. */
    onAddFirstResource: () => void;
}

/**
 * Empty-state placeholder for the resource list.
 *
 * - When the library is genuinely empty, encourages the user to upload their
 *   first PDF/EPUB with a primary CTA.
 * - When filters/search exclude all results, suggests adjusting the criteria
 *   instead (no CTA).
 */
export function LibraryEmptyState({
    isLibraryEmpty,
    isUploadFormOpen,
    onAddFirstResource,
}: LibraryEmptyStateProps) {
    const { t } = useTranslation('library');

    return (
        <div className="bg-card border border-border/60 rounded-xl py-16 px-6 text-center">
            <div className="h-14 w-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <Book className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <h3 className="font-reading text-[17px] leading-tight text-foreground mb-1">
                {isLibraryEmpty ? t('empty.titleEmpty') : t('empty.titleNoResults')}
            </h3>
            <p className="text-[13px] text-muted-foreground mb-4 max-w-md mx-auto">
                {isLibraryEmpty ? t('empty.descriptionEmpty') : t('empty.descriptionNoResults')}
            </p>
            {isLibraryEmpty && !isUploadFormOpen && (
                <Button onClick={onAddFirstResource} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('empty.ctaFirstResource')}
                </Button>
            )}
        </div>
    );
}
