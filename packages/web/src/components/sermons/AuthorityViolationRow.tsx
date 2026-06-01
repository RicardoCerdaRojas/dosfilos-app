import { useTranslation } from 'react-i18next';
import { Scale, ArrowRight } from 'lucide-react';
import type { AuthorityViolation } from '@dosfilos/domain';

interface Props {
    violation: AuthorityViolation;
}

/**
 * Phase 3 PR 4 — one authority-subordination finding: a claim that leans on a
 * confession/creed/theologian as the FINAL authority instead of the text. Shows
 * the offending sentence, the authority it leaned on, and a suggested
 * reformulation that grounds the same claim in the text. Display-only — the
 * pastor applies the rewrite in the editor (inline click-to-replace is a future
 * editor-integration follow-up).
 */
export function AuthorityViolationRow({ violation }: Props) {
    const { t } = useTranslation('sermonDetail');
    return (
        <div className="rounded-md border border-warning/30 bg-warning-subtle p-3 text-xs">
            <p className="text-warning-subtle-foreground">{violation.claim}</p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-warning-subtle-foreground">
                    <Scale className="h-3 w-3" />
                    {violation.citedAuthority || t('fidelityGate.authority.unnamedAuthority')}
                </span>
                {violation.reasoning && (
                    <span className="text-muted-foreground">{violation.reasoning}</span>
                )}
            </div>

            {violation.reformulationHint && (
                <div className="mt-2 flex items-start gap-1.5 rounded border border-border bg-card p-2 text-card-foreground">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                        <p className="mb-0.5 font-medium text-muted-foreground">
                            {t('fidelityGate.authority.reformulation')}
                        </p>
                        <p>{violation.reformulationHint}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
