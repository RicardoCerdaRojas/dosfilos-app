import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileCheck2, FileStack, ListTree, BookOpen, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useExegesisPaper } from '@/hooks/exegesis/useExegesisPaper';
import { RubricSubStep } from '@/components/exegesis/setup/RubricSubStep';
import { StyleManifestSubStep } from '@/components/exegesis/setup/StyleManifestSubStep';
import { CorpusSubStep } from '@/components/exegesis/setup/CorpusSubStep';
import { StructuralPlanSubStep } from '@/components/exegesis/setup/StructuralPlanSubStep';

/**
 * Rich academic-configuration page for an exegetical paper.
 *
 * Lives at `/dashboard/exegesis/{paperId}/setup`. Reached automatically
 * after `ExegesisCreatePage` saves a new paper, but also accessible
 * later from the paper detail page so the student can iterate on
 * configuration as the work progresses.
 *
 * Four sub-steps, each in its own sub-component:
 *   1. Rubric — upload the seminary's grading sheet OR use the system
 *      default; result is structured + editable. Sets the bar for
 *      what the corpus has to satisfy.
 *   2. Style guide manifest — visual verification of the structured
 *      rules extracted from the user's active style guide. Lets the
 *      student correct mis-extractions before they reach the
 *      orchestrator.
 *   3. Corpus — granular SourceType picker per upload + gap detection
 *      vs the rubric's minimums.
 *   4. Structural plan — per-step source-emphasis with academic
 *      justification, defaulted from the rubric's structural
 *      expectations.
 *
 * Sub-steps are independent; the student can jump between them. The
 * "Generate" CTA at the bottom of step 4 redirects to the paper
 * detail page where the wizard runs.
 */
type SubStepKey = 'rubric' | 'manifest' | 'corpus' | 'plan';

const SUB_STEPS: ReadonlyArray<{ key: SubStepKey; iconKey: string }> = [
    { key: 'rubric', iconKey: 'FileCheck2' },
    { key: 'manifest', iconKey: 'BookOpen' },
    { key: 'corpus', iconKey: 'FileStack' },
    { key: 'plan', iconKey: 'ListTree' },
];

export function ExegesisPaperSetupPage() {
    const { paperId } = useParams<{ paperId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation('exegesis');
    const { paper, isLoading, error } = useExegesisPaper(paperId);
    const [activeKey, setActiveKey] = useState<SubStepKey>('rubric');

    if (!paperId) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('paperSetup.loading')}
            </div>
        );
    }

    if (error || !paper) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-12 text-center">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
                    {t('paperSetup.notFound.title')}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {t('paperSetup.notFound.body')}
                </p>
                <Button onClick={() => navigate('/dashboard/exegesis')}>
                    {t('paperSetup.notFound.backCta')}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 font-sans overflow-y-auto">
            <header className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center gap-3">
                    <Link
                        to={`/dashboard/exegesis/${paperId}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        aria-label={t('paperSetup.backToPaper')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 font-serif truncate">
                            {paper.title || t('paperSetup.untitledFallback')}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('paperSetup.subtitle')}
                        </p>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl w-full mx-auto px-6 py-6">
                <nav className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                    {SUB_STEPS.map((s, idx) => (
                        <SubStepTab
                            key={s.key}
                            index={idx + 1}
                            label={t(`paperSetup.subSteps.${s.key}.tab`)}
                            iconKey={s.iconKey}
                            active={activeKey === s.key}
                            onClick={() => setActiveKey(s.key)}
                        />
                    ))}
                </nav>

                <main className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6">
                    {activeKey === 'rubric' && <RubricSubStep paper={paper} />}
                    {activeKey === 'manifest' && <StyleManifestSubStep paper={paper} />}
                    {activeKey === 'corpus' && <CorpusSubStep paper={paper} />}
                    {activeKey === 'plan' && <StructuralPlanSubStep paper={paper} />}
                </main>

                <footer className="flex items-center justify-end pt-6">
                    <Button
                        onClick={() => navigate(`/dashboard/exegesis/${paperId}`)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                    >
                        {t('paperSetup.goToPaper')}
                    </Button>
                </footer>
            </div>
        </div>
    );
}

interface SubStepTabProps {
    index: number;
    label: string;
    iconKey: string;
    active: boolean;
    onClick: () => void;
}

function SubStepTab({ index, label, iconKey, active, onClick }: SubStepTabProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors text-left',
                active
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800',
            ].join(' ')}
        >
            <span className={[
                'shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold',
                active
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400',
            ].join(' ')}>
                {index}
            </span>
            <span className="text-sm font-medium truncate">{label}</span>
            <SubStepIcon iconKey={iconKey} active={active} />
        </button>
    );
}

function SubStepIcon({ iconKey, active }: { iconKey: string; active: boolean }) {
    const className = [
        'h-3.5 w-3.5 ml-auto shrink-0',
        active ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400',
    ].join(' ');
    switch (iconKey) {
        case 'FileCheck2': return <FileCheck2 className={className} />;
        case 'BookOpen': return <BookOpen className={className} />;
        case 'FileStack': return <FileStack className={className} />;
        case 'ListTree': return <ListTree className={className} />;
        default: return <Lock className={className} />;
    }
}
