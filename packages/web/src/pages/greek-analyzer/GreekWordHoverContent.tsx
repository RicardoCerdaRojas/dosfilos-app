import {
    greekRecognitionClues,
    translationBridge,
    type GreekKeyInsight,
    type GreekWordInsight,
    type GreekWordToken,
} from '@dosfilos/domain';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNtLemmaFrequency } from './useLemmaFrequency';

interface Props {
    token: GreekWordToken;
    insight?: GreekWordInsight;
    /** La significancia homilética, si esta palabra es una de las claves. */
    keyInsight?: GreekKeyInsight;
    /** Conteo en el libro actual, cuando quien monta lo tiene a mano. */
    bookCount?: number;
    bookName?: string;
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
export function GreekWordHoverContent({ token, insight, keyInsight, bookCount, bookName }: Props) {
    const { t } = useTranslation('greekTutor');
    const pistas = greekRecognitionClues(token);
    const ntCount = useNtLemmaFrequency(token.lemma);
    const esRara = ntCount !== null && ntCount > 0 && ntCount <= 5;
    const puente = translationBridge(token);

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
        // EL POPOVER LLEVA LO MISMO QUE LA TARJETA. El fundador: "el uso que
        // le doy es para no tener que bajar al card cuando estoy mirando todo
        // el versículo". Scroll interno para los versículos con mucha clave.
        <div className="w-80 max-h-[70vh] overflow-y-auto space-y-3 p-1 text-left">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-xl leading-tight" lang="grc">{token.text}</div>
                    <div className="text-xs text-muted-foreground italic">{token.transliteration}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {keyInsight && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] leading-none text-primary">
                            <Star className="h-2.5 w-2.5" />
                            {t('analyzer.keyWordBadge')}
                        </span>
                    )}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                        {t(`analyzer.pos.${token.pos}`)}
                    </span>
                </div>
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
                {/* EL PUENTE: por qué la traducción trae palabras que "no
                    están" en el griego — el caso las lleva dentro. */}
                {puente && (
                    <div className="text-xs italic text-muted-foreground">{t(`analyzer.bridge.${puente}`)}</div>
                )}
                {insight?.caseFunction && token.tag.case && (
                    <div className="text-xs">
                        <span className="font-medium text-info">
                            {t(`analyzer.caseFn.${token.tag.case}.${insight.caseFunction}`)}
                        </span>
                        {' — '}
                        <span className="text-muted-foreground">
                            {t(`analyzer.caseFnHint.${insight.caseFunction}`)}
                        </span>
                    </div>
                )}
                {insight && <div className="text-xs">{insight.syntacticFunction}</div>}
                {insight?.nameNote && (
                    <div className="rounded bg-muted/60 p-2 text-xs leading-relaxed">{insight.nameNote}</div>
                )}
                {insight && (
                    <div>
                        <span className="text-muted-foreground">{t('analyzer.fields.semanticRange')}: </span>
                        {insight.semanticRange}
                    </div>
                )}
                {ntCount !== null && ntCount > 0 && (
                    <div className={cn('text-xs', esRara ? 'font-medium text-warning' : 'text-muted-foreground')}>
                        {t('analyzer.frequency', { nt: ntCount })}
                        {bookCount !== undefined && bookName && (
                            <> · {t('analyzer.frequencyInBook', { n: bookCount, book: bookName })}</>
                        )}
                        {esRara && <> · {t('analyzer.rareWord')}</>}
                    </div>
                )}
            </div>

            {keyInsight && (
                <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5 space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {t('analyzer.significance')}
                    </div>
                    <p className="text-xs leading-relaxed">{keyInsight.significance}</p>
                </div>
            )}

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
