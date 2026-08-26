import { greekRecognitionClues, type GreekWordInsight, type GreekWordToken } from '@dosfilos/domain';
import { useTranslation } from 'react-i18next';

interface Props {
    token: GreekWordToken;
    insight?: GreekWordInsight;
}

/**
 * El contenido del popover al posicionarse sobre una palabra de la banda —
 * el espejo del `WordTooltipContent` hebreo: resumen morfológico, traducción
 * y las PISTAS DE RECONOCIMIENTO.
 *
 * Las pistas responden la pregunta del fundador —"¿cómo le explicamos al
 * pastor que χαίρειν es presente activo infinitivo?"— en sus dos capas: el
 * ANÁLISIS lo anota MorphGNT (dataset académico, no un modelo), y las MARCAS
 * que lo confirman en la forma se derivan por catálogo determinista, que
 * OMITE la pista cuando la marca no está en vez de inventarla.
 */
export function GreekWordHoverContent({ token, insight }: Props) {
    const { t } = useTranslation('greekTutor');
    const pistas = greekRecognitionClues(token);

    const resumen = [
        token.tag.tense && t(`analyzer.tense.${token.tag.tense}`),
        token.tag.voice && t(`analyzer.voice.${token.tag.voice}`),
        token.tag.mood && t(`analyzer.mood.${token.tag.mood}`),
        token.tag.person && t('analyzer.personShort', { n: token.tag.person }),
        token.tag.case && t(`analyzer.case.${token.tag.case}`),
        token.tag.number && t(`analyzer.number.${token.tag.number}`),
        token.tag.gender && t(`analyzer.gender.${token.tag.gender}`),
    ].filter(Boolean);

    return (
        <div className="w-72 space-y-3 p-1 text-left">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-xl leading-tight" lang="grc">{token.text}</div>
                    <div className="text-xs text-muted-foreground italic">{token.transliteration}</div>
                </div>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                    {t(`analyzer.pos.${token.pos}`)}
                </span>
            </div>

            <div className="space-y-1 text-sm">
                <div>
                    <span className="text-muted-foreground">{t('analyzer.fields.lemma')}: </span>
                    <span lang="grc">{token.lemma}</span>
                </div>
                {resumen.length > 0 && (
                    <div className="text-muted-foreground">{resumen.join(' · ')}</div>
                )}
                {insight && (
                    <div>
                        <span className="text-muted-foreground">{t('analyzer.fields.translation')}: </span>
                        <span className="font-medium text-primary">{insight.translation}</span>
                    </div>
                )}
                {insight && <div className="text-xs">{insight.syntacticFunction}</div>}
            </div>

            {pistas.length > 0 && (
                <div className="rounded-md bg-warning/10 p-2.5 space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-warning">
                        {t('analyzer.clues.title')}
                    </div>
                    <ul className="space-y-0.5 text-xs">
                        {pistas.map((p) => (
                            <li key={p.id}>
                                • {t(`analyzer.clues.${p.id}`, { marker: p.marker })}
                            </li>
                        ))}
                    </ul>
                    {/* La capa honesta: quién determinó el análisis. */}
                    <p className="pt-1 text-[10px] text-muted-foreground">{t('analyzer.clues.source')}</p>
                </div>
            )}
        </div>
    );
}
