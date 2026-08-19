/**
 * Agregación pura del consumo LLM para el panel de costos. Sin Firebase, sin
 * React: entra el crudo del callable, sale lo que el panel dibuja. Testeable.
 */

export interface LlmUsageDay {
    day: string;
    usd: number;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    usdFromFallbackPricing: number;
    byFeature: Record<string, { calls?: number; usd?: number }>;
    byUser: Record<string, { calls?: number; usd?: number }>;
    byModel: Record<string, { calls?: number; usd?: number }>;
}

export interface LlmCostReport {
    /** Gasto del mes en curso (UTC) — el que se compara contra el presupuesto. */
    monthUsd: number;
    monthCalls: number;
    todayUsd: number;
    last7Usd: number;
    /** Cuánto del gasto del mes viene de modelos SIN precio propio (estimado grueso). */
    monthUsdFromFallback: number;
    budgetPct: number;
    level: BudgetLevel;
    byFeature: Ranked[];
    byUser: Ranked[];
    byModel: Ranked[];
    /** Serie diaria del mes, para la barra de tendencia. */
    series: Array<{ day: string; usd: number }>;
}

export interface Ranked {
    key: string;
    usd: number;
    calls: number;
    pct: number;
}

/**
 * Niveles del semáforo. `warn` a la mitad y no al 90% a propósito: con un
 * presupuesto chico, para cuando llegas al 90% ya no queda margen de reacción.
 */
export type BudgetLevel = 'ok' | 'warn' | 'high' | 'over';

export function budgetLevel(pct: number): BudgetLevel {
    if (pct >= 100) return 'over';
    if (pct >= 80) return 'high';
    if (pct >= 50) return 'warn';
    return 'ok';
}

const monthOf = (day: string) => day.slice(0, 7);

export function buildLlmCostReport(
    days: LlmUsageDay[],
    monthlyBudgetUsd: number,
    now: Date,
): LlmCostReport {
    const today = now.toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);
    const sevenAgo = new Date(now);
    sevenAgo.setUTCDate(sevenAgo.getUTCDate() - 6);
    const sevenKey = sevenAgo.toISOString().slice(0, 10);

    const mes = days.filter((d) => monthOf(d.day) === thisMonth);
    const monthUsd = sum(mes.map((d) => d.usd));
    const monthCalls = sum(mes.map((d) => d.calls));

    const acumular = (pick: (d: LlmUsageDay) => Record<string, { calls?: number; usd?: number }>) => {
        const acc = new Map<string, { usd: number; calls: number }>();
        for (const d of mes) {
            for (const [k, v] of Object.entries(pick(d) ?? {})) {
                const prev = acc.get(k) ?? { usd: 0, calls: 0 };
                acc.set(k, { usd: prev.usd + (v?.usd ?? 0), calls: prev.calls + (v?.calls ?? 0) });
            }
        }
        return [...acc.entries()]
            .map(([key, v]) => ({ key, ...v, pct: monthUsd > 0 ? (v.usd / monthUsd) * 100 : 0 }))
            .sort((a, b) => b.usd - a.usd);
    };

    const budgetPct = monthlyBudgetUsd > 0 ? (monthUsd / monthlyBudgetUsd) * 100 : 0;

    return {
        monthUsd,
        monthCalls,
        todayUsd: sum(days.filter((d) => d.day === today).map((d) => d.usd)),
        last7Usd: sum(days.filter((d) => d.day >= sevenKey).map((d) => d.usd)),
        monthUsdFromFallback: sum(mes.map((d) => d.usdFromFallbackPricing ?? 0)),
        budgetPct,
        level: budgetLevel(budgetPct),
        byFeature: acumular((d) => d.byFeature),
        byUser: acumular((d) => d.byUser),
        byModel: acumular((d) => d.byModel),
        series: mes.map((d) => ({ day: d.day, usd: d.usd })),
    };
}

function sum(xs: number[]): number {
    return xs.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}
