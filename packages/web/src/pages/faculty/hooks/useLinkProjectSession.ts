import { useCallback, useState } from 'react';
import { doc, getFirestore, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

export type SessionDomain = 'greek' | 'hebrew';

interface UseLinkProjectSessionOptions {
    /** Project to link sessions to. Hook is a no-op if null. */
    projectId: string | null | undefined;
    /** Which domain — drives the Firestore collection + react-query cache key. */
    domain: SessionDomain;
}

interface UseLinkProjectSessionResult {
    /** Session ID currently being linked (or null). Used to disable the row. */
    linkingId: string | null;
    /** Link a session to the project. Toasts success/error and invalidates cache. */
    link: (sessionId: string) => Promise<void>;
}

const DOMAIN_CONFIG: Record<SessionDomain, { collection: string; queryKey: [string, string] }> = {
    greek: { collection: 'greek_sessions', queryKey: ['greek', 'sessions'] },
    hebrew: { collection: 'hebrew_user_sessions', queryKey: ['hebrew', 'sessions'] },
};

/**
 * Encapsulates the "link an existing tutor session to this project" flow for
 * Greek and Hebrew domains. They share the same shape (Firestore doc update
 * + react-query cache invalidation) so we expose one hook keyed by `domain`.
 *
 * Caller component decides when to close its modal — hook just performs the
 * mutation and reports state via `linkingId`.
 */
export function useLinkProjectSession({
    projectId,
    domain,
}: UseLinkProjectSessionOptions): UseLinkProjectSessionResult {
    const { t } = useTranslation('projects');
    const queryClient = useQueryClient();
    const [linkingId, setLinkingId] = useState<string | null>(null);
    const config = DOMAIN_CONFIG[domain];

    const link = useCallback(async (sessionId: string) => {
        if (!projectId) return;
        setLinkingId(sessionId);
        try {
            const db = getFirestore();
            await updateDoc(doc(db, config.collection, sessionId), {
                projectId,
                updatedAt: serverTimestamp(),
            });
            await queryClient.invalidateQueries({ queryKey: config.queryKey });
            toast.success(t('linkSession.toastSuccess'));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[useLinkProjectSession.${domain}]`, err);
            toast.error(`${t('linkSession.toastError')}: ${message}`);
        } finally {
            setLinkingId(null);
        }
    }, [projectId, domain, config, queryClient, t]);

    return { linkingId, link };
}
