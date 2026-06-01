import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { SubstantiveClaim } from '@dosfilos/domain';
import { useCrossReferences } from '@/hooks/useCrossReferences';
import { Button } from '@/components/ui/button';

interface Props {
    claim: SubstantiveClaim;
}

/**
 * Phase 3 PR 3 (ADR-029 §Q4) — one proof-texting failure: a substantive
 * core/distinctive claim grounded on a single biblical passage. Offers the
 * "Añadir paralelo canónico" CTA that proposes cross-references for the
 * claim's passage (reuses the Phase 0 cross-ref engine via
 * `useCrossReferences`). The pastor reads the proposals and adds the
 * parallel to the sermon manually — PR 3 does not auto-insert.
 */
export function PluralityFailureRow({ claim }: Props) {
    const { t } = useTranslation('sermonDetail');
    const [showParallels, setShowParallels] = useState(false);
    const primaryPassage = claim.biblicalSources[0]?.label ?? '';
    const levelLabel = t(`fidelityGate.plurality.level.${claim.detectedLevel}`);

    return (
        <div className="rounded-md border border-warning/30 bg-warning-subtle p-3 text-xs">
            <p className="text-warning-subtle-foreground">{claim.claimText}</p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-warning/20 px-2 py-0.5 text-warning-subtle-foreground">
                    {levelLabel}
                </span>
                {claim.biblicalSources.length > 0 ? (
                    <span className="text-muted-foreground">
                        {t('fidelityGate.plurality.groundedOn')}{' '}
                        {claim.biblicalSources.map((s) => s.label).join(', ')}
                    </span>
                ) : (
                    <span className="text-muted-foreground">
                        {t('fidelityGate.plurality.noPassage')}
                    </span>
                )}
            </div>

            {primaryPassage && (
                <>
                    <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7"
                        onClick={() => setShowParallels((v) => !v)}
                    >
                        {showParallels ? (
                            <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                        ) : (
                            <ChevronRight className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        <Link2 className="mr-1.5 h-3.5 w-3.5" />
                        {showParallels
                            ? t('fidelityGate.plurality.hideParallel')
                            : t('fidelityGate.plurality.addParallel')}
                    </Button>
                    {showParallels && <CrossRefSuggestions passage={primaryPassage} />}
                </>
            )}
        </div>
    );
}

/** Lazy-mounted so the cross-ref callable only fires when the row expands. */
function CrossRefSuggestions({ passage }: { passage: string }) {
    const { t } = useTranslation('sermonDetail');
    const { parallels, loading } = useCrossReferences(passage);

    if (loading) {
        return (
            <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('fidelityGate.plurality.loadingParallels')}
            </p>
        );
    }
    if (parallels.length === 0) {
        return (
            <p className="mt-2 text-muted-foreground">
                {t('fidelityGate.plurality.noParallels', { passage })}
            </p>
        );
    }
    return (
        <div className="mt-2 space-y-1">
            <p className="text-muted-foreground">
                {t('fidelityGate.plurality.parallelsHint', { passage })}
            </p>
            <div className="flex flex-wrap gap-1.5">
                {parallels.slice(0, 8).map((p) => (
                    <span
                        key={`${p.book}-${p.chapter}-${p.verse}`}
                        className="rounded-full border border-border bg-card px-2 py-0.5 text-card-foreground"
                    >
                        {p.book} {p.chapter}:{p.verse}
                    </span>
                ))}
            </div>
        </div>
    );
}
