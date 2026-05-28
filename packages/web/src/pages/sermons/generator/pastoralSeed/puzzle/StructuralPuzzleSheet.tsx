import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Sparkles, X, Lightbulb, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
    const [placements, setPlacements] = useState<Record<string, StructuralPuzzleRole | null>>({});
    const [verifiedCorrect, setVerifiedCorrect] = useState<Set<string>>(new Set());
    const [hint, setHint] = useState<{ clauseId: string; text: string } | null>(null);
    const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
    const [completedOnce, setCompletedOnce] = useState(false);
    const [retryNonce, setRetryNonce] = useState(0);
    /**
     * In-flight guard — replaces the previous `loading`/`puzzle` deps that
     * caused an infinite "Preparando…". When `setLoading(true)` fired inside
     * the effect, the deps changed, cleanup set the closure's `cancelled` to
     * true, and the resolved promise then no-op'd both `setPuzzle` and
     * `setLoading(false)`. A ref keeps the guard out of the dep list.
     */
    const fetchInFlightRef = useRef(false);

    // Load the puzzle when the sheet opens. `retryNonce` lets the error UI
    // re-trigger this effect without re-mounting the sheet.
    useEffect(() => {
        if (!open || fetchInFlightRef.current) return;
        let cancelled = false;
        fetchInFlightRef.current = true;
        setLoading(true);
        setError(null);
        pastoralSeedService
            .buildStructuralPuzzle({ passage })
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
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg || t('puzzle.error'));
                toast.error(t('puzzle.error'));
            })
            .finally(() => {
                fetchInFlightRef.current = false;
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [open, passage, retryNonce, t]);

    // Reset state when the sheet closes so a re-open re-fetches fresh.
    useEffect(() => {
        if (!open) {
            setPuzzle(null);
            setPlacements({});
            setVerifiedCorrect(new Set());
            setHint(null);
            setSelectedPiece(null);
            setError(null);
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

                {!loading && error && (
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
                        <section>
                            <p className="text-xs font-semibold text-foreground mb-1.5">{t('puzzle.pile')}</p>
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

                        {hint && (
                            <div className="rounded-md border border-warning/30 bg-warning-subtle p-3">
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-warning-subtle-foreground">
                                    <Lightbulb className="h-3.5 w-3.5" /> {t('puzzle.hintTitle')}
                                </p>
                                <p className="mt-1 text-warning-subtle-foreground text-sm">{hint.text}</p>
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
                                ) : (
                                    <Button size="sm" onClick={handleVerify} disabled={!allPlaced}>
                                        <RotateCcw className="h-4 w-4" /> {t('puzzle.verify')}
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
    onClick?: () => void;
}

function PuzzlePiece({ text, reference, selected, correct, onClick }: PieceProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={correct}
            className={cn(
                'inline-flex flex-col items-start gap-0.5 max-w-[260px] rounded-md border px-2.5 py-1.5 text-left text-xs transition-all',
                correct
                    ? 'border-success bg-success-subtle text-success-subtle-foreground cursor-default'
                    : selected
                    ? 'border-info bg-info-subtle text-info-subtle-foreground shadow ring-2 ring-info/30'
                    : 'border-border bg-card text-foreground hover:border-info/50 hover:bg-info-subtle/30',
            )}
        >
            <span className="text-[10px] font-mono text-muted-foreground">{reference}</span>
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
