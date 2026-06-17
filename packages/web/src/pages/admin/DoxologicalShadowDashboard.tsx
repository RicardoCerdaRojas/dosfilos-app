import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { useDoxologicalShadowReport } from '@/hooks/admin/useDoxologicalShadowReport';
import type { ShadowRow } from '@/lib/doxologicalShadowReport';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    pass: 'success',
    soft: 'warning',
    hard: 'destructive',
};

function RowLine({ r }: { r: ShadowRow }) {
    return (
        <div className="rounded-md border p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={STATUS_VARIANT[r.status ?? ''] ?? 'secondary'}>{r.status}</Badge>
                <code className="text-xs text-muted-foreground">{r.flow}</code>
                <code className="text-xs text-muted-foreground">{r.segment}</code>
                {r.oneShotVerdict === null && (
                    <Badge variant="outline" className="text-xs">one-shot: null</Badge>
                )}
            </div>
            <p className="text-foreground">{r.doxologicalText}</p>
            <code className="text-[10px] text-muted-foreground">seed {r.seedId}</code>
        </div>
    );
}

/**
 * Vista super_admin de monitoreo de la sombra del gate doxológico. Read-only:
 * el reloj (≥20 Insights reales Y ≥7 días) + los 2 cortes que reabren C/D
 * (delta oneShotVerdict + failure/latencia). Removible tras el flip.
 */
export function DoxologicalShadowDashboard() {
    const { isAdmin, loading: authLoading } = useAdminAuth();
    const { report, truncated, loading, error, refresh } = useDoxologicalShadowReport();

    if (authLoading || !isAdmin) {
        return <p className="p-6 text-sm text-muted-foreground">Verificando acceso…</p>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <header className="space-y-2">
                <Link to="/dashboard/admin" className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Volver
                </Link>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold font-serif">Sombra · Gate doxológico</h1>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Refrescar
                    </Button>
                </div>
            </header>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {truncated && (
                <p className="text-xs text-warning">Resultado truncado (tope de filas) — migrar a paginado si crece.</p>
            )}
            {loading && !report && <p className="text-sm text-muted-foreground">Cargando…</p>}

            {report && (
                <>
                    {/* Reloj */}
                    <Card className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Reloj</h2>
                            <Badge variant={report.clock.readyToAdjudicate ? 'success' : 'secondary'}>
                                {report.clock.readyToAdjudicate ? 'Listo para adjudicar' : 'En curso'}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className={report.clock.floorRealMet ? 'text-success' : 'text-muted-foreground'}>
                                    Insights reales: {report.clock.distinctRealSeeds} / 20
                                </span>
                            </div>
                            <div>
                                <span className={report.clock.floorDaysMet ? 'text-success' : 'text-muted-foreground'}>
                                    Días: {report.clock.daysElapsed} / 7
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {Object.entries(report.clock.distinctSeedsBySegment).map(([seg, n]) => (
                                <Badge key={seg} variant="outline">{seg}: {n} seeds</Badge>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {report.clock.totalRows} filas · status pass {report.statusBreakdown.pass} / soft{' '}
                            {report.statusBreakdown.soft} / hard {report.statusBreakdown.hard}
                        </p>
                    </Card>

                    {/* Corte 1 — delta */}
                    <Card className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Corte 1 · Delta oneShotVerdict</h2>
                            <Badge variant={report.delta.count > 0 ? 'warning' : 'secondary'}>
                                {report.delta.count} fugas
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Guiado + segment=real + soft/hard + oneShotVerdict=null = afecto que prod deja pasar hoy.
                        </p>
                        <div className="space-y-2">
                            {report.delta.candidates.map((r) => <RowLine key={r.id} r={r} />)}
                            {report.delta.count === 0 && (
                                <p className="text-sm text-muted-foreground">Sin fugas reales aún.</p>
                            )}
                        </div>
                    </Card>

                    {/* FP candidates */}
                    <Card className="p-5 space-y-3">
                        <h2 className="text-lg font-semibold">Candidatos a falso-positivo ({report.fpCandidates.length})</h2>
                        <p className="text-xs text-muted-foreground">
                            Todos los soft/hard. Adjudicá: derivación-del-texto = bloqueo correcto; toca-core = bump posible mal calibrado.
                        </p>
                        <div className="space-y-2">
                            {report.fpCandidates.map((r) => <RowLine key={r.id} r={r} />)}
                            {report.fpCandidates.length === 0 && (
                                <p className="text-sm text-muted-foreground">Sin bloqueos aún.</p>
                            )}
                        </div>
                    </Card>

                    {/* Corte 2 — failure + latencia */}
                    <Card className="p-5 space-y-3">
                        <h2 className="text-lg font-semibold">Corte 2 · Fiabilidad</h2>
                        <div className="text-sm space-y-1">
                            <p>
                                Fallos: {report.failure.total} ({(report.failure.rate * 100).toFixed(1)}%)
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(report.failure.byCause).map(([cause, n]) => (
                                    <Badge key={cause} variant="outline">{cause}: {n}</Badge>
                                ))}
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Latencia (cacheHit=false, n={report.latency.coldSampleSize}): p50 {report.latency.p50 ?? '—'}ms ·
                            p95 {report.latency.p95 ?? '—'}ms · p99 {report.latency.p99 ?? '—'}ms
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
