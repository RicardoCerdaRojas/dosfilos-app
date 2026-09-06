import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { rangeToOriginal, rangeToReader, type BibleBookId, type PreachableUnit } from '@dosfilos/domain';
import { formatRangeForReader } from './passState';

export interface BoundaryEditPopoverProps {
    unit: PreachableUnit;
    /** Necesario para traducir entre la numeración del original y la del lector. */
    bookId: BibleBookId;
    bookDisplay: string;
    onCommit: (patch: Partial<PreachableUnit>) => void;
    t: (key: string, opts?: Record<string, unknown>) => string;
}

export function BoundaryEditPopover({ unit, bookId, bookDisplay, onCommit, t }: BoundaryEditPopoverProps) {
    // Los campos se editan EN LA NUMERACIÓN DEL PASTOR. La unidad viene en
    // coordenadas del texto original —el detector divide sobre el hebreo—,
    // así que se traduce al abrir y se vuelve a traducir al guardar. Sin esa
    // vuelta, escribir «1:17» pensando en el pez de Jonás guardaría el 1:17
    // del Masorético, que es otro versículo.
    const readerUnit = rangeToReader(bookId, unit);
    const [open, setOpen] = useState(false);
    const [cs, setCs] = useState(readerUnit.chapterStart);
    const [vs, setVs] = useState(readerUnit.verseStart);
    const [ce, setCe] = useState(readerUnit.chapterEnd);
    const [ve, setVe] = useState(readerUnit.verseEnd);
    const [error, setError] = useState<string | null>(null);

    // Reset draft when the underlying unit changes (e.g. after a
    // refine round-trip) or when the popover reopens.
    useEffect(() => {
        if (open) {
            const r = rangeToReader(bookId, unit);
            setCs(r.chapterStart);
            setVs(r.verseStart);
            setCe(r.chapterEnd);
            setVe(r.verseEnd);
            setError(null);
        }
    }, [open, bookId, unit]);

    const validate = (): string | null => {
        if (!Number.isFinite(cs) || !Number.isFinite(vs) || !Number.isFinite(ce) || !Number.isFinite(ve)) {
            return t('expository.results.preachable.boundary.invalidNumbers') as string;
        }
        if (cs < 1 || vs < 1 || ce < 1 || ve < 1) {
            return t('expository.results.preachable.boundary.positive') as string;
        }
        if (cs > ce) {
            return t('expository.results.preachable.boundary.chapterOrder') as string;
        }
        if (cs === ce && vs > ve) {
            return t('expository.results.preachable.boundary.verseOrder') as string;
        }
        return null;
    };

    const handleApply = () => {
        const err = validate();
        if (err) { setError(err); return; }
        // De vuelta a coordenadas del original antes de guardar: esa es la
        // forma en que el sistema almacena las perícopas.
        const stored = rangeToOriginal(bookId, {
            chapterStart: cs, verseStart: vs, chapterEnd: ce, verseEnd: ve,
        });
        // La etiqueta, en cambio, se recalcula en la numeración del pastor,
        // porque es lo que él va a leer en la lista de la serie.
        const range = formatRangeForReader(bookId, stored);
        onCommit({
            chapterStart: stored.chapterStart,
            verseStart: stored.verseStart,
            chapterEnd: stored.chapterEnd,
            verseEnd: stored.verseEnd,
            passage: `${bookDisplay} ${range}`,
        });
        setOpen(false);
    };

    const dirty = cs !== readerUnit.chapterStart || vs !== readerUnit.verseStart
        || ce !== readerUnit.chapterEnd || ve !== readerUnit.verseEnd;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline focus:outline-none focus:underline transition-colors"
                    title={t('expository.results.preachable.boundary.editTooltip') as string}
                >
                    {unit.passage || `${bookDisplay} ${formatRangeForReader(bookId, unit)}`}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 space-y-2" align="start" sideOffset={4}>
                <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    {t('expository.results.preachable.boundary.title')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <NumberField
                        label={t('expository.results.preachable.boundary.chapterStart') as string}
                        value={cs}
                        onChange={setCs}
                    />
                    <NumberField
                        label={t('expository.results.preachable.boundary.verseStart') as string}
                        value={vs}
                        onChange={setVs}
                    />
                    <NumberField
                        label={t('expository.results.preachable.boundary.chapterEnd') as string}
                        value={ce}
                        onChange={setCe}
                    />
                    <NumberField
                        label={t('expository.results.preachable.boundary.verseEnd') as string}
                        value={ve}
                        onChange={setVe}
                    />
                </div>
                {error && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                        {t('expository.results.preachable.boundary.cancel')}
                    </Button>
                    <Button type="button" size="sm" onClick={handleApply} disabled={!dirty}>
                        {t('expository.results.preachable.boundary.apply')}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function NumberField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
}) {
    return (
        <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
            <input
                type="number"
                min={1}
                value={Number.isFinite(value) ? value : ''}
                onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    onChange(Number.isFinite(parsed) ? parsed : NaN);
                }}
                className="w-full rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
        </label>
    );
}
