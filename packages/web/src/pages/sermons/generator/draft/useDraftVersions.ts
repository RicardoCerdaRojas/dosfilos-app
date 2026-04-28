import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

interface UseDraftVersionsParams {
    draft: any;
    setDraft: (d: any) => void;
    contentHistory: any;
    setModifiedSections: React.Dispatch<React.SetStateAction<Set<string>>>;
}

interface UseDraftVersionsResult {
    handleUndo: (sectionId: string) => Promise<void>;
    handleRedo: (sectionId: string) => Promise<void>;
    handleRestoreVersion: (sectionId: string, versionId: string) => Promise<void>;
    handleSectionUpdate: (sectionId: string, newContent: any) => Promise<void>;
}

/**
 * Wraps the version-control / manual-edit handlers used by the sermon draft
 * canvas. Same shape as `useHomileticsVersions` but writes to `draft`.
 */
export function useDraftVersions({
    draft,
    setDraft,
    contentHistory,
    setModifiedSections,
}: UseDraftVersionsParams): UseDraftVersionsResult {
    const { t } = useTranslation('generator');

    const applySectionContent = async (sectionId: string, content: any, successKey: string): Promise<void> => {
        if (!draft) return;
        const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
        const { setValueByPath } = await import('@/utils/path-utils');
        const sectionConfig = getSectionConfig('sermon', sectionId);
        if (!sectionConfig) return;
        const updated = JSON.parse(JSON.stringify(draft));
        setValueByPath(updated, sectionConfig.path, content);
        setDraft(updated);
        toast.success(t(successKey));
    };

    const handleUndo = async (sectionId: string) => {
        const previousVersion = contentHistory.undo(sectionId);
        if (previousVersion) {
            await applySectionContent(sectionId, previousVersion.content, 'drafting.success.undo');
        }
    };

    const handleRedo = async (sectionId: string) => {
        const nextVersion = contentHistory.redo(sectionId);
        if (nextVersion) {
            await applySectionContent(sectionId, nextVersion.content, 'drafting.success.redo');
        }
    };

    const handleRestoreVersion = async (sectionId: string, versionId: string) => {
        const version = contentHistory.goToVersion(sectionId, versionId);
        if (version) {
            await applySectionContent(sectionId, version.content, 'drafting.success.restored');
        }
    };

    const handleSectionUpdate = async (sectionId: string, newContent: any) => {
        if (!draft) return;

        try {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath, getValueByPath } = await import('@/utils/path-utils');

            const sectionConfig = getSectionConfig('sermon', sectionId);
            if (!sectionConfig) return;

            const currentContent = getValueByPath(draft, sectionConfig.path);

            contentHistory.saveVersion(
                sectionId,
                currentContent,
                t('drafting.versions.beforeManualEdit'),
                undefined,
            );

            const updated = JSON.parse(JSON.stringify(draft));
            setValueByPath(updated, sectionConfig.path, newContent);
            setDraft(updated);
            setModifiedSections((prev) => new Set(prev).add(sectionId));

            contentHistory.saveVersion(
                sectionId,
                newContent,
                t('drafting.versions.manualEdit'),
                t('drafting.versions.manualEditSummary'),
            );

            toast.success(t('drafting.success.updated'));
        } catch (error) {
            console.error('Error updating section:', error);
            toast.error(t('drafting.errors.updating'));
        }
    };

    return { handleUndo, handleRedo, handleRestoreVersion, handleSectionUpdate };
}
