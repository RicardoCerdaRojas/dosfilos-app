import { useState, useEffect } from 'react';
import {
    Loader2, Plus, Trash2, BookOpen, Sparkles,
    FileText, ChevronRight, ChevronLeft, Mic
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from '@/i18n';
import {
    type SermonPersonalization,
    type SermonTone,
    SERMON_TONE_LABELS,
} from '@dosfilos/domain';

export interface SermonOutline {
    title: string;
    passage: string;
    proposition: string;
    points: { title: string; verses: string }[];
}

/**
 * Post-convergence (2026-05-19) the modal no longer creates the sermon
 * doc directly + writes raw markdown to the Faculty editor. It hands
 * the approved outline + personalization to `buildSermonFromFacultyOutline`
 * (Application layer), which generates the full sermon, builds a
 * `wizardProgress` snapshot, and persists a `Sermon` ready for the
 * wizard at Step 3 (Redacción).
 *
 * The legacy header-stripping + `createSermon` logic moved into the
 * use case so the modal stays a pure UX shell.
 */

interface SermonOutlinePreviewModalProps {
    outline: SermonOutline | null;
    sessionId?: string;  // ID of the faculty session that originated this sermon
    onClose: () => void;
    /**
     * Generates the full sermon + persists everything (Sermon doc +
     * extraction mirror + wizardProgress). Returns the new sermon id
     * so the parent can navigate to the wizard.
     */
    onGenerateFullSermon: (
        approvedOutline: SermonOutline,
        personalization?: SermonPersonalization,
    ) => Promise<{ sermonId: string }>;
    /**
     * Optional post-success hook. Receives the new sermon id so the
     * parent can navigate, refresh extraction list, fire telemetry, etc.
     */
    onSuccess?: (sermonId: string) => void;
}

type Phase = 'preview' | 'personalize' | 'generating';

const TONE_OPTIONS: { value: SermonTone; emoji: string }[] = [
    { value: 'doxological', emoji: '🙌' },
    { value: 'pastoral', emoji: '🤝' },
    { value: 'confrontational', emoji: '⚡' },
    { value: 'didactic', emoji: '📖' },
    { value: 'evangelistic', emoji: '📢' },
];

export function SermonOutlinePreviewModal({
    outline,
    onClose,
    onGenerateFullSermon,
    onSuccess,
}: SermonOutlinePreviewModalProps) {
    const { user } = useFirebase();
    const { t } = useTranslation('faculty');

    const [phase, setPhase] = useState<Phase>('preview');
    const [edited, setEdited] = useState<SermonOutline>({
        title: '', passage: '', proposition: '', points: []
    });
    const [personalization, setPersonalization] = useState<SermonPersonalization>({});

    // Sync edited state whenever the outline prop changes (e.g., when it arrives from AI)
    useEffect(() => {
        if (outline) {
            setEdited(outline);
            setPhase('preview');
            setPersonalization({});
        }
    }, [outline]);

    const handleOpen = (open: boolean) => {
        if (!open && phase !== 'generating') onClose();
    };

    const updatePoint = (idx: number, field: 'title' | 'verses', value: string) => {
        setEdited(prev => ({
            ...prev,
            points: prev.points.map((p, i) => i === idx ? { ...p, [field]: value } : p)
        }));
    };

    const addPoint = () => {
        setEdited(prev => ({
            ...prev,
            points: [...prev.points, { title: '', verses: '' }]
        }));
    };

    const removePoint = (idx: number) => {
        setEdited(prev => ({
            ...prev,
            points: prev.points.filter((_, i) => i !== idx)
        }));
    };

    const updatePersonalization = <K extends keyof SermonPersonalization>(
        key: K, value: SermonPersonalization[K]
    ) => {
        setPersonalization(prev => ({ ...prev, [key]: value }));
    };

    const handleGenerate = async () => {
        if (!user) return;
        setPhase('generating');
        try {
            // Only pass personalization if at least one field is populated.
            const hasPersonalization = Object.values(personalization).some(
                v => v !== undefined && v !== ''
            );
            const result = await onGenerateFullSermon(
                edited,
                hasPersonalization ? personalization : undefined,
            );

            if (onSuccess) {
                onSuccess(result.sermonId);
            }
            onClose();
        } catch (error) {
            console.error('Error generating sermon:', error);
            setPhase('personalize');
        }
    };

    const canGenerate = edited.title.trim() && edited.proposition.trim() && edited.points.length > 0;

    return (
        <Dialog open={!!outline} onOpenChange={handleOpen}>
            <DialogContent className="max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden" style={{ maxWidth: '680px', width: '95vw' }}>
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-900 dark:text-emerald-100">
                        {phase === 'preview' && (
                            <><FileText className="h-4 w-4" /> {t('sermonOutlineModal.phases.previewTitle')}</>
                        )}
                        {phase === 'personalize' && (
                            <><Mic className="h-4 w-4" /> {t('sermonOutlineModal.phases.personalizeTitle')}</>
                        )}
                        {phase === 'generating' && (
                            <><Sparkles className="h-4 w-4 animate-pulse" /> {t('sermonOutlineModal.phases.generatingTitle')}</>
                        )}
                    </DialogTitle>
                    {phase === 'preview' && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                            {t('sermonOutlineModal.phases.previewHint')}
                        </p>
                    )}
                    {phase === 'personalize' && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                            {t('sermonOutlineModal.phases.personalizeHint')}
                        </p>
                    )}

                    {/* Step indicator for preview & personalize */}
                    {phase !== 'generating' && (
                        <div className="flex items-center gap-2 mt-2">
                            <StepIndicator step={1} label={t('sermonOutlineModal.stepIndicator.outline') as string} active={phase === 'preview'} completed={phase === 'personalize'} />
                            <div className="h-px flex-1 bg-emerald-200 dark:bg-emerald-800" />
                            <StepIndicator step={2} label={t('sermonOutlineModal.stepIndicator.voice') as string} active={phase === 'personalize'} completed={false} />
                        </div>
                    )}
                </DialogHeader>

                {/* ===== Phase: Preview (Outline Editing) ===== */}
                {phase === 'preview' && (
                    <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('sermonOutlineModal.fields.title')}</Label>
                            <Input
                                value={edited.title}
                                onChange={e => setEdited(p => ({ ...p, title: e.target.value }))}
                                placeholder={t('sermonOutlineModal.fields.titlePlaceholder') as string}
                                className="font-semibold text-foreground"
                            />
                        </div>

                        {/* Passage */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-1">
                                <BookOpen className="h-3 w-3" /> {t('sermonOutlineModal.fields.passage')}
                            </Label>
                            <Input
                                value={edited.passage}
                                onChange={e => setEdited(p => ({ ...p, passage: e.target.value }))}
                                placeholder={t('sermonOutlineModal.fields.passagePlaceholder') as string}
                            />
                        </div>

                        {/* Proposition */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('sermonOutlineModal.fields.proposition')}</Label>
                            <Textarea
                                value={edited.proposition}
                                onChange={e => setEdited(p => ({ ...p, proposition: e.target.value }))}
                                placeholder={t('sermonOutlineModal.fields.propositionPlaceholder') as string}
                                className="resize-none text-sm leading-relaxed"
                                rows={3}
                            />
                        </div>

                        {/* Points */}
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {t('sermonOutlineModal.fields.points', { count: edited.points.length })}
                            </Label>
                            {edited.points.length === 0 && (
                                <p className="text-sm text-muted-foreground italic py-2">{t('sermonOutlineModal.fields.pointsEmpty')}</p>
                            )}
                            {edited.points.map((point, idx) => (
                                <div key={idx} className="flex gap-2.5 items-start p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mt-0.5">
                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                            {['I', 'II', 'III', 'IV', 'V'][idx] ?? idx + 1}
                                        </span>
                                    </div>
                                    <div className="flex-1 flex gap-2 min-w-0">
                                        <Input
                                            value={point.title}
                                            onChange={e => updatePoint(idx, 'title', e.target.value)}
                                            placeholder={t('sermonOutlineModal.fields.pointTitlePlaceholder') as string}
                                            className="text-sm flex-1 min-w-0"
                                        />
                                        <Input
                                            value={point.verses}
                                            onChange={e => updatePoint(idx, 'verses', e.target.value)}
                                            placeholder={t('sermonOutlineModal.fields.pointVersesPlaceholder') as string}
                                            className="text-sm text-muted-foreground shrink-0"
                                            style={{ width: '100px' }}
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-0.5 shrink-0"
                                        onClick={() => removePoint(idx)}
                                        aria-label={t('sermonOutlineModal.fields.removePoint') as string}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                            <button
                                onClick={addPoint}
                                className="w-full py-2 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-700 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" /> {t('sermonOutlineModal.fields.addPoint')}
                            </button>
                        </div>
                    </div>
                )}

                {/* ===== Phase: Personalize (Co-Authoring) ===== */}
                {phase === 'personalize' && (
                    <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                        {/* Tone selector */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {t('sermonOutlineModal.fields.tone')}
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {TONE_OPTIONS.map(({ value, emoji }) => {
                                    const isSelected = personalization.tone === value;
                                    return (
                                        <button
                                            key={value}
                                            onClick={() => updatePersonalization('tone', isSelected ? undefined : value)}
                                            className={`
                                                px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                                                ${isSelected
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200 shadow-sm'
                                                    : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60 hover:border-muted-foreground/30'
                                                }
                                            `}
                                        >
                                            {emoji} {SERMON_TONE_LABELS[value].split(' — ')[0]}
                                        </button>
                                    );
                                })}
                            </div>
                            {personalization.tone && (
                                <p className="text-xs text-muted-foreground italic pl-1">
                                    {SERMON_TONE_LABELS[personalization.tone]}
                                </p>
                            )}
                        </div>

                        {/* Situational context */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {t('sermonOutlineModal.fields.situationalContext')}
                            </Label>
                            <Textarea
                                value={personalization.situationalContext ?? ''}
                                onChange={e => updatePersonalization('situationalContext', e.target.value)}
                                placeholder={t('sermonOutlineModal.fields.situationalContextPlaceholder') as string}
                                className="resize-none text-sm"
                                rows={2}
                            />
                        </div>

                        {/* Congregation description */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {t('sermonOutlineModal.fields.congregation')}
                            </Label>
                            <Input
                                value={personalization.congregationDescription ?? ''}
                                onChange={e => updatePersonalization('congregationDescription', e.target.value)}
                                placeholder={t('sermonOutlineModal.fields.congregationPlaceholder') as string}
                                className="text-sm"
                            />
                        </div>

                        {/* Pastoral emphasis */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {t('sermonOutlineModal.fields.pastoralEmphasis')}
                            </Label>
                            <Textarea
                                value={personalization.pastoralEmphasis ?? ''}
                                onChange={e => updatePersonalization('pastoralEmphasis', e.target.value)}
                                placeholder={t('sermonOutlineModal.fields.pastoralEmphasisPlaceholder') as string}
                                className="resize-none text-sm"
                                rows={2}
                            />
                        </div>

                        {/* Illustrations */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {t('sermonOutlineModal.fields.illustrations')}
                            </Label>
                            <Textarea
                                value={personalization.illustrations ?? ''}
                                onChange={e => updatePersonalization('illustrations', e.target.value)}
                                placeholder={t('sermonOutlineModal.fields.illustrationsPlaceholder') as string}
                                className="resize-none text-sm"
                                rows={3}
                            />
                        </div>

                        {/* Preacher notes */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {t('sermonOutlineModal.fields.preacherNotes')}
                            </Label>
                            <Textarea
                                value={personalization.preacherNotes ?? ''}
                                onChange={e => updatePersonalization('preacherNotes', e.target.value)}
                                placeholder={t('sermonOutlineModal.fields.preacherNotesPlaceholder') as string}
                                className="resize-none text-sm"
                                rows={3}
                            />
                        </div>

                        {/* Skip hint */}
                        <p className="text-xs text-muted-foreground text-center italic">
                            {t('sermonOutlineModal.fields.personalizeOptional')}
                        </p>
                    </div>
                )}

                {/* ===== Phase: Generating ===== */}
                {phase === 'generating' && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12 px-6 text-center">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                            </div>
                            <Sparkles className="h-5 w-5 text-emerald-400 absolute -top-1 -right-1" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-foreground">{t('sermonOutlineModal.generating.headline')}</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                                {t('sermonOutlineModal.generating.subhead')}
                            </p>
                        </div>
                        <div className="w-full p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900 text-left">
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 uppercase tracking-wide">{t('sermonOutlineModal.generating.propositionLabel')}</p>
                            <p className="text-sm text-emerald-900 dark:text-emerald-200 italic leading-relaxed">&ldquo;{edited.proposition}&rdquo;</p>
                            <ul className="mt-3 space-y-1">
                                {edited.points.map((p, i) => (
                                    <li key={i} className="text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-1.5">
                                        <span className="font-bold shrink-0">{['I', 'II', 'III', 'IV', 'V'][i]}.</span>
                                        <span>{p.title} <span className="text-emerald-500">({p.verses})</span></span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* ===== Footer ===== */}
                {phase === 'preview' && (
                    <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex gap-2">
                        <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
                            {t('sermonOutlineModal.actions.cancel')}
                        </Button>
                        <Button
                            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            onClick={() => setPhase('personalize')}
                            disabled={!canGenerate}
                        >
                            {t('sermonOutlineModal.actions.continue')}
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </DialogFooter>
                )}

                {phase === 'personalize' && (
                    <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setPhase('preview')}
                            className="text-muted-foreground gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            {t('sermonOutlineModal.actions.back')}
                        </Button>
                        <Button
                            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                        >
                            <Sparkles className="h-4 w-4" />
                            {t('sermonOutlineModal.actions.generateFull')}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* ─── Step Indicator ─── */

function StepIndicator({ step, label, active, completed }: {
    step: number;
    label: string;
    active: boolean;
    completed: boolean;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <div className={`
                w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors
                ${active
                    ? 'bg-emerald-600 text-white'
                    : completed
                        ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground'
                }
            `}>
                {completed ? '✓' : step}
            </div>
            <span className={`text-xs font-medium ${active ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                {label}
            </span>
        </div>
    );
}
