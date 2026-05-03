import { useCallback, useState } from 'react';
import { libraryService } from '@dosfilos/application';
import { ResourceType } from '@dosfilos/domain';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { hasAcceptedUploadConsent } from '@/components/library/UploadConsentModal';
import { UploadFormMetadata } from '../components/LibraryUploadForm';

/** Upload soft cap. Larger PDFs still upload but extraction quality degrades. */
const MAX_OPTIMAL_SIZE_MB = 50;

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
        setFileSizeWarning(sizeMB > MAX_OPTIMAL_SIZE_MB);
        setFile(selected);
        // Autofill title from filename — strip extension
        setMetadataState(prev => ({
            ...prev,
            title: selected.name.replace(/\.[^/.]+$/, '') || '',
        }));
    }, [t]);

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
    }, [userId, file, metadata, t, reset, onSuccess]);

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
        handleFileChange,
        setMetadata,
        handleSubmit,
        performUploadAfterConsent,
    };
}
