import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { GreekWordInsight } from '@dosfilos/domain';

interface Props {
    composition: NonNullable<GreekWordInsight['composition']>;
    compact?: boolean;
}

/**
 * Una palabra COMPUESTA, descompuesta — con la advertencia cuando el uso se
 * alejó de las partes.
 *
 * La falacia de la raíz (suponer que el sentido de un compuesto ES la suma
 * de sus partes) es el error exegético más común, y una herramienta que
 * muestra etimologías sin advertirlo INVITA a cometerlo. Cuando el análisis
 * dice que el uso ya no corresponde, esto se ve — no queda escondido en la
 * prosa.
 */
export function GreekCompositionBlock({ composition, compact }: Props) {
    const { t } = useTranslation('greekTutor');
    const { parts, note, meaningMatchesParts } = composition;

    return (
        <div className="rounded-md border border-border bg-muted/40 p-2.5 space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('analyzer.composition.title')}
            </h4>

            <p className={compact ? 'text-xs' : 'text-sm'}>
                {parts.map((p, i) => (
                    <span key={i}>
                        {i > 0 && <span className="text-muted-foreground"> + </span>}
                        <span className="font-medium" lang="grc">{p.text}</span>
                        <span className="text-muted-foreground"> ({p.gloss})</span>
                    </span>
                ))}
            </p>

            <p className="text-xs leading-relaxed">{note}</p>

            {!meaningMatchesParts && (
                <p className="flex items-start gap-1.5 rounded bg-warning/10 p-2 text-xs text-warning">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{t('analyzer.composition.rootFallacy')}</span>
                </p>
            )}
        </div>
    );
}
