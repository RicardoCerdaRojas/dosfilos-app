import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Sprout, Clock, Wrench, ClipboardPaste, CheckCircle2, Circle, BookOpen } from 'lucide-react';
import { pastoralSeedService } from '@dosfilos/application';
import {
    aggregateLexiconAttributions,
    evaluatePastoralSeed,
    PASTORAL_SEED_STEP_ORDER,
    PastoralSeed,
    PastoralSeedStepKey,
} from '@dosfilos/domain';

const STEP_LABELS: Record<PastoralSeedStepKey, string> = {
    reading: 'Lectura',
    syntax: 'Sintaxis',
    morphology: 'Morfología',
    recognition: 'Reconocimiento',
    function: 'Función',
    insight: 'Insight',
};

interface Props {
    sermonId: string;
    /** When true, the panel renders compact mode (used in sidebars). */
    compact?: boolean;
}

/**
 * Inline audit panel surfaced in the sermon detail page. Shows the
 * pastor: which steps they completed, time spent per step, tools
 * consulted, and whether any paste events on the AI-forbidden Insight
 * fields were logged. Pastor-facing — frames the audit as evidence of
 * personal study, not surveillance.
 *
 * Returns null when no seed exists for this sermon (legacy or flag-off
 * sermons), so the panel only appears when relevant.
 */
export function PastoralSeedAuditPanel({ sermonId, compact = false }: Props) {
    const [seed, setSeed] = useState<PastoralSeed | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        pastoralSeedService
            .getBySermonId(sermonId)
            .then((s) => {
                if (!cancelled) setSeed(s);
            })
            .catch((err) => console.warn('[PastoralSeedAuditPanel]', err))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [sermonId]);

    // Hooks must run on every render — keep this BEFORE the early return below
    // (null-safe seed access) so the hook order never changes.
    const lexiconAttributions = useMemo(
        () => aggregateLexiconAttributions(seed?.wordStudies?.studies ?? []),
        [seed?.wordStudies?.studies],
    );

    if (loading || !seed) return null;

    const evaluation = evaluatePastoralSeed(seed);
    const pasteCount = seed.insight.pasteEvents?.length ?? 0;
    const totalMinutes = Math.round((seed.totalTimeSeconds ?? 0) / 60);

    return (
        <Card className={`${compact ? 'p-3' : 'p-4'} space-y-3 border-emerald-500/30`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-emerald-500/10">
                        <Sprout className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Tu estudio personal</p>
                        <p className="text-xs text-muted-foreground">
                            {evaluation.completedSteps.length} / {PASTORAL_SEED_STEP_ORDER.length} pasos completos
                            {totalMinutes > 0 && ` · ~${totalMinutes} min`}
                        </p>
                    </div>
                </div>
                <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        seed.completed
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    }`}
                >
                    {seed.completed ? 'Semilla completa' : 'Parcial'}
                </span>
            </div>

            <ul className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-xs">
                {PASTORAL_SEED_STEP_ORDER.map((key) => {
                    const valid = evaluation.perStep[key]?.valid ?? false;
                    const seconds = (seed[key] as any).timeSpentSeconds ?? 0;
                    const Icon = valid ? CheckCircle2 : Circle;
                    return (
                        <li
                            key={key}
                            className={`flex items-center gap-1.5 ${
                                valid ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                        >
                            <Icon className={`h-3.5 w-3.5 ${valid ? 'text-emerald-600' : ''}`} />
                            <span>
                                {STEP_LABELS[key]}
                                {seconds > 0 && (
                                    <span className="text-muted-foreground"> · {Math.round(seconds / 60) || '<1'} min</span>
                                )}
                            </span>
                        </li>
                    );
                })}
            </ul>

            {!compact && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t pt-2">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {totalMinutes} min total
                    </span>
                    <span className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {seed.toolsConsulted.length} herramienta{seed.toolsConsulted.length === 1 ? '' : 's'} consultada
                        {seed.toolsConsulted.length === 1 ? '' : 's'}
                    </span>
                    <span
                        className={`flex items-center gap-1 ${
                            pasteCount > 0 ? 'text-amber-700 dark:text-amber-400' : ''
                        }`}
                    >
                        <ClipboardPaste className="h-3 w-3" />
                        {pasteCount} evento{pasteCount === 1 ? '' : 's'} de pegado
                    </span>
                </div>
            )}

            {!compact && lexiconAttributions.length > 0 && (
                <div className="border-t pt-2 space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        Atribuciones léxicas
                    </p>
                    <ul className="space-y-2">
                        {lexiconAttributions.map((block) => (
                            <li key={block.sourceId} className="text-[11px] leading-snug text-muted-foreground">
                                <p className="font-medium text-foreground">{block.title}</p>
                                {block.lines.map((line, i) => (
                                    <p key={i}>{line}</p>
                                ))}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Card>
    );
}
