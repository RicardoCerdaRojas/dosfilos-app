import { useTranslation } from 'react-i18next';
import type { PrepositionUsage } from '@dosfilos/domain';

interface Props {
    lemma: string;
    usage: PrepositionUsage;
}

/**
 * La preposición y EL CASO QUE RIGE — la pedagogía más rentable del griego,
 * y 100% determinista: el caso del término viene del dataset.
 *
 * διά con genitivo es "a través de"; con acusativo, "a causa de" — dos ideas
 * distintas con la misma palabra. Un pastor que no lo sabe lee "por" en ambas
 * y pierde la diferencia entre el MEDIO y el MOTIVO. Por eso los otros casos
 * se muestran también: el contraste ES la lección.
 */
export function GreekPrepositionBlock({ lemma, usage }: Props) {
    const { t } = useTranslation('greekTutor');
    const { active, alternatives } = usage;

    return (
        <div className="rounded-md border border-info/30 bg-info/5 p-2.5 space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-info">
                {t('analyzer.preposition.title')}
            </h4>

            {active ? (
                <p className="text-xs">
                    <span lang="grc" className="font-medium">{lemma}</span>
                    {' + '}
                    <span className="font-semibold">{t(`analyzer.case.${active.case}`)}</span>
                    {' → '}
                    {active.gloss}
                </p>
            ) : (
                <p className="text-xs text-muted-foreground">{t('analyzer.preposition.noObject')}</p>
            )}

            {alternatives.length > 0 && (
                <div className="space-y-0.5 border-t border-border/60 pt-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t('analyzer.preposition.contrast')}
                    </p>
                    {alternatives.map((alt) => (
                        <p key={alt.case} className="text-xs text-muted-foreground">
                            <span lang="grc">{lemma}</span> + {t(`analyzer.case.${alt.case}`)} → {alt.gloss}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}
