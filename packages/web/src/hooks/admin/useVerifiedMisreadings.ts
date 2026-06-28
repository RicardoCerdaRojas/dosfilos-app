import { useCallback, useEffect, useState } from 'react';
import { FirebaseVerifiedMisreadingRepository, RVR1960Repository } from '@dosfilos/infrastructure';
import {
    ReviewVerifiedMisreadingUseCase,
    adminVerifiedMisreadingService,
    type IngestVerifiedMisreadingArgs,
    type ReviewVerifiedMisreadingResponse,
} from '@dosfilos/application';
import type { MisreadingReviewStatus, VerifiedMisreadingRecord } from '@dosfilos/domain';

/**
 * ADR-036 PR4 — hooks de la cola del set crítico curado.
 * Lectura por repo (solo-lectura); escrituras por callables role-gated. La
 * revisión orquesta `verifyAnchorVerse` (advisory) vía el use case.
 */
const repo = new FirebaseVerifiedMisreadingRepository();
const bibleRepo = new RVR1960Repository();
const reviewUseCase = new ReviewVerifiedMisreadingUseCase(repo, bibleRepo, adminVerifiedMisreadingService);

export function useVerifiedMisreadings(status: MisreadingReviewStatus) {
    const [items, setItems] = useState<VerifiedMisreadingRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            setItems(await repo.listByStatus(status));
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { items, loading, refresh };
}

export function useReviewVerifiedMisreading() {
    const [busy, setBusy] = useState(false);
    const review = useCallback(async (id: string, approve: boolean): Promise<ReviewVerifiedMisreadingResponse> => {
        setBusy(true);
        try {
            return await reviewUseCase.execute(id, approve);
        } finally {
            setBusy(false);
        }
    }, []);
    return { review, busy };
}

export function useIngestVerifiedMisreading() {
    const [busy, setBusy] = useState(false);
    const ingest = useCallback(async (args: IngestVerifiedMisreadingArgs): Promise<{ id: string }> => {
        setBusy(true);
        try {
            return await adminVerifiedMisreadingService.ingest(args);
        } finally {
            setBusy(false);
        }
    }, []);
    return { ingest, busy };
}
