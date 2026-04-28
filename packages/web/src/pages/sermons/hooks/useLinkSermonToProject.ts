import { useState } from 'react';
import { toast } from 'sonner';
import { sermonService } from '@dosfilos/application';
import { useTranslation } from '@/i18n';

interface UseLinkSermonToProjectResult {
    /** Sermon id currently being linked (driving the dialog open state). */
    sermonToLink: string | null;
    setSermonToLink: (id: string | null) => void;
    /** Sermon id whose request is in flight (used to disable rows). */
    linking: string | null;
    /** Persists the link / unlink operation. */
    linkToProject: (projectId: string | null) => Promise<void>;
}

/**
 * Wraps the link-sermon-to-project flow used by the sermons list. Centralises
 * toast feedback and ensures UI components don't import Firestore directly.
 */
export function useLinkSermonToProject(onSuccess: () => void | Promise<void>): UseLinkSermonToProjectResult {
    const { t } = useTranslation('sermons');
    const [sermonToLink, setSermonToLink] = useState<string | null>(null);
    const [linking, setLinking] = useState<string | null>(null);

    const linkToProject = async (projectId: string | null) => {
        if (!sermonToLink) return;
        setLinking(sermonToLink);
        try {
            await sermonService.linkSermonToProject(sermonToLink, projectId);
            toast.success(projectId ? t('linkProject.linkSuccess') : t('linkProject.unlinkSuccess'));
            setSermonToLink(null);
            await onSuccess();
        } catch (err: any) {
            console.error('[useLinkSermonToProject] error:', err);
            toast.error(err?.message ?? t('linkProject.error'));
        } finally {
            setLinking(null);
        }
    };

    return { sermonToLink, setSermonToLink, linking, linkToProject };
}
