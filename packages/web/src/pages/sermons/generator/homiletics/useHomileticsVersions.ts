import { toast } from 'sonner';
import type { HomileticalAnalysis } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';

interface UseHomileticsVersionsParams {
    homiletics: HomileticalAnalysis | null;
    setHomiletics: (h: HomileticalAnalysis) => void;
    contentHistory: any;
    setModifiedSections: React.Dispatch<React.SetStateAction<Set<string>>>;
}

interface UseHomileticsVersionsResult {
    handleUndo: (sectionId: string) => Promise<void>;
    handleRedo: (sectionId: string) => Promise<void>;
    handleRestoreVersion: (sectionId: string, versionId: string) => Promise<void>;
    handleSectionUpdate: (sectionId: string, newContent: any) => Promise<void>;
}

/**
 * Wraps the version-control / manual-edit handlers used by the homiletics
 * canvas. Keeps the main component focused on layout, not state plumbing.
 */
export function useHomileticsVersions({
    homiletics,
    setHomiletics,
    contentHistory,
    setModifiedSections,
}: UseHomileticsVersionsParams): UseHomileticsVersionsResult {
    const { t } = useTranslation('generator');

    const applySectionContent = async (
        sectionId: string,
        content: any,
        successKey: string,
    ): Promise<void> => {
        if (!homiletics) return;
        const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
        const { setValueByPath } = await import('@/utils/path-utils');
        const sectionConfig = getSectionConfig('homiletics', sectionId);
        if (!sectionConfig) return;
        const updated = JSON.parse(JSON.stringify(homiletics));
        setValueByPath(updated, sectionConfig.path, content);
        setHomiletics(updated);
        toast.success(t(successKey));
    };

    const handleUndo = async (sectionId: string) => {
        const previousVersion = contentHistory.undo(sectionId);
        if (previousVersion) {
            await applySectionContent(sectionId, previousVersion.content, 'homiletics.success.undo');
        }
    };

    const handleRedo = async (sectionId: string) => {
        const nextVersion = contentHistory.redo(sectionId);
        if (nextVersion) {
            await applySectionContent(sectionId, nextVersion.content, 'homiletics.success.redo');
        }
    };

    const handleRestoreVersion = async (sectionId: string, versionId: string) => {
        const version = contentHistory.goToVersion(sectionId, versionId);
        if (version) {
            await applySectionContent(sectionId, version.content, 'homiletics.success.restored');
        }
    };

    const handleSectionUpdate = async (sectionId: string, newContent: any) => {
        if (!homiletics) return;

        try {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath, getValueByPath } = await import('@/utils/path-utils');

            const sectionConfig = getSectionConfig('homiletics', sectionId);
            if (!sectionConfig) return;

            if (sectionConfig.readonly) {
                toast.error(t('homiletics.errors.readonlySection'));
                return;
            }

            const currentContent = getValueByPath(homiletics, sectionConfig.path);

            contentHistory.saveVersion(
                sectionId,
                currentContent,
                t('homiletics.versions.beforeManualEdit'),
                undefined,
            );

            const updated = JSON.parse(JSON.stringify(homiletics));
            setValueByPath(updated, sectionConfig.path, newContent);
            setHomiletics(updated);
            setModifiedSections(prev => new Set(prev).add(sectionId));

            contentHistory.saveVersion(
                sectionId,
                newContent,
                t('homiletics.versions.manualEdit'),
                t('homiletics.versions.manualEditSummary'),
            );

            toast.success(t('homiletics.success.updated'));
        } catch (error) {
            console.error('Error updating section:', error);
            toast.error(t('homiletics.errors.update'));
        }
    };

    return { handleUndo, handleRedo, handleRestoreVersion, handleSectionUpdate };
}
