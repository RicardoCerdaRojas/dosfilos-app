import { greekRecognitionClues, type GreekKeyInsight, type GreekWordInsight, type GreekWordToken } from '@dosfilos/domain';
import { Star, BookmarkPlus, Check } from 'lucide-react';
import { useNtLemmaFrequency } from './useLemmaFrequency';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface Props {
    token: GreekWordToken;
    /** El aporte del modelo (fase 2): rango, función, traducción. Opcional. */
    insight?: GreekWordInsight;
    /** La significancia homilética, si esta palabra es una de las claves. */
    keyInsight?: GreekKeyInsight;
    /** Frecuencia del lema en el libro actual (runtime, determinista). */
    bookCount?: number;
    /** Nombre del libro, para la línea de frecuencia. */
    bookName?: string;
    /** Guardar el hallazgo para el sermón. Presente sólo con insight. */
    onSaveFinding?: () => void;
    saved?: boolean;
    highlighted?: boolean;
    onClick?: () => void;
}

/** Color de la insignia por categoría — misma paleta semántica del hebreo. */
const POS_BADGE: Record<string, string> = {
    V: 'bg-primary/10 text-primary',
    N: 'bg-info/10 text-info',
    A: 'bg-warning/10 text-warning',
    RA: 'bg-muted text-muted-foreground',
    RP: 'bg-muted text-muted-foreground',
    RR: 'bg-muted text-muted-foreground',
    RD: 'bg-muted text-muted-foreground',
    RI: 'bg-muted text-muted-foreground',
};

/**
 * Una palabra griega con su morfología de MorphGNT — el espejo de la
 * `WordCard` del hebreo, con la gramática del griego (caso/tiempo/voz/modo
 * en vez de binyan/forma/estado).
 *
 * TODO EL CONTENIDO ES DETERMINISTA: viene del dataset, no de un modelo. Las
 * celdas ausentes no se muestran — un rótulo sobre un guion no informa nada.
 */
export function GreekWordCard({
    token,
    insight,
    keyInsight,
    bookCount,
    bookName,
    onSaveFinding,
    saved,
    highlighted,
    onClick,
}: Props) {
    const { t } = useTranslation('greekTutor');
    const { tag } = token;
    const pistas = greekRecognitionClues(token);
    const ntCount = useNtLemmaFrequency(token.lemma);
    // La RAREZA es el dato que se cita en el púlpito: "δίψυχος aparece sólo
    // 2 veces en todo el NT". Se destaca cuando de verdad es raro.
    const esRara = ntCount !== null && ntCount > 0 && ntCount <= 5;

    const celdas: { labelKey: string; value: string }[] = [];
    const celda = (labelKey: string, dim: string, code?: string) => {
        if (code) celdas.push({ labelKey, value: t(`analyzer.${dim}.${code}`) });
    };
    celda('analyzer.fields.tense', 'tense', tag.tense);
    celda('analyzer.fields.voice', 'voice', tag.voice);
    celda('analyzer.fields.mood', 'mood', tag.mood);
    if (tag.person) celdas.push({ labelKey: 'analyzer.fields.person', value: tag.person });
    celda('analyzer.fields.case', 'case', tag.case);
    celda('analyzer.fields.number', 'number', tag.number);
    celda('analyzer.fields.gender', 'gender', tag.gender);
    celda('analyzer.fields.degree', 'degree', tag.degree);

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                // `flex-col` + `h-full`: un <button> CENTRA su contenido por
                // defecto — en el grid, las tarjetas cortas flotaban al medio
                // de la fila con aire arriba. El contenido arranca en el tope
                // y todas las tarjetas igualan la altura de su fila.
                'flex h-full flex-col items-stretch justify-start text-left rounded-lg border border-border bg-card p-4 space-y-3 transition-colors',
                onClick && 'hover:border-primary/40',
                highlighted && 'border-primary ring-1 ring-primary/30',
            )}
        >
            <div className="flex items-center gap-2">
                <span
                    className={cn(
                        'rounded px-1.5 py-0.5 text-[11px] leading-none font-medium',
                        POS_BADGE[token.pos] ?? 'bg-muted text-muted-foreground',
                    )}
                >
                    {t(`analyzer.pos.${token.pos}`)}
                </span>
                {keyInsight && (
                    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] leading-none text-primary">
                        <Star className="h-3 w-3" />
                        {t('analyzer.keyWordBadge')}
                    </span>
                )}
                {onSaveFinding && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!saved) onSaveFinding();
                        }}
                        onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && !saved) {
                                e.stopPropagation();
                                onSaveFinding();
                            }
                        }}
                        className={cn(
                            'ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] leading-none transition-colors',
                            saved
                                ? 'bg-success/10 text-success cursor-default'
                                : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer',
                        )}
                        title={saved ? t('analyzer.findingSaved') : t('analyzer.saveFinding')}
                    >
                        {saved ? <Check className="h-3 w-3" /> : <BookmarkPlus className="h-3 w-3" />}
                        {saved ? t('analyzer.findingSavedShort') : t('analyzer.saveFindingShort')}
                    </span>
                )}
            </div>

            <div className="flex items-baseline justify-between gap-3">
                <div>
                    <div className="text-2xl leading-tight" lang="grc">
                        {token.text}
                    </div>
                    <div className="text-xs text-muted-foreground italic">{token.transliteration}</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t('analyzer.fields.lemma')}
                    </div>
                    <div className="text-sm font-medium" lang="grc">
                        {token.lemma}
                    </div>
                </div>
            </div>

            {insight && (
                <div className="text-sm font-medium text-primary">{insight.translation}</div>
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

            {celdas.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                    {celdas.map((c) => (
                        <div key={c.labelKey} className="rounded border border-border/60 px-2 py-1.5">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {t(c.labelKey)}
                            </div>
                            <div className="text-sm">{c.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {pistas.length > 0 && (
                <div className="rounded-md bg-warning/10 p-2.5 space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-warning">
                        {t('analyzer.clues.title')}
                    </div>
                    <ul className="space-y-0.5 text-xs">
                        {pistas.map((p) => (
                            <li key={p.id}>• {t(`analyzer.clues.${p.id}`, { marker: p.marker })}</li>
                        ))}
                    </ul>
                </div>
            )}

            {insight && (
                <div className="space-y-1.5 border-t border-border/60 pt-2">
                    <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {t('analyzer.fields.semanticRange')}
                        </div>
                        <div className="text-sm">{insight.semanticRange}</div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {t('analyzer.fields.syntacticFunction')}
                        </div>
                        <div className="text-sm">{insight.syntacticFunction}</div>
                    </div>
                </div>
            )}

            {keyInsight && (
                <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5 space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {t('analyzer.significance')}
                    </div>
                    <p className="text-sm leading-relaxed">{keyInsight.significance}</p>
                </div>
            )}
        </button>
    );
}
