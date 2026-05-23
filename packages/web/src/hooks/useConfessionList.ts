import { useEffect, useState } from 'react';
import { FirebaseConfessionRepository } from '@dosfilos/infrastructure';
import type { Confession } from '@dosfilos/domain';

const repo = new FirebaseConfessionRepository();

/**
 * Reads the CORE Library confession catalog for end-user-facing
 * surfaces (onboarding wizard, `/settings/confession`). Distinct from
 * the admin variant — no super_admin gating, returns only sectioned
 * sources sorted by tradition for a clean dropdown UX.
 */
export function useConfessionList() {
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        repo.listConfessions()
            .then((all) => {
                if (cancelled) return;
                // Filter to sectioned sources only — Schaff Vols are reference
                // works, not first-class confessional identities a pastor would
                // declare allegiance to.
                const filtered = all
                    .filter((c) => c.sectionType === 'sectioned')
                    .sort((a, b) => a.shortTitle.localeCompare(b.shortTitle));
                setConfessions(filtered);
                setError(null);
            })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    return { confessions, loading, error };
}
