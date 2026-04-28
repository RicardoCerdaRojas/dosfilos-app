import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

export interface AttachedSource {
    id: string;
    title: string;
    author: string;
    indexingStatus?: string;
    extractionVersion?: string;
}

interface UseProjectAttachedSourcesOptions {
    /** Owner of the resources — usually the authenticated user. */
    userId: string | null | undefined;
    /** IDs of library_resources currently attached to the project. */
    sourceIds: string[] | undefined;
}

interface UseProjectAttachedSourcesResult {
    sources: AttachedSource[];
    /** True per source while a reprocess request is in flight. */
    reprocessing: Record<string, boolean>;
    /**
     * Trigger a reprocess of one source. Two paths internally:
     *   - If the source was extracted with the legacy pipeline (extractionVersion
     *     != '3.0-llamaparse'), call `reprocessWithLlamaParse` (admin-only on
     *     server). Re-extracts with LlamaParse; the autoIndex trigger then
     *     writes chunks.
     *   - If already on LlamaParse but indexing failed/missing, call
     *     `indexStructuredDocument` with `force=true`. Owner or admin allowed.
     */
    reprocessSource: (source: AttachedSource) => Promise<void>;
}

/**
 * Loads metadata for the resources attached to a project (id, title, author,
 * indexing/extraction status) and exposes a reprocess action for each.
 *
 * Owns the Firestore + Cloud Functions calls so consumer components stay clean.
 * Refetches automatically when `sourceIds` change.
 */
export function useProjectAttachedSources({
    userId,
    sourceIds,
}: UseProjectAttachedSourcesOptions): UseProjectAttachedSourcesResult {
    const { t } = useTranslation('projects');
    const [sources, setSources] = useState<AttachedSource[]>([]);
    const [reprocessing, setReprocessing] = useState<Record<string, boolean>>({});

    const load = useCallback(async () => {
        const ids = sourceIds ?? [];
        if (!userId || ids.length === 0) {
            setSources([]);
            return;
        }
        const db = getFirestore();
        const q = query(collection(db, 'library_resources'), where('userId', '==', userId));
        const snap = await getDocs(q);
        const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
        const attached: AttachedSource[] = all
            .filter(d => ids.includes(d.id))
            .map(d => ({
                id: d.id,
                title: (d.title as string) ?? '',
                author: (d.author as string) ?? '',
                indexingStatus: d.indexingStatus as string | undefined,
                extractionVersion: d.extractionVersion as string | undefined,
            }));
        setSources(attached);
    }, [userId, sourceIds]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await load();
            if (cancelled) return;
        })();
        return () => { cancelled = true; };
    }, [load]);

    const reprocessSource = useCallback(async (source: AttachedSource) => {
        setReprocessing(prev => ({ ...prev, [source.id]: true }));
        try {
            const functions = getFunctions();
            const needsReextract = source.extractionVersion !== '3.0-llamaparse';
            if (needsReextract) {
                const fn = httpsCallable(functions, 'reprocessWithLlamaParse', { timeout: 900_000 });
                await fn({ resourceId: source.id, force: false });
                toast.success(t('reprocess.successReextracted', { title: source.title }));
            } else {
                const fn = httpsCallable(functions, 'indexStructuredDocument', { timeout: 900_000 });
                await fn({ resourceId: source.id, force: true });
                toast.success(t('reprocess.successReady', { title: source.title }));
            }
            await load();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('[useProjectAttachedSources.reprocess]', err);
            toast.error(t('reprocess.error', { title: source.title, message }));
        } finally {
            setReprocessing(prev => {
                const { [source.id]: _, ...rest } = prev;
                return rest;
            });
        }
    }, [load, t]);

    return { sources, reprocessing, reprocessSource };
}
