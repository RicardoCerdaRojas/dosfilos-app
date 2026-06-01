import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    writeBatch
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';
import { AIChatSession, IAIChatRepository, AIChatMessage } from '@dosfilos/domain';

export class FirestoreAIChatRepository implements IAIChatRepository {
    private getCollectionRef(userId: string) {
        return collection(db, 'users', userId, 'ai_sessions');
    }

    private getDocRef(userId: string, sessionId: string) {
        return doc(db, 'users', userId, 'ai_sessions', sessionId);
    }

    async getSession(userId: string, sessionId: string): Promise<AIChatSession | null> {
        const docRef = this.getDocRef(userId, sessionId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            messages: this.ensureMessageIds(data.messages || []),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as AIChatSession;
    }

    private ensureMessageIds(messages: any[]): AIChatMessage[] {
        return messages.map((m, index) => ({
            ...m,
            id: m.id || `legacy-${m.timestamp?.seconds || '0'}-${index}`,
            timestamp: m.timestamp?.toDate ? m.timestamp.toDate() : (m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp))
        }));
    }

    async getUserSessions(userId: string): Promise<AIChatSession[]> {
        const q = query(
            this.getCollectionRef(userId),
            orderBy('updatedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                messages: this.ensureMessageIds(data.messages || []),
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            } as AIChatSession;
        });
    }

    /**
     * Trimmed list read — delegates to the `getFacultyDashboardSessions`
     * callable, which reads server-side and strips each session's `messages[]`
     * (heavy) down to a `messageCount`. Used by the sidebar/dashboard so the
     * full transcripts don't cross the wire just to draw the list.
     */
    async getUserSessionSummaries(userId: string): Promise<AIChatSession[]> {
        const callable = httpsCallable<
            Record<string, never>,
            { sessions: any[]; truncated: boolean }
        >(getFunctions(), 'getFacultyDashboardSessions');
        const res = await callable({});
        return (res.data.sessions ?? []).map((s: any) => ({
            id: s.id,
            userId: s.userId,
            agentId: s.agentId,
            title: s.title,
            projectId: s.projectId,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
            messages: [],
            messageCount: typeof s.messageCount === 'number' ? s.messageCount : 0,
            context: s.context,
            guidedSermonSession: s.guidedSermonSession,
        } as AIChatSession));
    }

    async createSession(sessionData: Omit<AIChatSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIChatSession> {
        const docRef = doc(this.getCollectionRef(sessionData.userId));

        const newSession: AIChatSession = {
            ...sessionData,
            id: docRef.id,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await setDoc(docRef, newSession);

        return newSession;
    }

    async updateSession(session: AIChatSession): Promise<void> {
        const docRef = this.getDocRef(session.userId, session.id);
        const updateData = {
            ...session,
            updatedAt: new Date()
        };

        await updateDoc(docRef, updateData);
    }

    async deleteSession(userId: string, sessionId: string): Promise<void> {
        const docRef = this.getDocRef(userId, sessionId);
        await deleteDoc(docRef);
    }

    async updateSessionProject(userId: string, sessionId: string, projectId: string | null): Promise<void> {
        const docRef = this.getDocRef(userId, sessionId);
        await updateDoc(docRef, { projectId: projectId ?? null, updatedAt: new Date() });
    }

    async renameSession(userId: string, sessionId: string, title: string): Promise<void> {
        const docRef = this.getDocRef(userId, sessionId);
        await updateDoc(docRef, { title: title.trim(), updatedAt: new Date() });
    }

    async updateGuidedSermonSession(
        userId: string,
        sessionId: string,
        guidedSermonSession: AIChatSession['guidedSermonSession'] | null,
    ): Promise<void> {
        const docRef = this.getDocRef(userId, sessionId);
        // Firestore rejects `undefined`; passing null clears the field.
        await updateDoc(docRef, {
            guidedSermonSession: guidedSermonSession ?? null,
            updatedAt: new Date(),
        });
    }

    async clearProjectFromSessions(userId: string, projectId: string): Promise<void> {
        const q = query(
            this.getCollectionRef(userId),
            where('projectId', '==', projectId)
        );
        const snap = await getDocs(q);
        if (snap.empty) return;
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.update(d.ref, { projectId: null, updatedAt: new Date() }));
        await batch.commit();
    }

    async addMessageToSession(userId: string, sessionId: string, message: AIChatMessage): Promise<void> {
        const session = await this.getSession(userId, sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found for user ${userId}`);
        }

        const updatedMessages = [...session.messages, message];
        await this.updateSession({
            ...session,
            messages: updatedMessages
        });
    }

    async deleteMessage(userId: string, sessionId: string, messageId: string): Promise<void> {
        const session = await this.getSession(userId, sessionId);
        if (!session) return;

        const updatedMessages = session.messages.filter(m => m.id !== messageId);
        await this.updateSession({
            ...session,
            messages: updatedMessages
        });
    }
}
