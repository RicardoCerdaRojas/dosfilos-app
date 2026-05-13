import {
    collection,
    doc,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    updateDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface LeadMagnetUtm {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
}

export interface LeadMagnetSubmission {
    id: string;
    email: string;
    name: string | null;
    leadMagnet: string;
    utm: LeadMagnetUtm;
    sessionId: string | null;
    createdAt: Timestamp;
    lastRequestedAt: Timestamp | null;
    lastEmailedAt: Timestamp | null;
    requestCount: number;
    emailDelivered: boolean;
    lastEmailError: string | null;
    /** Nurture sequence stage — 0 = just captured, ≥1 = nurture in progress. */
    nurtureStage: number;
}

/**
 * Service that wraps the `lead_magnet_submissions` Firestore collection.
 *
 * Separate from `LeadsService` (which serves `contact_leads/` — the
 * contact-form submissions). Lead-magnet submissions are a distinct
 * funnel with different attribution context (UTM, sessionId) and
 * different lifecycle (delivery email, nurture sequence).
 *
 * All reads come through `onSnapshot` so the admin dashboard stays
 * live without manual refresh. Reads obey Firestore security rules
 * which gate this collection to the admin email (see firestore.rules).
 */
export class LeadMagnetSubmissionsService {
    private readonly collectionName = 'lead_magnet_submissions';

    /**
     * Subscribes to all lead-magnet submissions, sorted by `createdAt`
     * descending (newest first). Returns the unsubscribe function for
     * the standard `useEffect` cleanup pattern.
     */
    subscribeAll(
        onChange: (submissions: LeadMagnetSubmission[]) => void,
        onError: (error: Error) => void,
    ): () => void {
        const db = getFirestore();
        const q = query(
            collection(db, this.collectionName),
            orderBy('createdAt', 'desc'),
        );
        return onSnapshot(
            q,
            (snapshot) => {
                const out: LeadMagnetSubmission[] = snapshot.docs.map((d) => {
                    const data = d.data();
                    return {
                        id: d.id,
                        email: data.email ?? '',
                        name: data.name ?? null,
                        leadMagnet: data.leadMagnet ?? 'unknown',
                        utm: data.utm ?? {},
                        sessionId: data.sessionId ?? null,
                        createdAt: data.createdAt,
                        lastRequestedAt: data.lastRequestedAt ?? null,
                        lastEmailedAt: data.lastEmailedAt ?? null,
                        requestCount: typeof data.requestCount === 'number' ? data.requestCount : 0,
                        emailDelivered: !!data.emailDelivered,
                        lastEmailError: data.lastEmailError ?? null,
                        nurtureStage: typeof data.nurtureStage === 'number' ? data.nurtureStage : 0,
                    };
                });
                onChange(out);
            },
            (error) => onError(error),
        );
    }

    /**
     * Updates `nurtureStage` for a given submission. Admins use this
     * to mark leads as "advanced to email 2" etc. while we don't yet
     * have an automated nurture scheduler.
     */
    async setNurtureStage(submissionId: string, stage: number): Promise<void> {
        const db = getFirestore();
        await updateDoc(doc(db, this.collectionName, submissionId), {
            nurtureStage: Math.max(0, Math.floor(stage)),
        });
    }

    /**
     * Re-sends the delivery email for a submission by invoking the
     * `resendLeadMagnet` Cloud Function. The callable is admin-gated
     * server-side so this method's caller doesn't need to enforce
     * the check (Firestore rules + function auth take care of it).
     */
    async resendDeliveryEmail(submissionId: string): Promise<void> {
        const functions = getFunctions();
        const callable = httpsCallable(functions, 'resendLeadMagnet');
        await callable({ leadId: submissionId });
    }

    /**
     * Renders one of the lead-magnet nurture templates with sample
     * inputs and returns the compiled subject + HTML. Used by the
     * super-admin preview page so we can validate copy + design
     * without sending real emails. Server-side gate on
     * `previewLeadMagnetNurture` enforces the super-admin check.
     */
    async previewNurtureTemplate(input: {
        stage: 'day1' | 'day3' | 'day5' | 'day7';
        locale: 'es' | 'en';
        name: string;
    }): Promise<{ stage: string; locale: 'es' | 'en'; subject: string; html: string }> {
        const functions = getFunctions();
        const callable = httpsCallable<typeof input, { stage: string; locale: 'es' | 'en'; subject: string; html: string }>(
            functions,
            'previewLeadMagnetNurture',
        );
        const result = await callable(input);
        return result.data;
    }
}

export const leadMagnetSubmissionsService = new LeadMagnetSubmissionsService();
