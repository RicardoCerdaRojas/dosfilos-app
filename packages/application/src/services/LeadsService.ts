import {
    collection,
    deleteDoc,
    doc,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    updateDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface CaptureLeadInput {
    email: string;
    name?: string;
    leadMagnet?: string;
    /** Honeypot value — only forwarded so the server can drop bot fills. */
    website?: string;
    /** UTM context read from sessionStorage at submit time. */
    utm?: Record<string, string | undefined>;
    /** Analytics session id — links the lead row with funnel events. */
    sessionId?: string | null;
}

export interface CaptureLeadResult {
    ok: true;
    leadId: string;
    duplicate: boolean;
}

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'closed';

export interface ContactLead {
    id: string;
    name: string;
    email: string;
    phone?: string;
    church?: string;
    type: string;
    message: string;
    status: LeadStatus;
    source: string;
    createdAt: Timestamp;
}

/**
 * Service that wraps the `contact_leads` Firestore collection used by the
 * admin Leads page. Centralises all reads/writes so UI components don't
 * import Firestore directly.
 */
export class LeadsService {
    private readonly collectionName = 'contact_leads';

    /**
     * Subscribes to all leads ordered by `createdAt` desc. Returns the
     * unsubscribe function expected by the standard Firebase `onSnapshot`
     * pattern, so callers can return it from a React `useEffect`.
     */
    subscribeAll(
        onChange: (leads: ContactLead[]) => void,
        onError: (error: Error) => void,
    ): () => void {
        const db = getFirestore();
        const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
        return onSnapshot(
            q,
            (snapshot) => {
                const leads = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ContactLead[];
                onChange(leads);
            },
            (error) => onError(error),
        );
    }

    async updateStatus(leadId: string, status: LeadStatus): Promise<void> {
        const db = getFirestore();
        await updateDoc(doc(db, this.collectionName, leadId), { status });
    }

    async deleteLead(leadId: string): Promise<void> {
        const db = getFirestore();
        await deleteDoc(doc(db, this.collectionName, leadId));
    }

    /**
     * Fires the public `captureLead` Cloud Function used by the
     * lead-magnet landing form. The callable carries UTM context +
     * the analytics session id so the lead row server-side joins
     * naturally with the `funnel_events/` rows fired on the same
     * visit. Returns `{ ok, leadId, duplicate }`; the hook surfaces
     * the duplicate flag in the success toast.
     */
    async captureLead(input: CaptureLeadInput): Promise<CaptureLeadResult> {
        const callable = httpsCallable<CaptureLeadInput, CaptureLeadResult>(
            getFunctions(),
            'captureLead',
        );
        const { data } = await callable(input);
        return data;
    }
}

export const leadsService = new LeadsService();
