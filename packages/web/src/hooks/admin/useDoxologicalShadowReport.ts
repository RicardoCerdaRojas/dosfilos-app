import { useCallback, useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    aggregateShadowReport,
    type ShadowReport,
    type ShadowRow,
} from '@/lib/doxologicalShadowReport';

/**
 * Lee la telemetría de sombra del gate doxológico vía el callable
 * `listDoxologicalShadow` (super_admin server-side) y la agrega client-side con
 * la función pura `aggregateShadowReport`. Read-only.
 */
export function useDoxologicalShadowReport() {
    const [report, setReport] = useState<ShadowReport | null>(null);
    const [truncated, setTruncated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const callable = httpsCallable(getFunctions(), 'listDoxologicalShadow');
            const res = await callable({});
            const data = res.data as { rows: ShadowRow[]; truncated: boolean };
            setReport(aggregateShadowReport(data.rows ?? [], Date.now()));
            setTruncated(Boolean(data.truncated));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'No pudimos cargar la sombra.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { report, truncated, loading, error, refresh };
}
