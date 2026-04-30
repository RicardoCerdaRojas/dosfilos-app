import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, BookText, FileStack, FileCheck2, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { PassagePicker } from '@/components/exegesis/PassagePicker';
import { StyleGuideStep } from '@/components/exegesis/StyleGuideStep';
import { SourcesStep, type PendingSource } from '@/components/exegesis/SourcesStep';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';
import type { PassageReference, SupportedLanguage } from '@dosfilos/domain';

/**
 * Setup wizard for a new exegetical paper.
 *
 * Step 1 (passage) and step 2 (style guide) are functional. Step 3
 * (project corpus) renders as a locked placeholder until that flow is
 * built. On submit the paper is created in Firestore with the chosen
 * passage and (optional) style guide; the user is redirected back to
 * the list.
 *
 * styleGuideId remains nullable: the user CAN create a paper without
 * picking a guide (e.g. they want to upload it later). The orchestrator
 * will reject generation for any paper whose styleGuideId is null at
 * the moment it tries to inject the guide into a prompt — that
 * downstream gate is intentionally separate from the setup wizard.
 */
export function ExegesisSetupPage() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('exegesis');
    const { createPaper, addSource } = useExegesisPapers();

    const [passage, setPassage] = useState<PassageReference | null>(null);
    const [passageError, setPassageError] = useState<string | null>(null);
    const [selectedStyleGuideId, setSelectedStyleGuideId] = useState<string | null>(null);
    const [pendingSources, setPendingSources] = useState<PendingSource[]>([]);
    const [attachingSources, setAttachingSources] = useState(false);

    const activeLanguage: SupportedLanguage = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';
    const isCreating = createPaper.isPending || attachingSources;
    const canCreate = !!passage && !isCreating;

    /**
     * Two-phase create:
     *   1. Create the paper (atomic) → returns paperId.
     *   2. Loop pending sources → addSource per row.
     *
     * Done sequentially (not Promise.all) so a failed source doesn't
     * leave the wizard in a half-attached state — the loop bails on
     * first error and the user can retry from the paper detail page
     * (still pending implementation) when that lands.
     */
    const handleCreate = async () => {
        if (!passage) return;
        try {
            const paper = await createPaper.mutateAsync({
                passage,
                displayLanguage: activeLanguage,
                styleGuideId: selectedStyleGuideId,
            });

            if (pendingSources.length > 0) {
                setAttachingSources(true);
                try {
                    for (const s of pendingSources) {
                        await addSource.mutateAsync({
                            paperId: paper.id,
                            corpusId: s.corpusId,
                            sourceType: s.sourceType,
                            displayLabel: s.displayLabel,
                            citationKey: s.citationKey || undefined,
                        });
                    }
                } catch (err) {
                    console.error('[exegesis] attaching sources failed:', err);
                    toast.error(t('setup.sources.toast.attachFailed'));
                    // Paper exists; user can attach the rest from the detail
                    // page later. Still navigate to the list so they see it.
                } finally {
                    setAttachingSources(false);
                }
            }

            toast.success(t('setup.toast.created'));
            navigate('/dashboard/exegesis');
        } catch (err) {
            console.error('[exegesis] create failed:', err);
            toast.error(t('setup.toast.createFailed'));
        }
    };

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

                {/* Step 2 — Style guide */}
                <Step
                    number={2}
                    icon={<FileCheck2 className="h-4 w-4" />}
                    title={t('setup.styleGuide.stepTitle')}
                    subtitle={t('setup.styleGuide.stepSubtitle')}
                    locked={false}
                >
                    <StyleGuideStep
                        selectedGuideId={selectedStyleGuideId}
                        onSelect={setSelectedStyleGuideId}
                    />
                </Step>

                {/* Step 3 — Project corpus */}
                <Step
                    number={3}
                    icon={<FileStack className="h-4 w-4" />}
                    title={t('setup.sources.stepTitle')}
                    subtitle={t('setup.sources.stepSubtitle')}
                    locked={false}
                >
                    <SourcesStep
                        sources={pendingSources}
                        onChange={setPendingSources}
                    />
                </Step>

                {/* Footer actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
                    <Button variant="ghost" onClick={() => navigate('/dashboard/exegesis')}>
                        {t('setup.cancel')}
                    </Button>
                    <Button
                        disabled={!canCreate}
                        onClick={handleCreate}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                    >
                        {isCreating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
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
