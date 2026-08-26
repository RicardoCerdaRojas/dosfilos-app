import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
import { GreekPassageView } from './GreekPassageView';
import { GreekInsightBlocks } from './GreekInsightBlocks';
import type { GreekFontScale } from './GreekVerseTools';
import { GreekVerseBoard } from './GreekVerseBoard';
import { FirestoreGreekFindingsRepository } from '@dosfilos/infrastructure';
import { transliterateGreek } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import { toast } from 'sonner';
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
    const { user } = useFirebase();
    const { book, chapter, verse, books, chapters, versesInChapter, data, loading, error, goTo, step, provider, lemmaCounts } =
        useGreekVerse({ book: 'JAS', chapter: 1, verse: 1 });
    const [seleccion, setSeleccion] = useState<number | null>(null);
    /** Versículo suelto o perícopa: un pastor estudia pasajes. */
    const [vista, setVista] = useState<'verse' | 'passage'>('verse');
    /** Lemas guardados en esta sesión, para el check del botón. */
    const [guardados, setGuardados] = useState<Set<string>>(new Set());
    /** Preferencias de lectura — del ESCRITORIO, no del texto: localStorage. */
    const [fontScale, setFontScale] = useState<GreekFontScale>(() => {
        const v = Number(localStorage.getItem('greekAnalyzer.fontScale'));
        return (v === 0 || v === 1 || v === 2 ? v : 1) as GreekFontScale;
    });
    const [showTranslit, setShowTranslit] = useState(() => localStorage.getItem('greekAnalyzer.translit') !== '0');
    const cambiarFuente = (sc: GreekFontScale) => {
        setFontScale(sc);
        localStorage.setItem('greekAnalyzer.fontScale', String(sc));
    };
    const alternarTranslit = () => {
        setShowTranslit((v) => {
            localStorage.setItem('greekAnalyzer.translit', v ? '0' : '1');
            return !v;
        });
    };

    const nombre = (b: { nameEs: string; nameEn: string }) =>
        i18n.language.startsWith('es') ? b.nameEs : b.nameEn;
    const libroActual = books.find((b) => b.id === book);
    const referencia = `${book} ${chapter}:${verse}`;
    const { insight, generating, error: insightError, generate } = useGreekInsight(referencia, data?.tokens);

    /** Empata una clave exegética con su token, tolerando puntuación. */
    const limpiar = (x: string) => x.replace(/[.,·;··]+$/u, '');
    const claveDe = (texto: string) =>
        insight?.keyInsights?.find((k) => limpiar(k.text) === limpiar(texto));

    /**
     * EL PUENTE AL SERMÓN: guarda el hallazgo con el MISMO formato de las
     * palabras clave del taller — que lo ofrecerá como propuesta en cualquier
     * sermón del pastor. Por eso el botón sólo existe con análisis: sin
     * significancia ni rango no hay nada que valga la pena llevarse.
     */
    const guardarHallazgo = async (i: number) => {
        const tok = data?.tokens[i];
        if (!tok || !user?.uid) return;
        const cuerpo = claveDe(tok.text)?.significance ?? insight?.words[i]?.semanticRange;
        if (!cuerpo) return;
        const nombreLibro = libroActual ? nombre(libroActual) : book;
        try {
            await new FirestoreGreekFindingsRepository().save(user.uid, {
                reference: `${nombreLibro} ${chapter}:${verse}`,
                lemma: tok.lemma,
                formatted: `*${tok.lemma}* (${transliterateGreek(tok.lemma)}) — ${cuerpo}`,
            });
            setGuardados((prev) => new Set(prev).add(tok.lemma));
            toast.success(t('analyzer.findingSavedToast'));
        } catch {
            toast.error(t('analyzer.findingError'));
        }
    };

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

                    {/* Versículo suelto o perícopa completa. */}
                    <div className="ml-auto flex items-center gap-1">
                        {(['verse', 'passage'] as const).map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setVista(v)}
                                className={cn(
                                    'rounded-md border px-3 py-1.5 text-sm transition-colors',
                                    vista === v
                                        ? 'bg-background text-foreground border-border/60 shadow-sm'
                                        : 'border-transparent text-muted-foreground hover:bg-muted/60',
                                )}
                            >
                                {t(`analyzer.view.${v}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {vista === 'passage' ? (
                    <GreekPassageView
                        provider={provider}
                        book={book}
                        bookName={libroActual ? nombre(libroActual) : book}
                        chapter={chapter}
                        versesInChapter={versesInChapter}
                        onOpenVerse={(v) => {
                            goTo(book, chapter, v);
                            setVista('verse');
                        }}
                    />
                ) : loading ? (
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
                        <GreekVerseBoard
                            title={`${libroActual ? nombre(libroActual) : book} ${chapter}:${verse}`}
                            data={data}
                            insight={insight}
                            claveDe={claveDe}
                            lemmaCounts={lemmaCounts}
                            bookName={libroActual ? nombre(libroActual) : book}
                            fontScale={fontScale}
                            onFontScale={cambiarFuente}
                            showTranslit={showTranslit}
                            onToggleTranslit={alternarTranslit}
                            onReanalyze={insight ? () => void generate() : undefined}
                            reanalyzing={generating}
                            seleccion={seleccion}
                            onSeleccion={setSeleccion}
                        />

                        {/* LAS DOS TRADUCCIONES — el aporte del modelo, con caché
                            global: el texto griego es el mismo para todos, así que
                            un análisis pagado una vez sirve a todos. PULL, no auto:
                            quien lee morfología no pidió pagar una llamada. */}
                        <GreekInsightBlocks
                            insight={insight}
                            generating={generating}
                            error={insightError}
                            onGenerate={() => void generate()}
                        />

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
                                        keyInsight={claveDe(tok.text)}
                                        bookCount={lemmaCounts[tok.lemma]}
                                        bookName={libroActual ? nombre(libroActual) : book}
                                        onSaveFinding={
                                            insight && user?.uid && (claveDe(tok.text) || insight.words[i])
                                                ? () => void guardarHallazgo(i)
                                                : undefined
                                        }
                                        saved={guardados.has(tok.lemma)}
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
