import { Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { GreekVerseTokens, RhetoricalStructure } from '@dosfilos/domain';

interface Props {
    rhetoric: RhetoricalStructure;
    tokens: GreekVerseTokens['tokens'];
}

/**
 * La estructura retórica del versículo — COMO PROPUESTA, no como dato.
 *
 * A diferencia de la morfología (dataset revisado) esto es interpretación, y
 * el quiasmo es el hallazgo más sobre-diagnosticado de los estudios bíblicos.
 * El rótulo lo dice en pantalla: el pastor y su profesor juzgan. Las
 * salvaguardas estructurales viven en el dominio; ésta es la honestidad
 * visible.
 */
export function GreekRhetoricBlock({ rhetoric, tokens }: Props) {
    const { t } = useTranslation('greekTutor');

    return (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Network className="h-3.5 w-3.5" />
                    {t(`analyzer.rhetoric.${rhetoric.type}`)}
                </h4>
                {/* NO ES UN DATO, ES UNA LECTURA. */}
                <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] leading-none text-warning">
                    {t('analyzer.rhetoric.proposalBadge')}
                </span>
            </div>

            <div className="space-y-1.5">
                {rhetoric.elements.map((el, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                        <span className="w-7 shrink-0 font-semibold text-info">{el.label}</span>
                        <span className="shrink-0" lang="grc">
                            {el.wordIndices.map((idx) => tokens[idx]?.text).filter(Boolean).join(' ')}
                        </span>
                        <span className="text-muted-foreground">— {el.note}</span>
                    </div>
                ))}
            </div>

            <p className="text-sm leading-relaxed border-t border-border/60 pt-2">{rhetoric.note}</p>
            <p className="text-[11px] text-muted-foreground">{t('analyzer.rhetoric.disclaimer')}</p>
        </div>
    );
}
