import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';

export type AuditAction =
    | 'user.delete'
    | 'user.disable'
    | 'user.enable'
    | 'user.resend_welcome_email'
    | 'user.change_plan'
    | 'user.bulk_disable'
    | 'user.bulk_enable'
    | 'user.grant_credits'
    | 'user.extend_trial';

export interface AuditLogEntry {
    id: string;
    actorUid: string;
    actorEmail: string | null;
    action: AuditAction;
    targetUid: string | null;
    targetEmail: string | null;
    details: Record<string, unknown>;
    createdAt: Date;
}

export interface AuditLogFilters {
    targetUid?: string;
    actorUid?: string;
    action?: AuditAction;
    after?: Date;
    before?: Date;
}

/**
 * Subscribes to the `admin_audit_log` collection in real-time. Server-side
 * filtering is used for `targetUid` (the most common filter from
 * UserDetailsModal) so the query is bounded; the rest happens client-side
 * because of the small expected volume (a few hundred entries per week even
 * at scale).
 *
 * The hard cap of 500 entries per snapshot keeps the dashboard responsive.
 * For deeper history, consider a paginated audit-export endpoint later.
 */
export function useAuditLog(filters?: AuditLogFilters, hardLimit = 500) {
    const [entries, setEntries] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);

        // Build a query that's safe to compose: only `targetUid` is server-side
        // because pairing multiple `where` against `orderBy` on a different
        // field requires composite indexes — too many combinations to precompute.
        const constraints: any[] = [orderBy('createdAt', 'desc'), limit(hardLimit)];
        if (filters?.targetUid) constraints.unshift(where('targetUid', '==', filters.targetUid));

        const q = query(collection(db, 'admin_audit_log'), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data: AuditLogEntry[] = snapshot.docs.map(doc => {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        actorUid: d.actorUid ?? '',
                        actorEmail: d.actorEmail ?? null,
                        action: d.action,
                        targetUid: d.targetUid ?? null,
                        targetEmail: d.targetEmail ?? null,
                        details: d.details ?? {},
                        createdAt: (d.createdAt as Timestamp | undefined)?.toDate() ?? new Date(),
                    };
                });
                setEntries(data);
                setLoading(false);
            },
            (err) => {
                console.error('[useAuditLog]', err);
                setError(err.message);
                setLoading(false);
            },
        );

        return () => unsubscribe();
    }, [filters?.targetUid, hardLimit]);

    // Client-side filters for action / actor / date range. Cheap because the
    // Firestore query already capped at `hardLimit`.
    const filtered = entries.filter(entry => {
        if (filters?.action && entry.action !== filters.action) return false;
        if (filters?.actorUid && entry.actorUid !== filters.actorUid) return false;
        if (filters?.after && entry.createdAt < filters.after) return false;
        if (filters?.before && entry.createdAt > filters.before) return false;
        return true;
    });

    return { entries: filtered, allEntries: entries, loading, error };
}
