import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Sprout } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { pastoralSeedService } from '@dosfilos/application';
import {
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

/**
 * Super-admin debug page. Loads a `PastoralSeed` by sermon id and
 * renders every step, validator result, tool usage log and paste audit
 * trail. Intended for development + smoke testing the wizard; not a
 * pastor-facing surface (the inline audit panel in sermon detail
 * covers that).
 */
export function PastoralSeedInspector() {
    const { sermonId } = useParams<{ sermonId: string }>();
    const [seed, setSeed] = useState<PastoralSeed | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sermonId) {
            setError('Falta sermonId en la URL.');
            setLoading(false);
            return;
        }
        setLoading(true);
        pastoralSeedService
            .getBySermonId(sermonId)
            .then((s) => setSeed(s))
            .catch((err) => setError(err?.message ?? 'No pudimos cargar el seed.'))
            .finally(() => setLoading(false));
    }, [sermonId]);

    if (loading) return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>;
    if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;
    if (!seed) {
        return (
            <div className="p-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                    Sin seed para este sermón aún. El pastor todavía no entró al wizard reformado.
                </p>
                <Link to="/dashboard/admin" className="text-primary text-sm">
                    Volver al admin
                </Link>
            </div>
        );
    }

    const evaluation = evaluatePastoralSeed(seed);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <header className="space-y-2">
                <Link to="/dashboard/admin" className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Volver
                </Link>
                <div className="flex items-center gap-3">
                    <Sprout className="h-6 w-6 text-emerald-600" />
                    <div>
                        <h1 className="text-2xl font-bold font-serif">Pastoral Seed Inspector</h1>
                        <p className="text-sm text-muted-foreground">
                            Sermón {seed.sermonId} · usuario {seed.userId} · pasaje {seed.passage}
                        </p>
                    </div>
                </div>
                <p className={`text-sm font-medium ${seed.completed ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Estado: {seed.completed ? 'completo' : 'parcial'} · {evaluation.completedSteps.length} /{' '}
                    {PASTORAL_SEED_STEP_ORDER.length} pasos válidos
                </p>
            </header>

            <Card className="p-4 space-y-3">
                <h2 className="font-medium">Resumen por paso</h2>
                <ul className="space-y-1 text-sm">
                    {PASTORAL_SEED_STEP_ORDER.map((key) => {
                        const ev = evaluation.perStep[key];
                        return (
                            <li key={key} className="flex items-start gap-3">
                                <span
                                    className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                                        ev.valid
                                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                    }`}
                                >
                                    {STEP_LABELS[key]}
                                </span>
                                <span className="text-muted-foreground">
                                    {ev.valid ? 'ok' : ev.reasons.join(' · ')}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </Card>

            <Card className="p-4 space-y-3">
                <h2 className="font-medium">Tiempos + herramientas</h2>
                <p className="text-sm">
                    Total seg: {seed.totalTimeSeconds} ·{' '}
                    {PASTORAL_SEED_STEP_ORDER.map((k) => `${STEP_LABELS[k]}: ${(seed[k] as any).timeSpentSeconds ?? 0}s`).join(
                        ' · ',
                    )}
                </p>
                {seed.toolsConsulted.length > 0 ? (
                    <ul className="text-xs space-y-1 text-muted-foreground">
                        {seed.toolsConsulted.map((t, i) => (
                            <li key={i}>
                                [{t.step}] {t.tool} — {new Date(t.invokedAt).toLocaleString()}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-muted-foreground italic">Sin herramientas consultadas.</p>
                )}
            </Card>

            <Card className="p-4 space-y-3">
                <h2 className="font-medium">Paste events (Insight)</h2>
                {seed.insight.pasteEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Sin eventos de pegado registrados.</p>
                ) : (
                    <ul className="text-xs space-y-1 text-muted-foreground">
                        {seed.insight.pasteEvents.map((p, i) => (
                            <li key={i}>
                                {new Date(p.at).toLocaleString()} · {p.field} · {p.charsCount} chars
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card className="p-4 space-y-3">
                <h2 className="font-medium">Contenido (Insight)</h2>
                <pre className="text-xs whitespace-pre-wrap bg-muted/40 p-3 rounded-md">
                    {JSON.stringify(seed.insight, null, 2)}
                </pre>
            </Card>

            <Card className="p-4">
                <h2 className="font-medium mb-2">Raw seed</h2>
                <pre className="text-xs whitespace-pre-wrap bg-muted/40 p-3 rounded-md max-h-96 overflow-y-auto">
                    {JSON.stringify(seed, null, 2)}
                </pre>
            </Card>
        </div>
    );
}
