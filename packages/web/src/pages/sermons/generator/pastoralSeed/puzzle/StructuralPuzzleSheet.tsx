import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Sparkles, X, Lightbulb, Check, RotateCcw, AlertTriangle, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { pastoralSeedService, type StructuralPuzzle, type StructuralPuzzleRole } from '@dosfilos/application';

interface Props {
    open: boolean;
    passage: string;
    onClose: () => void;
    onComplete: () => void; // called once when the pastor solves the puzzle
}

const ZONES: StructuralPuzzleRole[] = ['preparatory', 'climactic', 'development'];

/**
 * Structured error payloads from the `buildStructuralPuzzle` callable when
 * the passage shape disqualifies the puzzle and the pastor must acotar.
 * Surfaced via `HttpsError.details` so the client can render a tailored
 * "acota tu pasaje" UI instead of a generic failure.
 *
 * - `passage_too_long`: word count of the input string exceeds the limit
 *   (rare in practice; covers passages typed in extenso).
 * - `passage_needs_chapter_verse`: bare-book or chapter-only reference
 *   (e.g. "Filemón", "Génesis 1") that would otherwise let the LLM
 *   silently shift the analysis from clause-structural to macro-rhetorical
 *   without informing the pastor. Allowed exception: short books on the
 *   server whitelist (Filemón / Judas / 2-3 Juan / Abdías).
 */
type PuzzleRefuseError =
    | { code: 'passage_too_long'; wordCount: number; maxWords: number }
    | { code: 'passage_needs_chapter_verse' };

function extractRefuseError(err: unknown): PuzzleRefuseError | null {
    if (!err || typeof err !== 'object') return null;
    const details = (err as { details?: unknown }).details;
    if (!details || typeof details !== 'object') return null;
    const code = (details as { code?: unknown }).code;
    if (code === 'passage_too_long') {
        const wordCount = Number((details as { wordCount?: unknown }).wordCount ?? 0);
        const maxWords = Number((details as { maxWords?: unknown }).maxWords ?? 0);
        return { code: 'passage_too_long', wordCount, maxWords };
    }
    if (code === 'passage_needs_chapter_verse') {
        return { code: 'passage_needs_chapter_verse' };
    }
    return null;
}

/**
 * Phase 2.5 Tier 3 (proposal `structural-puzzle-tier3.md`) — Reconstruct
 * the structural hierarchy of a passage interactively.
 *
 * Pedagogy guarantees:
 *  - System ships SCHOLARSHIP (clauses + roles + hints) — not interpretation.
 *  - Pastor PLACES the pieces; correctness is validated piece by piece.
 *  - On a wrong placement the piece BOUNCES back to the pile + a Socratic
 *    HINT appears — the system NEVER reveals the correct zone.
 *  - Honors P1/P2: pastor still writes the structural note in the step's
 *    textarea after completing the puzzle.
 */
export function StructuralPuzzleSheet({ open, passage, onClose, onComplete }: Props) {
    const { t } = useTranslation('studyDepth');
    const [puzzle, setPuzzle] = useState<StructuralPuzzle | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refuseError, setRefuseError] = useState<PuzzleRefuseError | null>(null);
    const [placements, setPlacements] = useState<Record<string, StructuralPuzzleRole | null>>({});
    const [verifiedCorrect, setVerifiedCorrect] = useState<Set<string>>(new Set());
    const [hint, setHint] = useState<{ clauseId: string; text: string } | null>(null);
    const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
    const [completedOnce, setCompletedOnce] = useState(false);
    const [retryNonce, setRetryNonce] = useState(0);
    /**
     * Override passage typed by the pastor in the length-error UI. Lets him
     * acotar (e.g. from "Filemón" to "Filemón 8-21") without leaving the
     * sheet. Falls back to the prop `passage` when empty.
     */
    const [overridePassage, setOverridePassage] = useState('');
    /**
     * In-flight guard — replaces the previous `loading`/`puzzle` deps that
     * caused an infinite "Preparando…". When `setLoading(true)` fired inside
     * the effect, the deps changed, cleanup set the closure's `cancelled` to
     * true, and the resolved promise then no-op'd both `setPuzzle` and
     * `setLoading(false)`. A ref keeps the guard out of the dep list.
     */
    const fetchInFlightRef = useRef(false);

    // Effective passage = pastor's override (if any) or the prop. The
    // override only matters when the prop passage hit the length guard.
    const effectivePassage = (overridePassage.trim() || passage).trim();

    // Load the puzzle when the sheet opens. `retryNonce` lets the error UI
    // re-trigger this effect without re-mounting the sheet.
    useEffect(() => {
        if (!open || fetchInFlightRef.current) return;
        let cancelled = false;
        fetchInFlightRef.current = true;
        setLoading(true);
        setError(null);
        setRefuseError(null);
        pastoralSeedService
            .buildStructuralPuzzle({ passage: effectivePassage })
            .then((p) => {
                if (cancelled) return;
                setPuzzle(p);
                const init: Record<string, StructuralPuzzleRole | null> = {};
                for (const c of p.clauses) init[c.id] = null;
                setPlacements(init);
                setVerifiedCorrect(new Set());
                setHint(null);
                setSelectedPiece(null);
                setCompletedOnce(false);
            })
            .catch((err) => {
                console.error('[StructuralPuzzleSheet] build failed', err);
                if (cancelled) return;
                const refuse = extractRefuseError(err);
                if (refuse) {
                    setRefuseError(refuse);
                    return;
                }
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg || t('puzzle.error'));
                toast.error(t('puzzle.error'));
            })
            .finally(() => {
                fetchInFlightRef.current = false;
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [open, effectivePassage, retryNonce, t]);

    // Reset state when the sheet closes so a re-open re-fetches fresh.
    useEffect(() => {
        if (!open) {
            setPuzzle(null);
            setPlacements({});
            setVerifiedCorrect(new Set());
            setHint(null);
            setSelectedPiece(null);
            setError(null);
            setRefuseError(null);
            setOverridePassage('');
        }
    }, [open]);

    const pile = useMemo(
        () => (puzzle?.clauses ?? []).filter((c) => placements[c.id] == null),
        [puzzle, placements],
    );
    const placedBy = useMemo(() => {
        const out: Record<StructuralPuzzleRole, string[]> = {
            climactic: [],
            preparatory: [],
            development: [],
        };
        for (const c of puzzle?.clauses ?? []) {
            const role = placements[c.id];
            if (role) out[role].push(c.id);
        }
        return out;
    }, [puzzle, placements]);

    const allPlaced = puzzle ? puzzle.clauses.every((c) => placements[c.id] != null) : false;
    const allCorrect = puzzle ? puzzle.clauses.every((c) => verifiedCorrect.has(c.id)) : false;
    const totalClauses = puzzle?.clauses.length ?? 0;
    const correctCount = verifiedCorrect.size;
    const hasVerifiedOnce = correctCount > 0 || hint !== null;
    /** Did the previous verify pass leave at least one piece bounced back? */
    const hadPartialMiss = hint !== null;
    /** Clause referenced by the hint, for the in-pile ring + inline reference. */
    const hintClause = hint && puzzle ? puzzle.clauses.find((c) => c.id === hint.clauseId) ?? null : null;

    const handleSelectPiece = (id: string) => {
        if (verifiedCorrect.has(id)) return;
        setSelectedPiece((prev) => (prev === id ? null : id));
        setHint(null);
    };

    const handleDropToZone = (zone: StructuralPuzzleRole) => {
        if (!selectedPiece) return;
        if (verifiedCorrect.has(selectedPiece)) return;
        setPlacements((prev) => ({ ...prev, [selectedPiece]: zone }));
        setSelectedPiece(null);
        setHint(null);
    };

    const handleReturnToPile = (id: string) => {
        if (verifiedCorrect.has(id)) return;
        setPlacements((prev) => ({ ...prev, [id]: null }));
        setSelectedPiece(null);
        setHint(null);
    };

    const handleVerify = () => {
        if (!puzzle) return;
        const newCorrect = new Set(verifiedCorrect);
        let firstWrongHint: { clauseId: string; text: string } | null = null;
        const next = { ...placements };
        for (const c of puzzle.clauses) {
            if (verifiedCorrect.has(c.id)) continue;
            const placed = placements[c.id];
            if (!placed) continue;
            const expected = puzzle.roles[c.id];
            if (expected && placed === expected) {
                newCorrect.add(c.id);
            } else {
                next[c.id] = null;
                if (!firstWrongHint) {
                    firstWrongHint = { clauseId: c.id, text: puzzle.hints[c.id] ?? t('puzzle.defaultHint') };
                }
            }
        }
        setVerifiedCorrect(newCorrect);
        setPlacements(next);
        setHint(firstWrongHint);
        // Trigger onComplete exactly once.
        if (!completedOnce && puzzle.clauses.every((c) => newCorrect.has(c.id))) {
            setCompletedOnce(true);
            onComplete();
        }
    };

    return (
        <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-info" />
                        <SheetTitle>{t('puzzle.title')}</SheetTitle>
                    </div>
                    <SheetDescription>{t('puzzle.description')}</SheetDescription>
                </SheetHeader>

                {loading && (
                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" /> <span className="ml-2 text-sm">{t('puzzle.loading')}</span>
                    </div>
                )}

                {!loading && refuseError && (
                    <div className="px-4 py-6 space-y-3">
                        <div className="rounded-md border border-warning/40 bg-warning-subtle p-3">
                            <p className="flex items-center gap-1.5 text-sm font-semibold text-warning-subtle-foreground">
                                <Scissors className="h-4 w-4" />
                                {refuseError.code === 'passage_too_long'
                                    ? t('puzzle.tooLongTitle')
                                    : t('puzzle.needsChapterVerseTitle')}
                            </p>
                            <p className="mt-1 text-xs text-warning-subtle-foreground">
                                {refuseError.code === 'passage_too_long'
                                    ? t('puzzle.tooLongBody', {
                                          wordCount: refuseError.wordCount,
                                          maxWords: refuseError.maxWords,
                                      })
                                    : t('puzzle.needsChapterVerseBody')}
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground" htmlFor="puzzle-acotar-input">
                                {t('puzzle.tooLongInputLabel')}
                            </label>
                            <Input
                                id="puzzle-acotar-input"
                                value={overridePassage}
                                onChange={(e) => setOverridePassage(e.target.value)}
                                placeholder={passage}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && overridePassage.trim()) {
                                        setRetryNonce((n) => n + 1);
                                    }
                                }}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                {refuseError.code === 'passage_too_long'
                                    ? t('puzzle.tooLongInputHint')
                                    : t('puzzle.needsChapterVerseInputHint')}
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                <X className="h-4 w-4" /> {t('puzzle.close')}
                            </Button>
                            <Button
                                size="sm"
                                disabled={!overridePassage.trim()}
                                onClick={() => setRetryNonce((n) => n + 1)}
                            >
                                <RotateCcw className="h-4 w-4" /> {t('puzzle.tooLongRetry')}
                            </Button>
                        </div>
                    </div>
                )}

                {!loading && error && !refuseError && (
                    <div className="px-4 py-6 space-y-3">
                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                            <p className="text-sm font-semibold text-destructive">{t('puzzle.error')}</p>
                            <p className="mt-1 text-xs text-muted-foreground break-words">{error}</p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                <X className="h-4 w-4" /> {t('puzzle.close')}
                            </Button>
                            <Button size="sm" onClick={() => setRetryNonce((n) => n + 1)}>
                                <RotateCcw className="h-4 w-4" /> {t('puzzle.retry')}
                            </Button>
                        </div>
                    </div>
                )}

                {puzzle && !loading && (
                    <div className="px-4 pb-6 space-y-4">
                        {/* Progress badge — surfaces N/M momentum so the pastor
                            sees the correct pieces are locked, not just colored. */}
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground">{t('puzzle.pile')}</p>
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                    allCorrect
                                        ? 'bg-success-subtle text-success-subtle-foreground'
                                        : correctCount > 0
                                        ? 'bg-info-subtle text-info-subtle-foreground'
                                        : 'bg-muted text-muted-foreground',
                                )}
                                title={t('puzzle.progressTitle')}
                            >
                                <Check className="h-3 w-3" />
                                {t('puzzle.progress', { correct: correctCount, total: totalClauses })}
                            </span>
                        </div>

                        <section>
                            <div className="flex flex-wrap gap-2 min-h-[60px] rounded-lg border border-dashed border-border bg-muted/40 p-2">
                                {pile.length === 0 && (
                                    <span className="text-xs text-muted-foreground italic px-1">{t('puzzle.pileEmpty')}</span>
                                )}
                                {pile.map((c) => (
                                    <PuzzlePiece
                                        key={c.id}
                                        text={c.text}
                                        reference={c.reference}
                                        selected={selectedPiece === c.id}
                                        bounced={hint?.clauseId === c.id}
                                        onClick={() => handleSelectPiece(c.id)}
                                    />
                                ))}
                            </div>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {ZONES.map((zone) => (
                                <PuzzleZone
                                    key={zone}
                                    role={zone}
                                    placedIds={placedBy[zone]}
                                    clauses={puzzle.clauses}
                                    verifiedCorrect={verifiedCorrect}
                                    roles={puzzle.roles}
                                    canDrop={Boolean(selectedPiece)}
                                    onDrop={() => handleDropToZone(zone)}
                                    onPieceClick={handleReturnToPile}
                                />
                            ))}
                        </section>

                        {hint && hintClause && (
                            <div className="rounded-md border border-warning/30 bg-warning-subtle p-3">
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-warning-subtle-foreground">
                                    <Lightbulb className="h-3.5 w-3.5" /> {t('puzzle.hintTitleWithRef', { reference: hintClause.reference })}
                                </p>
                                <p className="mt-1 text-[11px] italic text-warning-subtle-foreground/80 break-words">
                                    «{hintClause.text}»
                                </p>
                                <p className="mt-2 text-warning-subtle-foreground text-sm">{hint.text}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                <X className="h-4 w-4" /> {t('puzzle.close')}
                            </Button>
                            <div className="flex items-center gap-2">
                                {allCorrect ? (
                                    <Button size="sm" onClick={onClose}>
                                        <Check className="h-4 w-4" /> {t('puzzle.completeCta')}
                                    </Button>
                                ) : !allPlaced ? (
                                    <Button size="sm" disabled>
                                        {hadPartialMiss ? (
                                            <>
                                                <AlertTriangle className="h-4 w-4" /> {t('puzzle.placeBounced')}
                                            </>
                                        ) : (
                                            <>
                                                <Lightbulb className="h-4 w-4" /> {t('puzzle.placeAll')}
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <Button size="sm" onClick={handleVerify}>
                                        <RotateCcw className="h-4 w-4" />{' '}
                                        {hasVerifiedOnce ? t('puzzle.verifyAgain') : t('puzzle.verify')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

interface PieceProps {
    text: string;
    reference: string;
    selected?: boolean;
    correct?: boolean;
    /** Visual link to the active hint: this is the piece that just bounced. */
    bounced?: boolean;
    onClick?: () => void;
}

function PuzzlePiece({ text, reference, selected, correct, bounced, onClick }: PieceProps) {
    const { t } = useTranslation('studyDepth');
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={correct}
            title={correct ? t('puzzle.lockedTooltip') : undefined}
            className={cn(
                'inline-flex flex-col items-start gap-0.5 max-w-[260px] rounded-md border px-2.5 py-1.5 text-left text-xs transition-all',
                correct
                    ? 'border-success bg-success-subtle text-success-subtle-foreground cursor-default'
                    : bounced
                    ? 'border-warning bg-warning-subtle text-warning-subtle-foreground shadow ring-2 ring-warning/40 animate-pulse'
                    : selected
                    ? 'border-info bg-info-subtle text-info-subtle-foreground shadow ring-2 ring-info/30'
                    : 'border-border bg-card text-foreground hover:border-info/50 hover:bg-info-subtle/30',
            )}
        >
            <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                {correct && <Check className="h-2.5 w-2.5 text-success" />}
                {reference}
            </span>
            <span className="leading-snug">{text}</span>
        </button>
    );
}

interface ZoneProps {
    role: StructuralPuzzleRole;
    placedIds: string[];
    clauses: { id: string; text: string; reference: string }[];
    verifiedCorrect: Set<string>;
    roles: Record<string, StructuralPuzzleRole>;
    canDrop: boolean;
    onDrop: () => void;
    onPieceClick: (id: string) => void;
}

function PuzzleZone({ role, placedIds, clauses, verifiedCorrect, canDrop, onDrop, onPieceClick }: ZoneProps) {
    const { t } = useTranslation('studyDepth');
    return (
        <div
            className={cn(
                'rounded-lg border-2 border-dashed p-3 min-h-[140px] transition-colors',
                canDrop ? 'border-info bg-info-subtle/40 cursor-pointer' : 'border-border bg-card',
            )}
            onClick={canDrop ? onDrop : undefined}
        >
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">
                {t(`puzzle.zone.${role}`)}
            </p>
            <div className="flex flex-col gap-1.5">
                {placedIds.length === 0 && (
                    <span className="text-[11px] text-muted-foreground italic">{t('puzzle.zoneEmpty')}</span>
                )}
                {placedIds.map((id) => {
                    const c = clauses.find((x) => x.id === id);
                    if (!c) return null;
                    return (
                        <div key={id} onClick={(e) => { e.stopPropagation(); onPieceClick(id); }}>
                            <PuzzlePiece text={c.text} reference={c.reference} correct={verifiedCorrect.has(id)} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
