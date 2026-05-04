import { useCallback, useMemo, useState } from 'react';
import { libraryService } from '@dosfilos/application';
import { ResourceType, inferBibleBooksFromTitle } from '@dosfilos/domain';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { hasAcceptedUploadConsent } from '@/components/library/UploadConsentModal';
import { UploadFormMetadata } from '../components/LibraryUploadForm';

/**
 * Upload soft cap. Files above this still upload (up to the storage
 * rules' hard cap of 250MB) but the extraction pipeline takes longer
 * and quality may degrade — the warning surfaces that trade-off
 * before the user commits to a slow extraction.
 */
const MAX_OPTIMAL_SIZE_MB = 50;
/**
 * Upload hard cap. Mirrors `storage.rules` — keep these two in sync
 * (the rules cap is the authoritative gate; this constant just lets
 * us reject large files in the client before kicking off an upload
 * that's destined to 403).
 */
const MAX_UPLOAD_SIZE_MB = 250;

interface UseResourceUploadOptions {
    /** ID of the user owning the upload. Hook is no-op while null/undefined. */
    userId: string | null | undefined;
    /** Whether the user is admin — admins skip the legal consent modal. */
    isAdmin: boolean;
    /** Called when consent gate triggers — caller opens the consent modal. */
    onConsentRequired: () => void;
    /** Called after a successful upload — caller typically closes the form. */
    onSuccess?: () => void;
}

interface UseResourceUploadResult {
    file: File | null;
    fileSizeWarning: boolean;
    metadata: UploadFormMetadata;
    uploading: boolean;
    uploadProgress: number | null;
    /**
     * Live smart-match inference from the current `metadata.title`.
     * Memoized — recomputed on each title edit. Drives the inline
     * preview shown in the upload form. Persisted on submit.
     */
    smartMatchInference: ReturnType<typeof inferBibleBooksFromTitle>;
    /** File input change handler. Validates type + sets warning + autofills title. */
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    /** Patch the metadata partial. */
    setMetadata: (updates: Partial<UploadFormMetadata>) => void;
    /** Form submit handler. Checks consent, uploads, resets state on success. */
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    /** Bypass-consent variant — call after the consent modal has been accepted. */
    performUploadAfterConsent: () => Promise<void>;
}

/**
 * Encapsulates the upload form state and flow:
 * - File picker validation (PDF/EPUB) + size warning
 * - Metadata form state (title/author/category)
 * - Consent gate (one-time legal acceptance for non-admin users)
 * - Upload + progress tracking
 * - Toast notifications
 *
 * Owns NO modal state — the consent modal lives in the parent and is opened
 * via the `onConsentRequired` callback when applicable.
 */
export function useResourceUpload({
    userId,
    isAdmin,
    onConsentRequired,
    onSuccess,
}: UseResourceUploadOptions): UseResourceUploadResult {
    const { t } = useTranslation('library');
    const [file, setFile] = useState<File | null>(null);
    const [fileSizeWarning, setFileSizeWarning] = useState(false);
    const [metadata, setMetadataState] = useState<UploadFormMetadata>({
        title: '',
        author: '',
        type: 'theology',
        // Default to premium — best quality. The user opts down to
        // standard for narrative/sermon/essay content where the
        // extra structure preservation isn't needed.
        extractionMode: 'premium',
    });
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const setMetadata = useCallback((updates: Partial<UploadFormMetadata>) => {
        setMetadataState(prev => ({ ...prev, ...updates }));
    }, []);

    const reset = useCallback(() => {
        setFile(null);
        setFileSizeWarning(false);
        setMetadataState({ title: '', author: '', type: 'theology', extractionMode: 'premium' });
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        // Validate by MIME or extension fallback (browsers don't always set
        // application/epub+zip MIME for EPUBs).
        const validTypes = ['application/pdf', 'application/epub+zip'];
        if (!validTypes.includes(selected.type) && !selected.name.match(/\.(pdf|epub)$/i)) {
            toast.error(t('toast.uploadError'));
            return;
        }

        const sizeMB = selected.size / (1024 * 1024);
        // Hard cap — reject before we waste an upload that would 403
        // at the storage rules gate. Toast tells the user the limit
        // explicitly so they know the system isn't broken.
        if (sizeMB > MAX_UPLOAD_SIZE_MB) {
            toast.error(t('toast.fileTooLarge', { maxMB: MAX_UPLOAD_SIZE_MB }));
            return;
        }
        setFileSizeWarning(sizeMB > MAX_OPTIMAL_SIZE_MB);
        setFile(selected);
        // Autofill title from filename — strip extension
        setMetadataState(prev => ({
            ...prev,
            title: selected.name.replace(/\.[^/.]+$/, '') || '',
        }));
    }, [t]);

    // v1.7 smart-match inference from title. Pure function so memoizing
    // by title is sufficient — no debounce needed at this latency.
    const smartMatchInference = useMemo(
        () => inferBibleBooksFromTitle(metadata.title),
        [metadata.title],
    );

    const performUploadAfterConsent = useCallback(async () => {
        if (!userId || !file) return;
        setUploading(true);
        setUploadProgress(0);
        try {
            await libraryService.uploadResource(
                userId,
                file,
                {
                    title: metadata.title,
                    author: metadata.author,
                    type: metadata.type,
                    requestedExtractionMode: metadata.extractionMode,
                    // Persist smart-match metadata only when the inferer
                    // produced a confident result. When scope is null,
                    // omit both fields and let the legacy default
                    // ([] + 'book') trigger the "metadata incompleta"
                    // nudge in the editor (A.3).
                    ...(smartMatchInference.inferredScope !== null && {
                        coversBibleBooks: smartMatchInference.books,
                        scope: smartMatchInference.inferredScope,
                    }),
                },
                (progress) => {
                    setUploadProgress(progress);
                },
            );
            toast.success(t('toast.uploadSuccess'));
            reset();
            onSuccess?.();
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(t('toast.uploadError'));
        } finally {
            setUploading(false);
            setUploadProgress(null);
        }
    }, [userId, file, metadata, smartMatchInference, t, reset, onSuccess]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !file) return;

        // First-time consent gate for non-admin users. Admins manage curated
        // Core Library content under a separate legal framework so they skip.
        if (!isAdmin && !hasAcceptedUploadConsent()) {
            onConsentRequired();
            return;
        }
        await performUploadAfterConsent();
    }, [userId, file, isAdmin, onConsentRequired, performUploadAfterConsent]);

    return {
        file,
        fileSizeWarning,
        metadata,
        uploading,
        uploadProgress,
        smartMatchInference,
        handleFileChange,
        setMetadata,
        handleSubmit,
        performUploadAfterConsent,
    };
}
