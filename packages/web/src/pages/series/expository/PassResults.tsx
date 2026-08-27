import { type BookPanorama, type ExegeticalUnit, type MacroSection } from '@dosfilos/domain';
import { formatRange } from './passState';

export function PanoramaResult({ panorama, t }: { panorama: BookPanorama; t: (key: string) => string }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <ResultRow
                label={t('expository.results.panorama.genre')}
                value={t(`expository.results.panorama.genreLabel.${panorama.genre}`)}
            />
            <ResultRow label={t('expository.results.panorama.theme')} value={panorama.centralTheme} />
            <ResultRow label={t('expository.results.panorama.purpose')} value={panorama.purpose} fullWidth />
            <ResultRow label={t('expository.results.panorama.problem')} value={panorama.pastoralProblem} fullWidth />
            <ResultRow
                label={t('expository.results.panorama.movements')}
                value={panorama.movements.join(' / ')}
                fullWidth
            />
            {panorama.keyTerms.length > 0 && (
                <ResultRow
                    label={t('expository.results.panorama.keyTerms')}
                    value={panorama.keyTerms.join(', ')}
                    fullWidth
                />
            )}
            {panorama.redemptiveHistoryNote && (
                <ResultRow
                    label={t('expository.results.panorama.redemptiveHistory')}
                    value={panorama.redemptiveHistoryNote}
                    fullWidth
                />
            )}
        </div>
    );
}

export function ResultRow({
    label,
    value,
    fullWidth,
    mono,
}: {
    label: string;
    value: string;
    fullWidth?: boolean;
    mono?: boolean;
}) {
    return (
        <div className={fullWidth ? 'md:col-span-2' : ''}>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-0.5">
                {label}
            </p>
            <p className={`text-slate-700 dark:text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>
                {value}
            </p>
        </div>
    );
}

export function MacroResult({
    sections,
    bookDisplay,
    t,
}: {
    sections: ReadonlyArray<MacroSection>;
    bookDisplay: string;
    /** `t` con sus parámetros de interpolación: la firma anterior declaraba
     *  un solo argumento y varias llamadas pasan dos, así que mentía. */
    t: (key: string, params?: Record<string, unknown>) => string;
}) {
    return (
        <ul className="space-y-2">
            {sections.map((s) => (
                <li
                    key={s.id}
                    className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 px-3 py-2.5"
                >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {s.title}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {bookDisplay} {formatRange(s)}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                            {t(`expository.results.macro.function.${s.functionInBook}`)}
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{s.theme}</p>
                </li>
            ))}
        </ul>
    );
}

// ── Pass 3 result ───────────────────────────────────────────────────────

export function MicroResult({
    units,
    macros,
    bookDisplay,
    strictMode,
    unitsConfirmedHavePapers,
    onToggleHasPaper,
    t,
}: {
    units: ReadonlyArray<ExegeticalUnit>;
    macros: ReadonlyArray<MacroSection>;
    bookDisplay: string;
    /** v1.6 strict mode — surfaces per-unit "tiene paper aceptado" checkbox. */
    strictMode?: boolean;
    unitsConfirmedHavePapers?: Set<string>;
    onToggleHasPaper?: (unitId: string) => void;
    /** `t` con sus parámetros de interpolación: la firma anterior declaraba
     *  un solo argumento y varias llamadas pasan dos, así que mentía. */
    t: (key: string, params?: Record<string, unknown>) => string;
}) {
    // Group units by their macroSectionId to preserve the macro→micro
    // hierarchy in the UI (matches how the pastor reads the analysis).
    const unitsByMacro = new Map<string, ExegeticalUnit[]>();
    units.forEach((u) => {
        const arr = unitsByMacro.get(u.macroSectionId) ?? [];
        arr.push(u);
        unitsByMacro.set(u.macroSectionId, arr);
    });
    return (
        <div className="space-y-4">
            {macros.map((m) => {
                const macroUnits = unitsByMacro.get(m.id) ?? [];
                if (macroUnits.length === 0) return null;
                return (
                    <div key={m.id}>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-1.5">
                            {m.title} <span className="font-mono normal-case text-slate-500">· {bookDisplay} {formatRange(m)}</span>
                        </p>
                        <ul className="space-y-1.5">
                            {macroUnits.map((u) => (
                                <li
                                    key={u.id}
                                    className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 px-3 py-2"
                                >
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                            {u.suggestedTitle}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                            {bookDisplay} {formatRange(u.syntacticUnit)}
                                        </span>
                                        {strictMode && unitsConfirmedHavePapers && onToggleHasPaper && (
                                            <label className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={unitsConfirmedHavePapers.has(u.id)}
                                                    onChange={() => onToggleHasPaper(u.id)}
                                                    className="h-3 w-3 rounded border-slate-300 dark:border-zinc-700 text-emerald-500 focus:ring-emerald-400"
                                                />
                                                <span>{t('expository.results.micro.hasPaper')}</span>
                                            </label>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                                        <span className="font-medium">{t('expository.results.micro.function')}:</span> {u.functionInArgument}
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 italic mb-1">
                                        {u.centralIdea}
                                    </p>
                                    {u.literarySignals.length > 0 && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            <span className="font-medium">{t('expository.results.micro.signals')}:</span> {u.literarySignals.join('; ')}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}
