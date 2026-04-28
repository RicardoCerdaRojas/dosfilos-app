import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface HomileticsLoadingScreenProps {
    /** Which generation phase is currently running. */
    phase: 1 | 2;
}

/**
 * Reused for the two homiletics generation phases:
 *  - phase 1: generating approach previews
 *  - phase 2: developing the selected approach
 */
export const HomileticsLoadingScreen: React.FC<HomileticsLoadingScreenProps> = ({ phase }) => {
    const { t } = useTranslation('generator');
    const titleKey = phase === 1 ? 'homiletics.phase1Loading' : 'homiletics.phase2Loading';
    const subKey = phase === 1 ? 'homiletics.phase1Sub' : 'homiletics.phase2Sub';

    return (
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="text-lg font-medium">{t(titleKey)}</p>
                <p className="text-sm text-muted-foreground">{t(subKey)}</p>
            </div>
        </div>
    );
};

interface HomileticsSavedIndicatorProps {
    visible: boolean;
}

/**
 * Floating "Saved" pill shown after autosave finishes. Uses semantic success token.
 */
export const HomileticsSavedIndicator: React.FC<HomileticsSavedIndicatorProps> = ({ visible }) => {
    const { t } = useTranslation('generator');
    if (!visible) return null;
    return (
        <div className="fixed top-4 right-4 flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-50">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm text-muted-foreground">{t('homiletics.saved')}</span>
        </div>
    );
};
