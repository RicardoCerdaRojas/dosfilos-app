import { rangeToReader, type BibleBookId, type VerseRange } from '@dosfilos/domain';
import { CheckCircle2, CircleDashed, Loader2, AlertTriangle } from 'lucide-react';

export type PassState = 'pending' | 'running' | 'done' | 'error';

export function ChipStateBadge({ state }: { state: PassState }) {
    const cls = 'h-3 w-3';
    if (state === 'running') return <Loader2 className={`${cls} animate-spin text-emerald-600 dark:text-emerald-300`} />;
    if (state === 'done') return <CheckCircle2 className={`${cls} text-emerald-600 dark:text-emerald-300`} />;
    if (state === 'error') return <AlertTriangle className={`${cls} text-rose-600 dark:text-rose-300`} />;
    return <CircleDashed className={`${cls} text-slate-400`} />;
}

export function PassStateBadge({ state }: { state: PassState }) {
    if (state === 'running') {
        return (
            <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
            </div>
        );
    }
    if (state === 'done') {
        return (
            <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
            </div>
        );
    }
    if (state === 'error') {
        return (
            <div className="shrink-0 w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
            </div>
        );
    }
    return (
        <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center">
            <CircleDashed className="h-4 w-4" />
        </div>
    );
}

export function derivePassState(
    isPending: boolean,
    payload: unknown,
    isError: boolean,
): PassState {
    if (isPending) return 'running';
    if (payload) return 'done';
    if (isError) return 'error';
    return 'pending';
}

function formatNumbers(s: VerseRange): string {
    if (s.chapterStart === s.chapterEnd) {
        if (s.verseStart === s.verseEnd) return `${s.chapterStart}:${s.verseStart}`;
        return `${s.chapterStart}:${s.verseStart}-${s.verseEnd}`;
    }
    return `${s.chapterStart}:${s.verseStart}-${s.chapterEnd}:${s.verseEnd}`;
}

/**
 * Formatea un tramo EN LA NUMERACIÓN DE LA BIBLIA DEL PASTOR.
 *
 * El `bookId` es obligatorio y no es burocracia: sin él no se puede
 * traducir, y este formateador es el punto exacto donde las coordenadas del
 * Masorético —las que produce el detector de perícopas, que divide por
 * gramática y no por capítulos modernos— se convertían en el rótulo que el
 * pastor leía como si fuera su RVR. Así «Jonás 2:1-10» del hebreo se le
 * mostró como si fuera castellano, y el pez de 1:17 quedó fuera de toda
 * perícopa de la serie.
 */
export function formatRangeForReader(bookId: BibleBookId, s: VerseRange): string {
    return formatNumbers(rangeToReader(bookId, s));
}
