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
    keyInsight?: GreekKeyInsight;
    relations?: { type: string; note: string; otherText: string }[];
    bookCount?: number;
    bookName?: string;
}

/** Una sección del popover: rótulo pequeño + cuerpo. Da el ritmo vertical. */
function Bloque({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <section className="space-y-0.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</h4>
            <div className="text-sm leading-snug">{children}</div>
        </section>
    );
}

/**
 * El popover de una palabra — REDISEÑADO CON JERARQUÍA, no por acumulación.
 *
 * Creció campo a campo hasta ser una lista plana donde el dato importante
 * pesaba lo mismo que el accesorio; el fundador lo comparó con las tarjetas y
 * tenía razón. El orden ahora es el de la lectura real:
 *
 *   1. IDENTIDAD — la palabra, su transliteración, categoría y lema.
 *   2. QUÉ SIGNIFICA AQUÍ — la traducción, en grande. Es lo que se viene a
 *      buscar al pasar el mouse.
 *   3. POR QUÉ ASÍ — el puente del caso y la función sintáctica: lo que
 *      explica esa traducción.
 *   4. LA FORMA — morfología en celdas (como en la tarjeta) y las pistas.
 *   5. CONTEXTO — rango semántico, relaciones, frecuencia.
 *   6. SIGNIFICANCIA — el "¿y qué?", cerrando, sólo si es palabra clave.
 *
 * Encabezado FIJO: al desplazarse por un análisis largo, la palabra que se
 * está mirando no debe salirse de la vista.
 */
export function GreekWordHoverContent({ token, insight, keyInsight, relations, bookCount, bookName }: Props) {
    const { t } = useTranslation('greekTutor');
    const pistas = greekRecognitionClues(token);
    const ntCount = useNtLemmaFrequency(token.lemma);
    const esRara = ntCount !== null && ntCount > 0 && ntCount <= 5;
    const puente = translationBridge(token);
    const { tag } = token;

    const celdas: { label: string; value: string }[] = [];
    const celda = (labelKey: string, dim: string, code?: string) => {
        if (code) celdas.push({ label: t(`analyzer.fields.${labelKey}`), value: t(`analyzer.${dim}.${code}`) });
    };
    celda('tense', 'tense', tag.tense);
    celda('voice', 'voice', tag.voice);
    celda('mood', 'mood', tag.mood);
    if (tag.person) celdas.push({ label: t('analyzer.fields.person'), value: tag.person });
    celda('case', 'case', tag.case);
    celda('number', 'number', tag.number);
    celda('gender', 'gender', tag.gender);

    return (
        <div className="w-[22rem] max-w-[calc(100vw-2rem)] max-h-[75vh] overflow-y-auto overflow-x-hidden text-left">
            {/* 1 · IDENTIDAD — fija al desplazarse. */}
            <header className="sticky top-0 z-10 -mx-1 flex items-start justify-between gap-3 border-b border-border bg-card px-4 py-3">
                <div className="min-w-0">
                    <div className="text-2xl leading-tight" lang="grc">{token.text}</div>
                    <div className="text-xs text-muted-foreground italic">
                        {token.transliteration}
                        <span className="not-italic"> · {t('analyzer.fields.lemma')} </span>
                        <span className="not-italic font-medium text-foreground" lang="grc">{token.lemma}</span>
                    </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                        {t(`analyzer.pos.${token.pos}`)}
                    </span>
                    {keyInsight && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] leading-none text-primary">
                            <Star className="h-2.5 w-2.5" />
                            {t('analyzer.keyWordBadge')}
                        </span>
                    )}
                </div>
            </header>

            <div className="space-y-3 px-4 py-3 break-words">
                {/* 2 · QUÉ SIGNIFICA AQUÍ — lo que se viene a buscar. */}
                {insight && (
                    <p className="text-base font-medium leading-snug text-primary">{insight.translation}</p>
                )}

                {/* EL RANGO VA PEGADO AL LEMA, no en el bloque de contexto: el
                    lema ABRE la pregunta ("¿qué puede significar esta raíz?")
                    y el rango la RESPONDE. Separarlos obligaba a bajar y
                    volver para completar una sola idea. */}
                {insight?.semanticRange && (
                    <Bloque label={t('analyzer.fields.semanticRange')}>{insight.semanticRange}</Bloque>
                )}

                {/* 3 · POR QUÉ ASÍ. */}
                {(puente || insight?.caseFunction || insight?.syntacticFunction) && (
                    <div className="space-y-1.5 rounded-md bg-muted/50 p-2.5">
                        {insight?.caseFunction && tag.case && (
                            <div className="text-xs">
                                <span className="font-semibold text-info">
                                    {t(`analyzer.caseFn.${tag.case}.${insight.caseFunction}`)}
                                </span>
                                <span className="text-muted-foreground">
                                    {' — '}
                                    {t(`analyzer.caseFnHint.${insight.caseFunction}`)}
                                </span>
                            </div>
                        )}
                        {puente && (
                            <p className="text-xs italic text-muted-foreground">{t(`analyzer.bridge.${puente}`)}</p>
                        )}
                        {insight?.syntacticFunction && <p className="text-xs">{insight.syntacticFunction}</p>}
                    </div>
                )}

                {/* 4 · LA FORMA — mismas celdas que la tarjeta. */}
                {/* CELDAS QUE SE ADAPTAN, no una rejilla rígida: con `grid-cols-3`
                    un valor largo ("Imperativo", "Subjuntivo") desbordaba su
                    columna y el popover ganaba scroll HORIZONTAL — el peor en
                    un panel de lectura, porque esconde texto sin avisar.
                    `auto-fit` + `minmax` reparte las que quepan, y `min-w-0`
                    deja que el contenido se ajuste en vez de empujar. */}
                {celdas.length > 0 && (
                    <div
                        className="grid gap-1"
                        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(5.5rem, 1fr))' }}
                    >
                        {celdas.map((c) => (
                            <div key={c.label} className="min-w-0 rounded border border-border/60 px-1.5 py-1">
                                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
                                <div className="text-xs leading-tight break-words">{c.value}</div>
                            </div>
                        ))}
                    </div>
                )}

                {pistas.length > 0 && (
                    <div className="rounded-md bg-warning/10 p-2.5 space-y-1">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-warning">
                            {t('analyzer.clues.title')}
                        </h4>
                        <ul className="space-y-0.5 text-xs">
                            {pistas.map((p) => (
                                <li key={p.id}>• {t(`analyzer.clues.${p.id}`, { marker: p.marker })}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* 5 · CONTEXTO. */}
                {relations && relations.length > 0 && (
                    <Bloque label={t('analyzer.fields.relations')}>
                        {relations.map((r, i) => (
                            <div key={i} className="text-xs">
                                <span className="font-medium text-info">{t(`analyzer.relation.${r.type}`)}</span>{' '}
                                <span lang="grc">{r.otherText}</span>
                                <div className="text-muted-foreground">{r.note}</div>
                            </div>
                        ))}
                    </Bloque>
                )}

                {insight?.nameNote && (
                    <Bloque label={t('analyzer.fields.nameNote')}>
                        <p className="text-xs leading-relaxed">{insight.nameNote}</p>
                    </Bloque>
                )}

                {ntCount !== null && ntCount > 0 && (
                    <p className={cn('text-xs', esRara ? 'font-medium text-warning' : 'text-muted-foreground')}>
                        {t('analyzer.frequency', { nt: ntCount })}
                        {bookCount !== undefined && bookName && (
                            <> · {t('analyzer.frequencyInBook', { n: bookCount, book: bookName })}</>
                        )}
                        {esRara && <> · {t('analyzer.rareWord')}</>}
                    </p>
                )}

                {/* 6 · SIGNIFICANCIA — cierra, y sólo si carga peso. */}
                {keyInsight && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-1">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                            {t('analyzer.significance')}
                        </h4>
                        <p className="text-xs leading-relaxed">{keyInsight.significance}</p>
                    </div>
                )}

                {pistas.length > 0 && (
                    <p className="border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground">
                        {t('analyzer.clues.source')}
                    </p>
                )}
            </div>
        </div>
    );
}
