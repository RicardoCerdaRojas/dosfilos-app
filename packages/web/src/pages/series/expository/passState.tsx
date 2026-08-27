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

export function formatRange(s: { chapterStart: number; verseStart: number; chapterEnd: number; verseEnd: number }): string {
    if (s.chapterStart === s.chapterEnd) {
        if (s.verseStart === s.verseEnd) return `${s.chapterStart}:${s.verseStart}`;
        return `${s.chapterStart}:${s.verseStart}-${s.verseEnd}`;
    }
    return `${s.chapterStart}:${s.verseStart}-${s.chapterEnd}:${s.verseEnd}`;
}
