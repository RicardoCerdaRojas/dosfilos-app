import { useEffect, useState } from 'react';
import {
    adminUserQueryService,
    type AuditAction,
    type AuditLogEntry,
} from '@dosfilos/application';

export type { AuditAction, AuditLogEntry };

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
 *
 * Firestore SDK lives in `adminUserQueryService.subscribeAuditLog`
 * (compliance C7.3); this hook stays a thin React adapter.
 */
export function useAuditLog(filters?: AuditLogFilters, hardLimit = 500) {
    const [entries, setEntries] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = adminUserQueryService.subscribeAuditLog(
            { targetUid: filters?.targetUid },
            hardLimit,
            (next) => {
                setEntries(next);
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
