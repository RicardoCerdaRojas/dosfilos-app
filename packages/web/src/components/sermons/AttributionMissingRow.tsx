import { useTranslation } from 'react-i18next';
import { FileWarning } from 'lucide-react';
import type { MissingAttribution } from '@dosfilos/domain';

interface AttributionMissingRowProps {
    missing: MissingAttribution;
}

/**
 * Pastoral Fidelity — Phase 3 PR 5. One row in the FidelityReviewPanel's
 * attribution section: a source whose licence requires attribution but whose
 * manifest entry carries no attribution lines, so the export would silently
 * omit a legally-required notice. Read-only flag — the fix lives in the
 * library resource, not the sermon.
 */
export function AttributionMissingRow({ missing }: AttributionMissingRowProps) {
    const { t } = useTranslation('sermonDetail');
    return (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-subtle px-3 py-2">
            <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-subtle-foreground" />
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{missing.title}</p>
                <p className="text-xs text-muted-foreground">
                    {t('fidelityGate.attribution.missingLabel')}
                    {' · '}
                    {missing.license ?? t('fidelityGate.attribution.unknownLicense')}
                </p>
            </div>
        </div>
    );
}
