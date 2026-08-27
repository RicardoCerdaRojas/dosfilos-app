import { GitBranch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { GreekWordInsight } from '@dosfilos/domain';

interface Props {
    insight: GreekWordInsight;
}

/**
 * Qué hace una partícula en el ARGUMENTO, no sólo qué significa.
 *
 * δέ aparece 2.766 veces en el NT y recibía una línea genérica. Son las
 * palabras que ARTICULAN el razonamiento: quien las lee bien sigue el
 * argumento del autor; quien las ignora predica versículos sueltos.
 */
export function GreekParticleBlock({ insight }: Props) {
    const { t } = useTranslation('greekTutor');
    if (!insight.discourseFunction) return null;

    return (
        <div className="rounded-md border border-success/30 bg-success/5 p-2.5 space-y-1">
            <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                <GitBranch className="h-3 w-3" />
                {t('analyzer.discourse.title')}
            </h4>
            <p className="text-xs">
                <span className="font-semibold">{t(`analyzer.discourse.${insight.discourseFunction}`)}</span>
                {' — '}
                <span className="text-muted-foreground">
                    {t(`analyzer.discourseHint.${insight.discourseFunction}`)}
                </span>
            </p>
            {insight.connects && (
                <p className="text-xs">
                    <span className="text-muted-foreground">{t('analyzer.discourse.connects')}: </span>
                    {insight.connects}
                </p>
            )}
        </div>
    );
}
