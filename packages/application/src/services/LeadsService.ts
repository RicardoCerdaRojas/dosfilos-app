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
}

export const leadsService = new LeadsService();
