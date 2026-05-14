import { useEffect, useState } from 'react';
import { type Extraction } from '@dosfilos/domain';

interface UpdateMarkdownMutation {
    mutate: (vars: { extractionId: string; markdown: string }) => void;
}

interface UseDocumentEditorParams {
    /**
     * Live list of persisted extractions used by the autosave effect
     * to skip writes when the current draft matches the canonical
     * Firestore version (avoids loops with the read-back from the
     * mutation's invalidate).
     */
    extractions: Extraction[];
    updateExtractionMarkdown: UpdateMarkdownMutation;
    /**
     * Fired the first time a document opens so the page can reclaim
     * horizontal space (collapse both side rails). Caller decides
     * what "collapse" means — the hook doesn't own sidebar state.
     */
    onOpen?: () => void;
}

/**
 * State + autosave for the unified document editor panel. Two
 * mutually-exclusive sources:
 *
 *   - `extraction` — a persisted artifact from the Generados tab.
 *     Autosaves markdown changes back to Firestore (debounced 1.5s).
 *   - `sermon` — an in-memory preview from the sermon wizard. The
 *     sermons module owns its own collection; this hook just renders
 *     the markdown the modal returned. No autosave.
 *
 * Hoisted out of chat.tsx because the editor concerns (state, open/
 * close, zen toggle, autosave) are independent of chat state and
 * were cluttering the page-level component.
 */
export function useDocumentEditor(params: UseDocumentEditorParams) {
    const { extractions, updateExtractionMarkdown, onOpen } = params;

    const [documentSource, setDocumentSource] = useState<'sermon' | 'extraction' | null>(null);
    const [documentExtractionId, setDocumentExtractionId] = useState<string | null>(null);
    const [documentTitle, setDocumentTitle] = useState<string>('');
    const [documentMarkdown, setDocumentMarkdown] = useState<string>('');
    const [isZenMode, setIsZenMode] = useState(false);

    const isDocumentOpen = documentSource !== null;

    const openExtractionInEditor = (extraction: Extraction) => {
        setDocumentSource('extraction');
        setDocumentExtractionId(extraction.id);
        setDocumentTitle(extraction.title);
        setDocumentMarkdown(extraction.markdown);
        onOpen?.();
    };

    /**
     * Opens the in-memory sermon preview (no externalRef on this
     * path — the sermon Extraction is persisted by the modal's
     * onSuccess hook separately). Pass the markdown the wizard
     * returned plus the title to render in the editor toolbar.
     */
    const openSermonPreview = (title: string, markdown: string) => {
        setDocumentSource('sermon');
        setDocumentExtractionId(null);
        setDocumentTitle(title);
        setDocumentMarkdown(markdown);
        onOpen?.();
    };

    const closeDocument = () => {
        setDocumentSource(null);
        setDocumentExtractionId(null);
        setDocumentTitle('');
        setDocumentMarkdown('');
        setIsZenMode(false);
    };

    // Debounced autosave for in-editor edits on a persisted Extraction.
    // The editor calls onChange on every keystroke; we batch saves to
    // Firestore every 1.5s of idle to avoid hammering the write quota.
    useEffect(() => {
        if (documentSource !== 'extraction' || !documentExtractionId) return;
        const current = extractions.find(e => e.id === documentExtractionId);
        if (!current || current.markdown === documentMarkdown) return;
        const handle = setTimeout(() => {
            updateExtractionMarkdown.mutate({
                extractionId: documentExtractionId,
                markdown: documentMarkdown,
            });
        }, 1500);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentMarkdown, documentSource, documentExtractionId]);

    return {
        documentSource,
        documentExtractionId,
        documentTitle,
        documentMarkdown,
        isDocumentOpen,
        isZenMode,
        setDocumentTitle,
        setDocumentMarkdown,
        setIsZenMode,
        openExtractionInEditor,
        openSermonPreview,
        closeDocument,
    };
}
