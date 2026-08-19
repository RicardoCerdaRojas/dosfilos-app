import { useCallback, useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { buildLlmCostReport, type LlmCostReport, type LlmUsageDay } from '@/lib/llmCostReport';

interface Payload {
    monthlyBudgetUsd: number;
    budgetIsDefault: boolean;
    emails: Record<string, string>;
    days: LlmUsageDay[];
}

/**
 * Lee el consumo LLM del servidor vía `getLlmUsageSummary` (super_admin) y lo
 * agrega con la función pura `buildLlmCostReport`. Read-only.
 */
export function useLlmCostReport(days = 30) {
    const [report, setReport] = useState<LlmCostReport | null>(null);
    const [budget, setBudget] = useState<{ usd: number; isDefault: boolean } | null>(null);
    const [emails, setEmails] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const callable = httpsCallable(getFunctions(), 'getLlmUsageSummary');
            const res = await callable({ days });
            const data = res.data as Payload;
            setBudget({ usd: data.monthlyBudgetUsd, isDefault: data.budgetIsDefault });
            setEmails(data.emails ?? {});
            setReport(buildLlmCostReport(data.days ?? [], data.monthlyBudgetUsd, new Date()));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'No pudimos cargar el consumo.');
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { report, budget, emails, loading, error, refresh };
}
