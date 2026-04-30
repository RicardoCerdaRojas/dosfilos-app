import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookText, FileStack, FileCheck2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { PassagePicker } from '@/components/exegesis/PassagePicker';
import type { PassageReference } from '@dosfilos/domain';

/**
 * Setup wizard for a new exegetical paper.
 *
 * v1 thin slice: only step 1 (passage) is functional. The other steps
 * (style guide, project corpus) render as locked placeholders so the user
 * sees the wizard's full shape and we can wire each in subsequent commits
 * without introducing dead UI later.
 *
 * State for v1 lives in `useState`; the "Crear" button currently doesn't
 * persist anywhere. Persistence to Firestore lands in the next pass when
 * the repository implementations exist.
 */
export function ExegesisSetupPage() {
    const navigate = useNavigate();
    const { t } = useTranslation('exegesis');

    const [passage, setPassage] = useState<PassageReference | null>(null);
    const [passageError, setPassageError] = useState<string | null>(null);

    const canCreate = !!passage;

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 font-sans overflow-y-auto">
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                <div className="max-w-3xl mx-auto flex items-center gap-3">
                    <Link
                        to="/dashboard/exegesis"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        aria-label={t('setup.backToList')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 font-serif">
                            {t('setup.title')}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('setup.subtitle')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 space-y-6">
                {/* Step 1 — Passage */}
                <Step
                    number={1}
                    icon={<BookText className="h-4 w-4" />}
                    title={t('setup.passage.stepTitle')}
                    subtitle={t('setup.passage.stepSubtitle')}
                    locked={false}
                >
                    <PassagePicker
                        value={passage}
                        onChange={(ref, err) => {
                            setPassage(ref);
                            setPassageError(err?.hint ?? null);
                        }}
                    />
                </Step>

                {/* Step 2 — Style guide (locked placeholder) */}
                <Step
                    number={2}
                    icon={<FileCheck2 className="h-4 w-4" />}
                    title={t('setup.styleGuide.stepTitle')}
                    subtitle={t('setup.styleGuide.stepSubtitle')}
                    locked
                >
                    <div className="rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/40 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {t('setup.styleGuide.placeholder')}
                    </div>
                </Step>

                {/* Step 3 — Sources (locked placeholder) */}
                <Step
                    number={3}
                    icon={<FileStack className="h-4 w-4" />}
                    title={t('setup.sources.stepTitle')}
                    subtitle={t('setup.sources.stepSubtitle')}
                    locked
                >
                    <div className="rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/40 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {t('setup.sources.placeholder')}
                    </div>
                </Step>

                {/* Footer actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
                    <Button variant="ghost" onClick={() => navigate('/dashboard/exegesis')}>
                        {t('setup.cancel')}
                    </Button>
                    <Button
                        disabled={!canCreate}
                        onClick={() => {
                            // Persistence to Firestore lands once the repos exist.
                            // For now the click is a no-op so users see the wizard
                            // and the validated passage roundtrip works end-to-end.
                            console.log('[exegesis] would create paper with:', passage);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                    >
                        {t('setup.create')}
                    </Button>
                </div>

                {passageError && !passage && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 -mt-3">
                        {passageError}
                    </p>
                )}
            </main>
        </div>
    );
}

interface StepProps {
    number: number;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    locked: boolean;
    children: React.ReactNode;
}

function Step({ number, icon, title, subtitle, locked, children }: StepProps) {
    return (
        <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <header className="flex items-start gap-3 mb-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-semibold">
                    {number}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 dark:text-slate-400">{icon}</span>
                        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                            {title}
                        </h2>
                        {locked && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-zinc-800 rounded-full px-2 py-0.5">
                                <Lock className="h-3 w-3" />
                                v1.5
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
                </div>
            </header>
            <div className={locked ? 'opacity-60 pointer-events-none' : undefined}>
                {children}
            </div>
        </section>
    );
}
