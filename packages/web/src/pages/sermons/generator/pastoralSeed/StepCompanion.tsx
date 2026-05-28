import { useState } from 'react';
import { Sparkles, Loader2, X, AlertTriangle, Info, BookOpen, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { OrientStudyInput, StepOrientation } from '@dosfilos/application';

interface Props {
    passage: string;
    stepKey: OrientStudyInput['stepKey'];
    /** The pastor's current draft for this step (lets the companion confront method errors). */
    pastorInput: string;
    /** Confirmed genre, if known — sharpens orientation. */
    genre?: string;
    orient: (input: OrientStudyInput) => Promise<StepOrientation>;
    /** Logs the assist as `stepOrientation` (ADR-026 / AiAssistLog). */
    onLogOrientation: () => void;
}

/**
 * Phase 2.5 (ADR-026) — Study Companion, Moment 1 (per-step orientation).
 *
 * Pull-first: the pastor clicks "Pedir orientación". The companion returns
 * data + Socratic questions (and, on a method error, a confrontation) — it
 * NEVER writes the pastor's answer.
 *
 * Surfaced as a Radix Popover anchored to the trigger button: rises above
 * with a soft animation, portal-rendered, click-outside to dismiss. Keeps
 * the step's writing surface clean (no inline card pushing content down).
 */
export function StepCompanion({ passage, stepKey, pastorInput, genre, orient, onLogOrientation }: Props) {
    const { t } = useTranslation('studyDepth');
    const [loading, setLoading] = useState(false);
    const [simplifying, setSimplifying] = useState(false);
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<StepOrientation | null>(null);
    /** True once the user has requested the second-level (simplified) help. */
    const [isSimplified, setIsSimplified] = useState(false);

    const handleAsk = async (e: React.MouseEvent) => {
        // Drive open state manually so the popover only opens after the result lands.
        e.preventDefault();
        if (loading) return;
        if (result) {
            setOpen(true);
            return;
        }
        setLoading(true);
        try {
            const r = await orient({ passage, stepKey, pastorInput, genre });
            setResult(r);
            setIsSimplified(false);
            setOpen(true);
            onLogOrientation();
        } catch (err) {
            console.error('[StepCompanion] orient failed', err);
            toast.error(t('companion.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleSimplify = async () => {
        if (simplifying) return;
        setSimplifying(true);
        try {
            const r = await orient({ passage, stepKey, pastorInput, genre, simplify: true });
            setResult(r);
            setIsSimplified(true);
            onLogOrientation();
        } catch (err) {
            console.error('[StepCompanion] simplify failed', err);
            toast.error(t('companion.error'));
        } finally {
            setSimplifying(false);
        }
    };

    return (
        <div className="mt-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" onClick={handleAsk} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> {t('companion.loading')}
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" /> {t('companion.ask')}
                            </>
                        )}
                    </Button>
                </PopoverTrigger>
                {result && (
                    <PopoverContent
                        side="top"
                        align="start"
                        sideOffset={8}
                        className="w-[min(28rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto border-info/30 bg-popover p-0 shadow-xl"
                    >
                        <div className="flex items-start justify-between gap-2 border-b border-border/60 bg-info-subtle/50 px-3 py-2">
                            <div className="flex items-center gap-1.5 text-info-subtle-foreground">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span className="text-[11px] font-medium">{t('companion.disclaimer')}</span>
                                {isSimplified && (
                                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-info px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-info-foreground">
                                        <Wand2 className="h-2.5 w-2.5" /> {t('companion.simplifiedBadge')}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                                title={t('companion.close')}
                                aria-label={t('companion.close')}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3 p-3 text-sm">
                            {result.confrontation && (
                                <div className="rounded-md border border-warning/30 bg-warning-subtle p-2.5">
                                    <p className="flex items-center gap-1.5 text-xs font-semibold text-warning-subtle-foreground">
                                        <AlertTriangle className="h-3.5 w-3.5" /> {t('companion.confrontationTitle')}
                                    </p>
                                    <p className="mt-1 text-warning-subtle-foreground">{result.confrontation}</p>
                                </div>
                            )}

                            {result.data.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-foreground">{t('companion.dataTitle')}</p>
                                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-foreground/90">
                                        {result.data.map((d, i) => (
                                            <li key={i}>{d}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.questions.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-foreground">{t('companion.questionsTitle')}</p>
                                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-foreground/90">
                                        {result.questions.map((q, i) => (
                                            <li key={i}>{q}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.example && (
                                <div className="rounded-md border border-info/30 bg-info-subtle/40 p-2.5">
                                    <p className="flex items-center gap-1.5 text-xs font-semibold text-info-subtle-foreground">
                                        <BookOpen className="h-3.5 w-3.5" /> {t('companion.exampleTitle')}
                                    </p>
                                    <p className="mt-1 whitespace-pre-line text-info-subtle-foreground">{result.example}</p>
                                </div>
                            )}

                            {result.caution && (
                                <p className="flex items-start gap-1.5 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {result.caution}
                                </p>
                            )}

                            {!isSimplified && (
                                <div className="border-t border-border/60 pt-2.5">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleSimplify}
                                        disabled={simplifying}
                                        className="h-auto w-full justify-start gap-1.5 px-2 py-1.5 text-xs"
                                    >
                                        {simplifying ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('companion.simplifyLoading')}
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="h-3.5 w-3.5 text-info" />
                                                <span className="text-foreground">{t('companion.simplifyAsk')}</span>
                                                <span className="ml-auto text-[10px] text-muted-foreground">
                                                    {t('companion.simplifyHint')}
                                                </span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                )}
            </Popover>
        </div>
    );
}
