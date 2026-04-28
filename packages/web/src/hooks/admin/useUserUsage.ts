import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import type { PlanDefinition } from '@dosfilos/domain';

interface UsageCounter {
    pagesProcessed: number;
    queriesUsed: number;
    docsUploadedThisMonth: number;
    periodKey: string;
}

interface UsageData {
    usage: UsageCounter;
    plan: PlanDefinition | null;
}

function currentPeriodKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Reads the current-period usage_counters doc for a user plus their plan
 * definition (so we can render "X of Y" + percentage progress).
 *
 * Not realtime: a single getDoc pair on mount + when planId changes. Usage
 * counters update server-side and the admin doesn't need second-by-second
 * accuracy here — refresh-on-demand is enough.
 */
export function useUserUsage(userId: string | undefined, planId: string | undefined) {
    const [data, setData] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setData(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        const fetch = async () => {
            setLoading(true);
            try {
                const periodKey = currentPeriodKey();
                const usageRef = doc(db, 'users', userId, 'usage_counters', periodKey);
                const planRef = planId ? doc(db, 'plans', planId) : null;

                const [usageSnap, planSnap] = await Promise.all([
                    getDoc(usageRef),
                    planRef ? getDoc(planRef) : Promise.resolve(null),
                ]);

                if (cancelled) return;

                const usage: UsageCounter = usageSnap.exists()
                    ? {
                        pagesProcessed: usageSnap.data().pagesProcessed ?? 0,
                        queriesUsed: usageSnap.data().queriesUsed ?? 0,
                        docsUploadedThisMonth: usageSnap.data().docsUploadedThisMonth ?? 0,
                        periodKey,
                    }
                    : { pagesProcessed: 0, queriesUsed: 0, docsUploadedThisMonth: 0, periodKey };

                const plan: PlanDefinition | null = planSnap?.exists()
                    ? (planSnap.data() as PlanDefinition)
                    : null;

                setData({ usage, plan });
                setError(null);
            } catch (err) {
                if (cancelled) return;
                console.error('[useUserUsage]', err);
                setError(err instanceof Error ? err.message : 'unknown');
                setData(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetch();
        return () => { cancelled = true; };
    }, [userId, planId]);

    return { data, loading, error };
}
