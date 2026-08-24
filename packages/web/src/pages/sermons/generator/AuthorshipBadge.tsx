import { useTranslation } from 'react-i18next';
import { PenLine } from 'lucide-react';
import type { AuthorshipReport } from '@dosfilos/domain';
import { cn } from '@/lib/utils';

interface Props {
    report: AuthorshipReport;
}

/**
 * Cuánto del sermón lo escribió el pastor.
 *
 * MIDE LO QUE ES SUYO, no lo que quedó intacto de la máquina (decisión del
 * fundador, 2026-08-24). Es el mismo dato con la lectura invertida, pero un
 * número que CRECE cuando el pastor trabaja menos se lee como acusación; éste
 * premia su trabajo.
 *
 * SIN NÚMEROS DE CASTIGO NI RACHAS. El badge informa y, cuando cae bajo el
 * piso, invita — no regaña. Mismo trato que el `StudyDepthBadge` de Fase 2.5.
 */
export function AuthorshipBadge({ report }: Props) {
    const { t } = useTranslation('generator');
    const pct = Math.round(report.overall * 100);
    const bajo = report.gateStatus === 'confront';
    // Una sección sin referencia cuenta como del pastor, pero no fue MEDIDA.
    // Decirlo evita que un 100% se lea como un logro que nadie verificó.
    const sinReferencia = report.bySection.some((s) => s.withoutBaseline);

    return (
        <div
            className={cn(
                // UNA SOLA LÍNEA, SIN ENVOLVER. La primera versión decía
                // "Autoría: 100% tuyo · parcial" y en la cabecera del borrador
                // —que ya carga el pasaje y el botón de regenerar— se partía en
                // tres renglones y empujaba el título a dos líneas. Un indicador
                // que descuadra la pantalla donde vive no informa: estorba.
                //
                // La palabra "Autoría" y el desglose se mueven al tooltip; el
                // badge conserva sólo el número, que es lo que se lee de un
                // vistazo.
                'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-xs',
                bajo ? 'border-warning/40 bg-warning/10 text-warning' : 'border-border bg-muted/40 text-muted-foreground',
            )}
            title={[
                t('authorship.tooltip', { pct }),
                ...report.bySection.map(
                    (s) => `${t(`authorship.section.${s.sectionId}`)}: ${Math.round(s.pastorRatio * 100)}%`,
                ),
                ...(sinReferencia ? [t('authorship.partialHint')] : []),
            ].join('\n')}
        >
            <PenLine className="h-3 w-3 shrink-0" />
            <span className="font-medium tabular-nums">{t('authorship.badge', { pct })}</span>
            {/* El asterisco marca que alguna sección no tiene referencia: un
                100% sin medir no es lo mismo que un 100% medido. La explicación
                va en el tooltip, no en la barra. */}
            {sinReferencia && <span className="opacity-60">*</span>}
        </div>
    );
}
