import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import {
    adminCrossReferenceService,
    type CrossReferenceDocPayload,
    type LookupSingleVerseArgs,
    type LookupRangeArgs,
} from '@dosfilos/application';

/**
 * Hooks for the admin cross-reference tester. Three mutations:
 *   - `ingest()` triggers the bundled sample seed import.
 *   - `lookupVerse()` resolves a single `(book, chapter, verse)`.
 *   - `lookupRange()` resolves a pericope (`startVerse..endVerse`).
 *
 * Lookup state is held locally so the tester can swap between calls
 * without rehydrating from Firestore — UI shows the most recent result.
 */
export function useCrossReferences() {
    const [isLoading, setIsLoading] = useState(false);
    const [lookupResult, setLookupResult] = useState<CrossReferenceDocPayload[] | null>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const { t } = useTranslation('admin');

    const ingest = async (): Promise<boolean> => {
        setIsLoading(true);
        try {
            const { written, source } = await adminCrossReferenceService.ingest();
            toast.success(t('crossRefs.toasts.ingestSuccess', { written, source }));
            return true;
        } catch (error: any) {
            console.error('Error ingesting cross-references:', error);
            toast.error(error.message || t('crossRefs.toasts.ingestError'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const lookupVerse = async (args: LookupSingleVerseArgs): Promise<void> => {
        setIsLoading(true);
        setLookupError(null);
        try {
            const { doc } = await adminCrossReferenceService.lookupVerse(args);
            setLookupResult(doc ? [doc] : []);
        } catch (error: any) {
            setLookupError(error.message ?? 'lookup failed');
            setLookupResult(null);
        } finally {
            setIsLoading(false);
        }
    };

    const lookupRange = async (args: LookupRangeArgs): Promise<void> => {
        setIsLoading(true);
        setLookupError(null);
        try {
            const { docs } = await adminCrossReferenceService.lookupRange(args);
            setLookupResult(docs);
        } catch (error: any) {
            setLookupError(error.message ?? 'lookup failed');
            setLookupResult(null);
        } finally {
            setIsLoading(false);
        }
    };

    return { ingest, lookupVerse, lookupRange, isLoading, lookupResult, lookupError };
}
