import { Check, EyeOff } from 'lucide-react';
import { type FidelityIssue, type FidelityReview, type PreachableUnit } from '@dosfilos/domain';

export function FidelityResult({
    review,
    preachableUnits,
    addressedIssues,
    ignoredIssues,
    onToggleAddressed,
    onToggleIgnored,
    t,
}: {
    review: FidelityReview;
    preachableUnits: ReadonlyArray<PreachableUnit>;
    addressedIssues: Set<number>;
    ignoredIssues: Set<number>;
    onToggleAddressed: (idx: number) => void;
    onToggleIgnored: (idx: number) => void;
    /** `t` con sus parámetros de interpolación: la firma anterior declaraba
     *  un solo argumento y varias llamadas pasan dos, así que mentía. */
    t: (key: string, params?: Record<string, unknown>) => string;
}) {
    const confidencePct = Math.round(review.overallConfidence * 100);
    const confidenceTone = review.overallConfidence >= 0.85
        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30'
        : review.overallConfidence >= 0.7
          ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30'
          : 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/30';

    const unitTitle = (id: string | null) => {
        if (!id) return t('expository.results.fidelity.global') as string;
        const found = preachableUnits.find((u) => u.id === id);
        return found ? found.title : id;
    };

    const totalIssues = review.issues.length;
    const triagedCount = addressedIssues.size + ignoredIssues.size;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-[11px] uppercase tracking-wide font-semibold px-3 py-1 rounded ${confidenceTone}`}>
                    {t('expository.results.fidelity.confidence')}: {confidencePct}%
                </span>
                {totalIssues === 0 && (
                    <span className="text-xs text-emerald-700 dark:text-emerald-300">
                        {t('expository.results.fidelity.noIssues')}
                    </span>
                )}
                {totalIssues > 0 && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('expository.results.fidelity.triagedSummary', {
                            triaged: triagedCount,
                            total: totalIssues,
                        })}
                    </span>
                )}
            </div>
            {totalIssues > 0 && (
                <ul className="space-y-2">
                    {review.issues.map((issue, idx) => (
                        <FidelityIssueRow
                            key={idx}
                            issue={issue}
                            unitLabel={unitTitle(issue.unitId)}
                            isAddressed={addressedIssues.has(idx)}
                            isIgnored={ignoredIssues.has(idx)}
                            onToggleAddressed={() => onToggleAddressed(idx)}
                            onToggleIgnored={() => onToggleIgnored(idx)}
                            t={t}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

export function FidelityIssueRow({
    issue,
    unitLabel,
    isAddressed,
    isIgnored,
    onToggleAddressed,
    onToggleIgnored,
    t,
}: {
    issue: FidelityIssue;
    unitLabel: string;
    isAddressed: boolean;
    isIgnored: boolean;
    onToggleAddressed: () => void;
    onToggleIgnored: () => void;
    /** `t` con sus parámetros de interpolación: la firma anterior declaraba
     *  un solo argumento y varias llamadas pasan dos, así que mentía. */
    t: (key: string, params?: Record<string, unknown>) => string;
}) {
    // Triaged rows mute their severity tone — once acted upon or
    // ignored, they shouldn't visually scream as urgent anymore.
    // Untriaged rows keep their full severity treatment.
    const isTriaged = isAddressed || isIgnored;
    const tone = isTriaged
        ? 'border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/30'
        : issue.severity === 'critical'
          ? 'border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/20'
          : issue.severity === 'warning'
            ? 'border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20'
            : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40';
    const badgeTone = issue.severity === 'critical'
        ? 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/30'
        : issue.severity === 'warning'
          ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30'
          : 'text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-zinc-800';
    const triageBadgeTone = isAddressed
        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30'
        : 'text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-zinc-800';
    const triageBadgeLabel = isAddressed
        ? t('expository.results.fidelity.addressed')
        : t('expository.results.fidelity.ignored');

    return (
        <li className={`rounded-lg border px-3 py-2 transition-colors ${tone} ${isTriaged ? 'opacity-75' : ''}`}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded ${badgeTone}`}>
                    {t(`expository.results.fidelity.severity.${issue.severity}`)}
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{unitLabel}</span>
                {isTriaged && (
                    <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded ${triageBadgeTone}`}>
                        {triageBadgeLabel}
                    </span>
                )}
                <div className="ml-auto flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={onToggleAddressed}
                        aria-pressed={isAddressed}
                        title={t('expository.results.fidelity.toggleAddressed') as string}
                        className={`p-1 rounded text-[11px] transition-colors ${
                            isAddressed
                                ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        }`}
                    >
                        <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onToggleIgnored}
                        aria-pressed={isIgnored}
                        title={t('expository.results.fidelity.toggleIgnored') as string}
                        className={`p-1 rounded text-[11px] transition-colors ${
                            isIgnored
                                ? 'bg-slate-500 text-white hover:bg-slate-400'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800'
                        }`}
                    >
                        <EyeOff className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            <p className={`text-xs ${isTriaged ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-300/60' : 'text-slate-700 dark:text-slate-300'}`}>
                {issue.description}
            </p>
            {issue.recommendation && (
                <p className={`mt-1 text-xs ${isTriaged ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>
                    <span className="font-medium">{t('expository.results.fidelity.recommendation')}:</span> {issue.recommendation}
                </p>
            )}
        </li>
    );
}
