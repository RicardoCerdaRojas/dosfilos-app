import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * ADR-036 PR4 — fachada fina sobre las callables del set crítico curado.
 * Cada método mapea a una callable role-gated; el feedback UI (toasts) vive en
 * los hooks. Espeja `AdminConfessionService` (compliance C7.3: sin Firebase SDK
 * en web/src/hooks).
 */

export interface IngestVerifiedMisreadingAnchor {
    reference: string;
    note?: string;
    sourceId?: string;
}

export interface IngestVerifiedMisreadingArgs {
    passageScope: { bookId: string; chapterStart: number; verseStart: number; verseEnd: number };
    claim: string;
    whyWrong?: string;
    severity: 'critical' | 'standard';
    correctiveAnchors: IngestVerifiedMisreadingAnchor[];
}

export interface AnchorVerificationArg {
    reference: string;
    verseText: string;
    versesExist: boolean;
}

export interface ReviewVerifiedMisreadingArgs {
    id: string;
    approve: boolean;
    anchorVerifications: AnchorVerificationArg[];
}

export interface ReviewVerifiedMisreadingResponse {
    id: string;
    verification: { versesExist: boolean; refutes: 'yes' | 'unclear' | 'no'; adjudicatedAt: string; modelTier: string };
    reviewStatus: 'pending-pastoral-review' | 'reviewed';
}

export class AdminVerifiedMisreadingService {
    async ingest(args: IngestVerifiedMisreadingArgs): Promise<{ id: string }> {
        const fn = httpsCallable<IngestVerifiedMisreadingArgs, { id: string }>(
            getFunctions(),
            'ingestVerifiedMisreading',
        );
        const { data } = await fn(args);
        return data;
    }

    async review(args: ReviewVerifiedMisreadingArgs): Promise<ReviewVerifiedMisreadingResponse> {
        const fn = httpsCallable<ReviewVerifiedMisreadingArgs, ReviewVerifiedMisreadingResponse>(
            getFunctions(),
            'reviewVerifiedMisreading',
        );
        const { data } = await fn(args);
        return data;
    }

    /** Re-curar una entrada. Resetea a pending (debe re-verificarse + aprobarse). */
    async update(args: IngestVerifiedMisreadingArgs & { id: string }): Promise<{ id: string }> {
        const fn = httpsCallable<IngestVerifiedMisreadingArgs & { id: string }, { id: string }>(
            getFunctions(),
            'updateVerifiedMisreading',
        );
        const { data } = await fn(args);
        return data;
    }

    async remove(id: string): Promise<{ id: string }> {
        const fn = httpsCallable<{ id: string }, { id: string }>(getFunctions(), 'deleteVerifiedMisreading');
        const { data } = await fn({ id });
        return data;
    }
}

export const adminVerifiedMisreadingService = new AdminVerifiedMisreadingService();
