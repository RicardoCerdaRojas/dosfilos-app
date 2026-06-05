import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, FileText, Loader2, Scale, ShieldQuestion } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
    CONTRA_SCAN_NOTE_MIN_CHARS,
    CONTRA_SCAN_OVERRIDE_MIN_CHARS,
    type DissentingChunk,
} from '@dosfilos/domain';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The pastor's central idea — shown so the contrast with the library is explicit. */
    centralIdea: string;
    /** Dissenting chunks surfaced by the scan (empty ⇒ no-dissent mode). */
    dissentingChunks: DissentingChunk[];
    /** Persist + publish in flight. */
    publishing: boolean;
    /** No dissent — pastor proceeds. */
    onProceed: () => void;
    /** Pastor engaged a dissenting chunk with a note (≥ min chars). */
    onConsider: (chunkId: string, note: string) => void;
    /** Pastor proceeds past the soft-block with a justification (audit). */
    onOverride: (reason: string) => void;
}

/**
 * Phase 4 PR 1 (ADR-033) — pre-publish contra-scan confrontation (P3, Acts
 * 20:27). Surfaces library chunks that DISSENT from the pastor's central idea
 * so he engages the opposing position before preaching.
 *
 *  - dissent found → the pastor must record a consideration note on one
 *    dissenting chunk (≥ `CONTRA_SCAN_NOTE_MIN_CHARS`) OR override with a
 *    justification (≥ `CONTRA_SCAN_OVERRIDE_MIN_CHARS`, audit-logged).
 *  - no dissent     → an honest "no contrary positions in your library" notice
 *    + an invite to add diverse sources, then a plain publish. Never invents a
 *    dissent to manufacture confrontation (ADR-031).
 */
export function ContraScanModal({
    open,
    onOpenChange,
    centralIdea,
    dissentingChunks,
    publishing,
    onProceed,
    onConsider,
    onOverride,
}: Props) {
    const { t } = useTranslation('sermonDetail');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [overrideMode, setOverrideMode] = useState(false);
    const [overrideReason, setOverrideReason] = useState('');

    const hasDissent = dissentingChunks.length > 0;
    const noteOk = note.trim().length >= CONTRA_SCAN_NOTE_MIN_CHARS;
    const overrideOk = overrideReason.trim().length >= CONTRA_SCAN_OVERRIDE_MIN_CHARS;

    // ── No-dissent mode ──────────────────────────────────────────────────
    if (!hasDissent) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldQuestion className="h-5 w-5 text-muted-foreground" />
                            {t('contraScan.noDissent.title')}
                        </DialogTitle>
                        <DialogDescription>{t('contraScan.noDissent.description')}</DialogDescription>
                    </DialogHeader>
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        {t('contraScan.noDissent.invite')}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>
                            {t('contraScan.cancel')}
                        </Button>
                        <Button onClick={onProceed} disabled={publishing}>
                            {publishing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('contraScan.publishing')}
                                </>
                            ) : (
                                t('contraScan.publish')
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // ── Dissent mode ─────────────────────────────────────────────────────
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        {t('contraScan.dissent.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('contraScan.dissent.description', { count: dissentingChunks.length })}
                    </DialogDescription>
                </DialogHeader>

                {/* Your central idea — anchors the contrast so the pastor sees
                    exactly what the library pushes back against. */}
                <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                    <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        <FileText className="h-3.5 w-3.5" />
                        {t('contraScan.yourIdea.label')}
                    </p>
                    <p className="text-sm text-foreground">{centralIdea}</p>
                </div>

                {!overrideMode && (
                    <p className="text-xs font-medium text-muted-foreground">
                        {t('contraScan.dissent.step', { count: dissentingChunks.length })}
                    </p>
                )}

                <div className="max-h-[34vh] space-y-2 overflow-y-auto pr-1">
                    {dissentingChunks.map((c) => {
                        const selected = selectedId === c.chunkId;
                        return (
                            <button
                                key={c.chunkId}
                                type="button"
                                onClick={() => setSelectedId(selected ? null : c.chunkId)}
                                disabled={publishing || overrideMode}
                                className={cn(
                                    'w-full rounded-md border px-3 py-2.5 text-left transition-colors',
                                    selected
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                                        : 'border-border hover:border-primary/40',
                                    (publishing || overrideMode) && 'opacity-60',
                                )}
                            >
                                {/* Source provenance — this is FROM the library. */}
                                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                                    <span className="font-medium text-foreground/80">{c.resourceAuthor}</span>
                                    <span>— «{c.resourceTitle}»</span>
                                    {c.page !== undefined && <span>· {t('contraScan.page', { page: c.page })}</span>}
                                    <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px]">
                                        {c.fromPersonalLibrary
                                            ? t('contraScan.personalBadge')
                                            : t('contraScan.coreBadge')}
                                    </span>
                                </div>
                                {/* The tension — what this source disputes in your idea. */}
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-warning-subtle-foreground">
                                    {t('contraScan.tensionLabel')}
                                </p>
                                <p className="text-sm font-medium text-foreground">{c.tension}</p>
                                {/* The verbatim source quote backing the tension. */}
                                <p className="mt-1.5 border-l-2 border-border pl-2 text-[11px] italic text-muted-foreground line-clamp-3">
                                    {c.excerpt}
                                </p>
                                {selected && (
                                    <p className="mt-1.5 text-[11px] font-medium text-primary">
                                        {t('contraScan.selectedHint')}
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>

                {!overrideMode && selectedId && (
                    <div className="space-y-1.5">
                        <Label htmlFor="contra-scan-note">{t('contraScan.note.label')}</Label>
                        <p className="text-[11px] text-muted-foreground">{t('contraScan.note.hint')}</p>
                        <Textarea
                            id="contra-scan-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t('contraScan.note.placeholder', { min: CONTRA_SCAN_NOTE_MIN_CHARS })}
                            disabled={publishing}
                            rows={4}
                        />
                        <div className="text-right text-xs">
                            <span className={cn(noteOk ? 'text-success-subtle-foreground' : 'text-muted-foreground')}>
                                {t('contraScan.note.counter', {
                                    count: note.trim().length,
                                    min: CONTRA_SCAN_NOTE_MIN_CHARS,
                                })}
                            </span>
                        </div>
                    </div>
                )}

                {overrideMode && (
                    <div className="space-y-1.5">
                        <Label htmlFor="contra-scan-override">{t('contraScan.override.label')}</Label>
                        <Textarea
                            id="contra-scan-override"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder={t('contraScan.override.placeholder', { min: CONTRA_SCAN_OVERRIDE_MIN_CHARS })}
                            disabled={publishing}
                            rows={4}
                        />
                        <div className="text-right text-xs">
                            <span className={cn(overrideOk ? 'text-success-subtle-foreground' : 'text-muted-foreground')}>
                                {t('contraScan.override.counter', {
                                    count: overrideReason.trim().length,
                                    min: CONTRA_SCAN_OVERRIDE_MIN_CHARS,
                                })}
                            </span>
                        </div>
                    </div>
                )}

                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() => setOverrideMode((v) => !v)}
                        disabled={publishing}
                    >
                        {overrideMode ? t('contraScan.override.back') : t('contraScan.override.toggle')}
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>
                            {t('contraScan.cancel')}
                        </Button>
                        {overrideMode ? (
                            <Button
                                className="bg-warning text-warning-foreground hover:bg-warning/90"
                                onClick={() => onOverride(overrideReason.trim())}
                                disabled={!overrideOk || publishing}
                            >
                                {publishing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('contraScan.publishing')}
                                    </>
                                ) : (
                                    t('contraScan.override.publish')
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={() => selectedId && onConsider(selectedId, note.trim())}
                                disabled={!selectedId || !noteOk || publishing}
                            >
                                {publishing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('contraScan.publishing')}
                                    </>
                                ) : (
                                    t('contraScan.consider.publish')
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
