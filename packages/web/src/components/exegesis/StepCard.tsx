import { useState } from 'react';
import {
    Wand2,
    Loader2,
    CheckCircle2,
    RotateCcw,
    Pencil,
    AlertCircle,
    Save,
    X,
    BookOpen,
    Bookmark,
    BookText,
    Layers,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';
import {
    formatPassageReference,
    type ExegeticalStep,
    type SupportedLanguage,
} from '@dosfilos/domain';

interface StepCardProps {
    step: ExegeticalStep;
    paperId: string;
    language: SupportedLanguage;
}

/**
 * One step in the wizard timeline. Renders state-specific UI:
 *
 *   pending          → "Generate" button only
 *   generating       → spinner with "Generating..." label
 *   awaiting-review  → markdown preview + 4 actions (Accept / Regenerate /
 *                      Hint+Regenerate / Edit manually)
 *   accepted         → markdown preview + "Edit" link (no Generate; the
 *                      user can still edit a prior accepted version)
 *   failed           → error banner with "Try again" → goes back to pending
 *
 * Edit mode swaps the preview for a textarea + Save/Cancel buttons.
 *
 * The `state` field is the source of truth — UI never derives state from
 * version count or other heuristics. This keeps the component dumb and
 * the state machine debuggable from inspecting the Firestore doc alone.
 */
export function StepCard({ step, paperId, language }: StepCardProps) {
    const { t } = useTranslation('exegesis');
    const { generateStep, acceptStep, saveStepEdit } = useExegesisPapers();

    const [editing, setEditing] = useState(false);
    const [editDraft, setEditDraft] = useState('');
    const [hintDraft, setHintDraft] = useState('');
    const [hintMode, setHintMode] = useState(false);

    const displayLabel = stepDisplayLabel(step, language, t);
    const previewMarkdown = step.accepted?.markdown ?? step.current?.markdown ?? '';

    const isPending = step.state === 'pending';
    const isGenerating = step.state === 'generating';
    const isReview = step.state === 'awaiting-review';
    const isAccepted = step.state === 'accepted';
    const isFailed = step.state === 'failed';

    const canGenerate = isPending || isFailed;
    const canRegenerate = isReview;
    const showActions = isReview;
    const showAccepted = isAccepted;

    const startEdit = () => {
        setEditDraft(previewMarkdown);
        setEditing(true);
    };

    const cancelEdit = () => {
        setEditDraft('');
        setEditing(false);
    };

    const handleGenerate = async (regenerationHint?: string) => {
        try {
            await generateStep.mutateAsync({ paperId, stepId: step.id, regenerationHint });
            setHintMode(false);
            setHintDraft('');
        } catch (err) {
            console.error('[exegesis] generate failed:', err);
            toast.error(t('detail.steps.toast.generateFailed'));
        }
    };

    const handleAccept = async () => {
        if (!step.current) return;
        try {
            await acceptStep.mutateAsync({ paperId, stepId: step.id, versionId: step.current.id });
            toast.success(t('detail.steps.toast.accepted'));
        } catch (err) {
            console.error('[exegesis] accept failed:', err);
            toast.error(t('detail.steps.toast.acceptFailed'));
        }
    };

    const handleSaveEdit = async () => {
        try {
            await saveStepEdit.mutateAsync({ paperId, stepId: step.id, markdown: editDraft });
            setEditing(false);
            toast.success(t('detail.steps.toast.edited'));
        } catch (err) {
            console.error('[exegesis] saveEdit failed:', err);
            toast.error(t('detail.steps.toast.editFailed'));
        }
    };

    return (
        <article
            className={cn(
                'rounded-2xl border bg-white dark:bg-zinc-900 transition-colors',
                isAccepted ? 'border-emerald-200 dark:border-emerald-900/40' : 'border-slate-200 dark:border-zinc-800'
            )}
        >
            {/* Header */}
            <header className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-zinc-800">
                <StepIcon kind={step.kind} state={step.state} />
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {displayLabel}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t(`detail.steps.state.${step.state}`)}
                        {step.versions.length > 0 ? ` · v${step.versions.length}` : ''}
                    </p>
                </div>
                {isPending && (
                    <Button
                        size="sm"
                        onClick={() => handleGenerate()}
                        disabled={generateStep.isPending}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                    >
                        {generateStep.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
                        {t('detail.steps.action.generate')}
                    </Button>
                )}
                {isFailed && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerate()}
                        disabled={generateStep.isPending}
                        className="border-rose-300 text-rose-700 dark:border-rose-700 dark:text-rose-300"
                    >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        {t('detail.steps.action.retry')}
                    </Button>
                )}
            </header>

            {/* Body — state-aware */}
            <div className="px-5 py-4">
                {isGenerating && (
                    <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('detail.steps.generating')}
                    </div>
                )}

                {isFailed && !isGenerating && (
                    <div className="inline-flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{t('detail.steps.failedHint')}</span>
                    </div>
                )}

                {(isReview || showAccepted) && !editing && previewMarkdown && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {previewMarkdown}
                        </ReactMarkdown>
                    </div>
                )}

                {editing && (
                    <div className="space-y-2">
                        <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            className="w-full min-h-[200px] rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={saveStepEdit.isPending}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                            >
                                {saveStepEdit.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                                {t('detail.steps.action.saveEdit')}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saveStepEdit.isPending}>
                                {t('setup.cancel')}
                            </Button>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-auto">
                                {t('detail.steps.editHint')}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Action bar — only for awaiting-review */}
            {showActions && !editing && (
                <footer className="px-5 py-3 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            onClick={handleAccept}
                            disabled={acceptStep.isPending || !step.current}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                        >
                            {acceptStep.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                            {t('detail.steps.action.accept')}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerate()}
                            disabled={generateStep.isPending}
                        >
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            {t('detail.steps.action.regenerate')}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setHintMode(v => !v)}
                            disabled={generateStep.isPending}
                        >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            {t('detail.steps.action.regenerateWithHint')}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={startEdit}
                            disabled={generateStep.isPending}
                        >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            {t('detail.steps.action.editManual')}
                        </Button>
                    </div>
                    {hintMode && (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={hintDraft}
                                onChange={(e) => setHintDraft(e.target.value)}
                                placeholder={t('detail.steps.hintPlaceholder')}
                                className="flex-1 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && hintDraft.trim()) {
                                        handleGenerate(hintDraft.trim());
                                    }
                                }}
                            />
                            <Button
                                size="sm"
                                onClick={() => hintDraft.trim() && handleGenerate(hintDraft.trim())}
                                disabled={!hintDraft.trim() || generateStep.isPending}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                            >
                                {t('detail.steps.action.applyHint')}
                            </Button>
                            <button
                                type="button"
                                onClick={() => { setHintMode(false); setHintDraft(''); }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                aria-label={t('setup.cancel')}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </footer>
            )}

            {showAccepted && !editing && (
                <footer className="px-5 py-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={startEdit}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300"
                    >
                        <Pencil className="h-3 w-3" />
                        {t('detail.steps.action.editAccepted')}
                    </button>
                </footer>
            )}
        </article>
    );
}

function StepIcon({ kind, state }: { kind: ExegeticalStep['kind']; state: ExegeticalStep['state'] }) {
    const Icon = STEP_ICONS[kind];
    const colorClass = state === 'accepted'
        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
        : state === 'failed'
            ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
            : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400';
    return (
        <div className={cn('shrink-0 w-8 h-8 rounded-full flex items-center justify-center', colorClass)}>
            <Icon className="h-4 w-4" />
        </div>
    );
}

const STEP_ICONS: Record<ExegeticalStep['kind'], typeof BookOpen> = {
    verse: BookOpen,
    conclusion: Bookmark,
    introduction: BookText,
    assembly: Layers,
};

function stepDisplayLabel(
    step: ExegeticalStep,
    language: SupportedLanguage,
    t: (key: string) => string
): string {
    if (step.kind === 'verse' && step.verseRef) {
        return formatPassageReference(step.verseRef, language);
    }
    return t(`detail.steps.kind.${step.kind}`);
}
