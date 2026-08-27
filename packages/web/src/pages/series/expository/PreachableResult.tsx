import { useState } from 'react';
import { Loader2, AlertTriangle, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { type PreachableUnit } from '@dosfilos/domain';
import { BoundaryEditPopover } from './BoundaryEditPopover';

export function PreachableResult({
    units,
    bookDisplay,
    strictMode,
    onUnitChange,
    onMerge,
    onSplit,
    onRevalidate,
    isRevalidating,
    t,
}: {
    units: ReadonlyArray<PreachableUnit>;
    bookDisplay: string;
    strictMode?: boolean;
    onUnitChange: (id: string, patch: Partial<PreachableUnit>) => void;
    onMerge: (idA: string) => void;
    onSplit: (id: string, atVerse: number) => void;
    onRevalidate: () => void;
    isRevalidating: boolean;
    t: (key: string, opts?: Record<string, unknown>) => string;
}) {
    const modifiedCount = units.filter((u) => u.modifiedByPastor).length;
    return (
        <div className="space-y-3">
            {/* Banner: panoramic disclaimer in draft mode; validated
                marker in strict mode. The strict-mode banner replaces
                "treat as hypothesis" with "treat as exegetically
                grounded" so the pastor knows the propositions reflect
                completed exegetical work, not panoramic guesses. */}
            {strictMode ? (
                <div className="rounded-lg border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2.5 text-xs text-emerald-800 dark:text-emerald-200">
                    <div className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <p>{t('expository.results.preachable.strictBanner')}</p>
                    </div>
                </div>
            ) : (
                <div className="rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <p>{t('expository.results.preachable.preliminaryBanner')}</p>
                    </div>
                </div>
            )}
            <ol className="space-y-3">
                {units.map((u, idx) => (
                    <li
                        key={u.id}
                        className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 px-4 py-3"
                    >
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-semibold">
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <input
                                        type="text"
                                        value={u.title}
                                        onChange={(e) => onUnitChange(u.id, { title: e.target.value })}
                                        className="text-sm font-semibold text-slate-800 dark:text-slate-100 bg-transparent border-0 px-1 -mx-1 rounded hover:bg-white dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-colors min-w-0 flex-1"
                                        aria-label={t('expository.results.preachable.editTitle') as string}
                                    />
                                    <BoundaryEditPopover
                                        unit={u}
                                        bookDisplay={bookDisplay}
                                        onCommit={(patch) => onUnitChange(u.id, patch)}
                                        t={t}
                                    />
                                    <RegroupMenu
                                        unit={u}
                                        canMerge={idx < units.length - 1}
                                        onMerge={() => onMerge(u.id)}
                                        onSplit={(atVerse) => onSplit(u.id, atVerse)}
                                        t={t}
                                    />
                                    {u.caseTreatment && (
                                        <span className="text-[10px] uppercase tracking-wide font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                                            {t(`expository.results.preachable.case.${u.caseTreatment}`)}
                                        </span>
                                    )}
                                    {u.modifiedByPastor && (
                                        <span className="text-[10px] uppercase tracking-wide font-semibold text-sky-800 dark:text-sky-200 bg-sky-100 dark:bg-sky-900/40 border border-sky-300/70 dark:border-sky-700/50 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                            {t('expository.results.preachable.modifiedChip')}
                                        </span>
                                    )}
                                    {!strictMode && (
                                        <span className="text-[10px] uppercase tracking-wide font-medium text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/30 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            {t('expository.results.preachable.preliminaryChip')}
                                        </span>
                                    )}
                                </div>
                                {u.modifiedByPastor && (
                                    <div className="mb-2 rounded-md border border-sky-300/70 dark:border-sky-700/50 bg-sky-50 dark:bg-sky-950/30 px-2.5 py-1.5 text-[11.5px] text-sky-900 dark:text-sky-100 leading-snug">
                                        {t('expository.results.preachable.refineBanner')}
                                    </div>
                                )}
                                <EditablePropositionRow
                                    label={t('expository.results.preachable.exegeticalProp') as string}
                                    value={u.exegeticalProposition}
                                    onChange={(v) => onUnitChange(u.id, { exegeticalProposition: v })}
                                />
                                <EditablePropositionRow
                                    label={t('expository.results.preachable.homileticalProp') as string}
                                    value={u.homileticalProposition}
                                    onChange={(v) => onUnitChange(u.id, { homileticalProposition: v })}
                                />
                                <EditablePropositionRow
                                    label={t('expository.results.preachable.objective') as string}
                                    value={u.pastoralObjective}
                                    onChange={(v) => onUnitChange(u.id, { pastoralObjective: v })}
                                />
                            </div>
                        </div>
                    </li>
                ))}
            </ol>

            {/* Always-visible footer: lets the pastor re-run Phase 5
                whenever (after a merge/split, or just to double-check).
                Modified count is informative — not gating. */}
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 px-3 py-2">
                <p className="text-[12px] text-slate-600 dark:text-slate-300">
                    {modifiedCount > 0
                        ? (t('expository.results.preachable.modifiedCount', { count: modifiedCount }) as string)
                        : (t('expository.results.preachable.noChanges') as string)}
                </p>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onRevalidate}
                    disabled={isRevalidating}
                    className="shrink-0"
                >
                    {isRevalidating ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {t('expository.results.preachable.revalidate')}
                </Button>
            </div>
        </div>
    );
}

/**
 * Compact menu on each preachable unit card with two structural actions:
 *   - Merge with next (disabled on the last card)
 *   - Split at verse (popover with verse number input)
 * Heuristics fire client-side as soft warnings before the parent commits.
 */
export function RegroupMenu({
    unit,
    canMerge,
    onMerge,
    onSplit,
    t,
}: {
    unit: PreachableUnit;
    canMerge: boolean;
    onMerge: () => void;
    onSplit: (atVerse: number) => void;
    t: (key: string, opts?: Record<string, unknown>) => string;
}) {
    const isSingleChapter = unit.chapterStart === unit.chapterEnd;
    const verseSpan = isSingleChapter ? unit.verseEnd - unit.verseStart : 0;
    const [splitOpen, setSplitOpen] = useState(false);
    const [splitVerse, setSplitVerse] = useState<number | ''>('');
    const minSplit = unit.verseStart + 1;
    const maxSplit = unit.verseEnd - 1;
    const splitNumber = typeof splitVerse === 'number' ? splitVerse : NaN;
    const splitTooSmall =
        Number.isFinite(splitNumber) &&
        (splitNumber - unit.verseStart < 5 || unit.verseEnd - splitNumber < 5);

    return (
        <div className="inline-flex items-center gap-1 shrink-0">
            <Button
                size="sm"
                variant="ghost"
                onClick={onMerge}
                disabled={!canMerge}
                title={t('expository.results.preachable.regroup.mergeHint') as string}
                className="h-7 px-2 text-[11px] gap-1"
            >
                {t('expository.results.preachable.regroup.merge')}
            </Button>
            <Popover open={splitOpen} onOpenChange={setSplitOpen}>
                <PopoverTrigger asChild>
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={!isSingleChapter || verseSpan < 2}
                        title={
                            isSingleChapter
                                ? (t('expository.results.preachable.regroup.splitHint') as string)
                                : (t('expository.results.preachable.regroup.splitCrossChapterHint') as string)
                        }
                        className="h-7 px-2 text-[11px] gap-1"
                    >
                        {t('expository.results.preachable.regroup.split')}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 space-y-2">
                    <p className="text-[12px] font-medium text-slate-800 dark:text-slate-100">
                        {t('expository.results.preachable.regroup.splitTitle')}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('expository.results.preachable.regroup.splitRangeHint', { min: minSplit, max: maxSplit }) as string}
                    </p>
                    <Input
                        type="number"
                        min={minSplit}
                        max={maxSplit}
                        value={splitVerse}
                        onChange={(e) => {
                            const v = e.target.value;
                            setSplitVerse(v === '' ? '' : Number(v));
                        }}
                        placeholder={String(Math.floor((unit.verseStart + unit.verseEnd) / 2))}
                        className="h-8 text-sm"
                    />
                    {splitTooSmall && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                            {t('expository.results.preachable.regroup.splitWarnTiny')}
                        </p>
                    )}
                    <div className="flex justify-end gap-1.5 pt-1">
                        <Button size="sm" variant="ghost" onClick={() => setSplitOpen(false)} className="h-7 text-[11px]">
                            {t('expository.results.preachable.regroup.cancel')}
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                if (typeof splitVerse !== 'number') return;
                                if (splitVerse < minSplit || splitVerse > maxSplit) return;
                                onSplit(splitVerse);
                                setSplitOpen(false);
                                setSplitVerse('');
                            }}
                            disabled={typeof splitVerse !== 'number' || splitVerse < minSplit || splitVerse > maxSplit}
                            className="h-7 text-[11px]"
                        >
                            {t('expository.results.preachable.regroup.confirmSplit')}
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

/**
 * Inline-editable proposition row. Renders as plain text by default
 * (no border, transparent bg) but reveals an editor border on hover/
 * focus — Notion-style "looks like text, edits like text". The
 * textarea uses `field-sizing: content` (Chromium 123+, Safari 18+)
 * to auto-grow with the content; Firefox falls back to a fixed
 * `rows={3}` minimum until that property ships there.
 */
export function EditablePropositionRow({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="mb-1">
            <span className="text-[11px] uppercase tracking-wide text-slate-400 font-medium block">
                {label}
            </span>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={Math.max(2, Math.ceil(value.length / 90))}
                className="text-xs text-slate-700 dark:text-slate-300 bg-transparent border border-transparent rounded px-1.5 py-1 -mx-1.5 w-full resize-none hover:border-slate-200 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 focus:border-emerald-400 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none transition-colors"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
        </div>
    );
}
