
import { ISessionRepository, StudySession, ExegeticalInsight } from '@dosfilos/domain';
import { db } from '../../config/firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

// Helper to recursively remove undefined fields (Firestore doesn't accept undefined)
function removeUndefined<T>(obj: T): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefined(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = removeUndefined(value);
            }
        }
        return cleaned;
    }

    return obj;
}

export class FirestoreGreekSessionRepository implements ISessionRepository {
    private sessionsCollection = 'greek_sessions';

    async createSession(session: StudySession): Promise<void> {
        const docRef = doc(db, this.sessionsCollection, session.id);
        const { id, ...data } = session; // Firestore doc ID is session.id
        await setDoc(docRef, removeUndefined(data));
    }

    async getSession(sessionId: string): Promise<StudySession | null> {
        const docRef = doc(db, this.sessionsCollection, sessionId);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) return null;

        // Flatten data back into domain entity
        return {
            id: snapshot.id,
            ...snapshot.data()
        } as StudySession;
    }

    async updateSession(session: StudySession): Promise<void> {
        const docRef = doc(db, this.sessionsCollection, session.id);
        // We only update specific fields to avoid overwriting (though for MVP full rewrite might be okay)
        // Let's rewrite for now as session object is authoritative in this architecture
        const { id, ...data } = session;
        await setDoc(docRef, removeUndefined(data), { merge: true });
    }

    async saveInsight(insight: ExegeticalInsight): Promise<void> {
        // Save as subcollection of session or root collection?
        // Data Model spec says: sessions/{sessionId}/insights/{insightId}
        // But standard practice might be root collection with sessionRef.
        // Let's follow Data Model spec: sessions/{sessionId}/insights/{insightId}

        // Wait, StudySession entity usually contains the list of insights?
        // Let's check StudySession entity definition. For now assuming standalone.
        // Spec: `sessions/{sessionId}/insights/{insightId}`

        // However, I Configured simple root collection `greek_insights` above.
        // Let's align with Spec: Subcollection.

        const insightsRef = collection(db, this.sessionsCollection, insight.sessionId, 'insights');
        const docRef = doc(insightsRef, insight.id);
        const { id, ...data } = insight;
        await setDoc(docRef, removeUndefined(data));
    }

    async getInsightsBySession(sessionId: string): Promise<ExegeticalInsight[]> {
        const insightsRef = collection(db, this.sessionsCollection, sessionId, 'insights');
        const snapshot = await getDocs(insightsRef);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as ExegeticalInsight[];
    }
}
