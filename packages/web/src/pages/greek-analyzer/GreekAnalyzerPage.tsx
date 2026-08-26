import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { BibleBookId } from '@dosfilos/domain';
import { useGreekVerse } from './useGreekVerse';
import { useGreekInsight } from './useGreekInsight';
import { GreekWordCard } from './GreekWordCard';

/**
 * El ANALIZADOR griego — espejo del analizador hebreo, versículo a versículo:
 * texto griego con transliteración palabra a palabra, y la morfología completa
 * de cada una en tarjetas. Todo A LA VISTA, que es lo que el modo de estudio
 * paso a paso no ofrece — y todo DETERMINISTA (MorphGNT), sin una sola llamada
 * a modelo: instantáneo tras la primera carga del libro.
 *
 * Nace del pedido del fundador sobre Santiago 1:1-8: "necesito el texto griego
 * para leer, la transliteración y la traducción… todo el material a la vista
 * como ocurre en el módulo de hebreo". Las traducciones y el rango semántico
 * llegan en la fase 2 (LLM con caché, como el hebreo).
 */
export function GreekAnalyzerPage() {
    const { t, i18n } = useTranslation('greekTutor');
    const { book, chapter, verse, books, chapters, versesInChapter, data, loading, error, goTo, step } =
        useGreekVerse({ book: 'JAS', chapter: 1, verse: 1 });
    const [seleccion, setSeleccion] = useState<number | null>(null);

    const nombre = (b: { nameEs: string; nameEn: string }) =>
        i18n.language.startsWith('es') ? b.nameEs : b.nameEn;
    const libroActual = books.find((b) => b.id === book);
    const referencia = `${book} ${chapter}:${verse}`;
    const { insight, generating, error: insightError, generate } = useGreekInsight(referencia, data?.tokens);

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-4 space-y-5">
                {/* Navegación: libro / capítulo / versículo + paso a paso. */}
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={book} onValueChange={(v) => goTo(v as BibleBookId, 1, 1)}>
                        <SelectTrigger className="w-44 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {books.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                    {nombre(b)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={String(chapter)} onValueChange={(v) => goTo(book, Number(v), 1)}>
                        <SelectTrigger className="w-28 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {chapters.map((c) => (
                                <SelectItem key={c} value={String(c)}>
                                    {t('analyzer.chapterShort', { n: c })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={String(verse)} onValueChange={(v) => goTo(book, chapter, Number(v))}>
                        <SelectTrigger className="w-24 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: versesInChapter }, (_, i) => i + 1).map((v) => (
                                <SelectItem key={v} value={String(v)}>
                                    {t('analyzer.verseShort', { n: v })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => step(-1)} aria-label={t('analyzer.prevVerse')}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => step(1)} aria-label={t('analyzer.nextVerse')}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <p className="text-sm text-destructive py-12 text-center">{error}</p>
                ) : !data ? (
                    <p className="text-sm text-muted-foreground py-12 text-center">{t('analyzer.notFound')}</p>
                ) : (
                    <>
                        {/* EL VERSÍCULO PARA LEER: griego grande, transliteración
                            debajo de cada palabra. Clicar una la resalta en la
                            grilla de análisis. */}
                        <div className="rounded-lg border border-border bg-primary/[0.03] p-6">
                            <div className="mb-4 text-sm font-semibold">
                                {libroActual ? nombre(libroActual) : book} {chapter}:{verse}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-5" lang="grc">
                                {data.tokens.map((tok, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setSeleccion(seleccion === i ? null : i)}
                                        className={cn(
                                            'group flex flex-col items-center rounded px-1.5 py-1 transition-colors hover:bg-primary/10',
                                            seleccion === i && 'bg-primary/10 ring-1 ring-primary/40',
                                        )}
                                    >
                                        <span className="text-3xl leading-tight">{tok.text}</span>
                                        <span className="text-[11px] text-muted-foreground italic" lang="en">
                                            {tok.transliteration}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* LAS DOS TRADUCCIONES — el aporte del modelo, con caché
                            global: el texto griego es el mismo para todos, así que
                            un análisis pagado una vez sirve a todos. PULL, no auto:
                            quien lee morfología no pidió pagar una llamada. */}
                        {insight ? (
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg border border-border p-4 space-y-1">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t('analyzer.literalTranslation')}
                                    </h4>
                                    <p className="text-sm leading-relaxed">{insight.literalTranslation}</p>
                                </div>
                                <div className="rounded-lg border border-border p-4 space-y-1">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t('analyzer.fluidTranslation')}
                                    </h4>
                                    <p className="text-sm leading-relaxed">{insight.fluidTranslation}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-border p-4 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm text-muted-foreground">{t('analyzer.insightPitch')}</p>
                                <Button size="sm" onClick={() => void generate()} disabled={generating}>
                                    {generating ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="mr-2 h-4 w-4" />
                                    )}
                                    {generating ? t('analyzer.generating') : t('analyzer.generateInsight')}
                                </Button>
                                {insightError && <p className="w-full text-xs text-destructive">{t('analyzer.insightError')}</p>}
                            </div>
                        )}

                        {/* ANÁLISIS POR PALABRA — todo a la vista. */}
                        <div>
                            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('analyzer.wordAnalysis', { count: data.tokens.length })}
                            </h3>
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {data.tokens.map((tok, i) => (
                                    <GreekWordCard
                                        key={i}
                                        token={tok}
                                        insight={insight?.words[i]}
                                        highlighted={seleccion === i}
                                        onClick={() => setSeleccion(seleccion === i ? null : i)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* ATRIBUCIÓN OBLIGATORIA. El texto del SBLGNT es CC BY
                            4.0; la MORFOLOGÍA de MorphGNT que esta página
                            muestra es CC BY-SA 4.0 — el bloque latente que el
                            sistema de atribuciones esperaba. */}
                        <p className="text-[11px] leading-relaxed text-muted-foreground border-t border-border/60 pt-3">
                            {t('analyzer.attribution')}{' '}
                            <a
                                href="https://github.com/morphgnt/sblgnt"
                                target="_blank"
                                rel="noreferrer"
                                className="underline hover:text-foreground"
                            >
                                morphgnt/sblgnt
                            </a>{' '}
                            · CC BY-SA 4.0
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
