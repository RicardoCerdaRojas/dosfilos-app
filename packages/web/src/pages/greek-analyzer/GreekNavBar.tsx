import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { BibleBookId } from '@dosfilos/domain';

interface Libro {
    id: BibleBookId;
    nameEs: string;
    nameEn: string;
}

interface Props {
    books: Libro[];
    book: BibleBookId;
    chapter: number;
    verse: number;
    chapters: number[];
    versesInChapter: number;
    nombre: (b: Libro) => string;
    onGoTo: (b: BibleBookId, c: number, v: number) => void;
    onStep: (delta: 1 | -1) => void;
    vista: 'verse' | 'passage';
    onVista: (v: 'verse' | 'passage') => void;
}

/**
 * Dónde estoy y a dónde voy: libro, capítulo, versículo, paso a paso, y si se
 * lee un versículo o la perícopa. Extraída de la página, que ya sólo orquesta
 * — cada revisión con un profesor agrega una capa, y el archivo que las
 * coordina no puede crecer con cada una.
 */
export function GreekNavBar({
    books, book, chapter, verse, chapters, versesInChapter,
    nombre, onGoTo, onStep, vista, onVista,
}: Props) {
    const { t } = useTranslation('greekTutor');

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Select value={book} onValueChange={(v) => onGoTo(v as BibleBookId, 1, 1)}>
                <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {books.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{nombre(b)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={String(chapter)} onValueChange={(v) => onGoTo(book, Number(v), 1)}>
                <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {chapters.map((c) => (
                        <SelectItem key={c} value={String(c)}>{t('analyzer.chapterShort', { n: c })}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={String(verse)} onValueChange={(v) => onGoTo(book, chapter, Number(v))}>
                <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {Array.from({ length: versesInChapter }, (_, i) => i + 1).map((v) => (
                        <SelectItem key={v} value={String(v)}>{t('analyzer.verseShort', { n: v })}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => onStep(-1)} aria-label={t('analyzer.prevVerse')}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onStep(1)} aria-label={t('analyzer.nextVerse')}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="ml-auto flex items-center gap-1">
                {(['verse', 'passage'] as const).map((v) => (
                    <button
                        key={v}
                        type="button"
                        onClick={() => onVista(v)}
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
    );
}
