import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2, AlertTriangle, Coins } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLlmCostReport } from '@/hooks/admin/useLlmCostReport';
import type { BudgetLevel, Ranked } from '@/lib/llmCostReport';

const usd = (n: number) => `$${n.toFixed(n < 10 ? 2 : 0)}`;

const LEVEL_STYLES: Record<BudgetLevel, { bar: string; text: string; label: string }> = {
    ok: { bar: 'bg-success', text: 'text-success-subtle-foreground', label: 'Dentro del presupuesto' },
    warn: { bar: 'bg-warning', text: 'text-warning-subtle-foreground', label: 'Mitad del presupuesto' },
    high: { bar: 'bg-warning', text: 'text-warning-subtle-foreground', label: 'Cerca del límite' },
    over: { bar: 'bg-destructive', text: 'text-destructive', label: 'Presupuesto excedido' },
};

/**
 * Panel de costos LLM del servidor. Responde lo que un presupuesto de nube no
 * responde: no cuánto gasté, sino EN QUÉ y QUIÉN.
 *
 * Mide solo el gasto que pasa por los callables. Las llamadas que salen del
 * navegador con la clave de Gemini no se ven acá — el aviso está en la página.
 */
export function LlmCostDashboard() {
    const { report, budget, emails, shadow, loading, error, refresh } = useLlmCostReport(30);
    const style = LEVEL_STYLES[report?.level ?? 'ok'];

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link to="/dashboard/admin" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        <Coins className="h-5 w-5" /> Consumo de modelos
                    </h1>
                </div>
                <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-2">Actualizar</span>
                </Button>
            </div>

            {error && (
                <Card className="p-4 border-destructive text-sm text-destructive">{error}</Card>
            )}

            {report && budget && (
                <>
                    <Card className="p-5 space-y-3">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Mes en curso</p>
                                <p className="text-3xl font-semibold">{usd(report.monthUsd)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                    Presupuesto {usd(budget.usd)}
                                    {budget.isDefault && ' (por defecto)'}
                                </p>
                                <p className={`text-lg font-medium ${style.text}`}>
                                    {report.budgetPct.toFixed(0)}% · {style.label}
                                </p>
                            </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-full ${style.bar}`}
                                style={{ width: `${Math.min(report.budgetPct, 100)}%` }}
                            />
                        </div>
                        <div className="flex gap-6 text-sm text-muted-foreground">
                            <span>Hoy {usd(report.todayUsd)}</span>
                            <span>7 días {usd(report.last7Usd)}</span>
                            <span>{report.monthCalls} llamadas</span>
                        </div>
                        {report.monthUsdFromFallback > 0 && (
                            <p className="text-xs text-warning-subtle-foreground flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {usd(report.monthUsdFromFallback)} del total viene de modelos sin precio en la
                                tabla — estimado con el precio de respaldo (caro a propósito).
                            </p>
                        )}
                    </Card>

                    {shadow?.paused && (
                        <Card className="p-4 border-warning bg-warning-subtle text-xs text-warning-subtle-foreground flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>
                                <strong>Sombra en pausa hoy.</strong> El gasto del día
                                (${shadow.todayUsd.toFixed(2)}) alcanzó el tope de ${shadow.dailyCapUsd}. Los
                                jueces de sombra dejaron de llamar al modelo; lo determinista sigue
                                registrándose y el pastor no ve ninguna diferencia. Se reanuda solo mañana.
                            </span>
                        </Card>
                    )}

                    <Card className="p-4 text-xs text-muted-foreground">
                        Este panel mide el gasto que pasa por el <strong>servidor</strong>. Las llamadas que
                        salen del navegador con la clave del cliente no se ven aquí: hasta migrarlas a
                        callables, el total real es mayor que el mostrado.
                    </Card>

                    <div className="grid gap-4 md:grid-cols-2">
                        <RankCard title="Por feature" rows={report.byFeature} />
                        <RankCard title="Por modelo" rows={report.byModel} />
                    </div>
                    <RankCard
                        title="Por usuario"
                        rows={report.byUser}
                        label={(k) => emails[k] ?? k}
                    />
                </>
            )}

            {loading && !report && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando consumo…
                </div>
            )}
        </div>
    );
}

function RankCard({
    title,
    rows,
    label = (k: string) => k,
}: {
    title: string;
    rows: Ranked[];
    label?: (key: string) => string;
}) {
    return (
        <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3">{title}</h2>
            {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin consumo registrado este mes.</p>
            ) : (
                <ul className="space-y-2">
                    {rows.slice(0, 10).map((r) => (
                        <li key={r.key} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate font-mono text-xs">{label(r.key)}</span>
                            <span className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className="text-[10px]">
                                    {r.calls}
                                </Badge>
                                <span className="tabular-nums">{usd(r.usd)}</span>
                                <span className="text-muted-foreground text-xs w-10 text-right">
                                    {r.pct.toFixed(0)}%
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
