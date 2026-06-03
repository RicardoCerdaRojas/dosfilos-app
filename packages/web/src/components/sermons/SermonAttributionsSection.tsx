import { useTranslation } from 'react-i18next';
import { Scale } from 'lucide-react';
import { aggregateRequiredAttributions, type CitationManifest } from '@dosfilos/domain';

interface SermonAttributionsSectionProps {
    /**
     * Phase B citation manifest. The mandatory attribution blocks
     * (CC BY / CC BY-SA compliance) are computed from it. Absent or
     * attribution-free manifests render nothing.
     */
    manifest?: CitationManifest;
    /** Optional className for the wrapping <section>. */
    className?: string;
}

/**
 * Pastoral Fidelity — Phase 3 PR 5 (ADR-006 / ADR-029 §Q7).
 *
 * Renders the mandatory "Atribuciones" footer in the published web view of a
 * sermon — the on-screen counterpart to the PDF/Docx attribution sections so
 * the licence compliance shows on every surface (Q7). The blocks come from
 * `aggregateRequiredAttributions`, the single source of truth shared with the
 * export pipeline, so the on-screen and exported notices never drift.
 *
 * Returns `null` when there are no attribution blocks so callers can drop it
 * in unconditionally — sermons without licence-bound sources render nothing.
 */
export function SermonAttributionsSection({ manifest, className }: SermonAttributionsSectionProps) {
    const { t } = useTranslation('sermonDetail');
    const blocks = aggregateRequiredAttributions(manifest);
    if (blocks.length === 0) return null;

    return (
        <section
            className={[
                'mt-12 pt-6 border-t border-border/60',
                'space-y-3',
                className ?? '',
            ].filter(Boolean).join(' ')}
            aria-label={t('attributions.title')}
        >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Scale className="h-4 w-4 text-primary" />
                {t('attributions.title')}
            </h2>
            <p className="text-xs text-muted-foreground">
                {t('attributions.description')}
            </p>
            <div className="space-y-4">
                {blocks.map((block) => (
                    <div key={block.sourceId} className="text-sm leading-relaxed">
                        <p className="font-medium text-foreground">{block.title}</p>
                        <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                            {block.lines.map((line, idx) => (
                                <p key={idx}>{line}</p>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
