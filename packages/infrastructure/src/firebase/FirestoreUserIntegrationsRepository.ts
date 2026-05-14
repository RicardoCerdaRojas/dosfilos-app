import { doc, getDoc, setDoc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { IUserIntegrationsRepository, WordpressIntegration } from '@dosfilos/domain';

export class FirestoreUserIntegrationsRepository implements IUserIntegrationsRepository {
    private wordpressRef(userId: string) {
        return doc(db, 'users', userId, 'integrations', 'wordpress');
    }

    async getWordpress(userId: string): Promise<WordpressIntegration | null> {
        const snap = await getDoc(this.wordpressRef(userId));
        if (!snap.exists()) return null;
        const data = snap.data();
        return {
            siteUrl: data.siteUrl,
            username: data.username,
            appPassword: data.appPassword,
            defaultStatus: data.defaultStatus ?? 'draft',
            connectedAt: data.connectedAt?.toDate?.() ?? new Date(),
            lastPublishedAt: data.lastPublishedAt?.toDate?.() ?? null,
            lastError: data.lastError ?? null,
        };
    }

    async saveWordpress(userId: string, config: Omit<WordpressIntegration, 'connectedAt' | 'lastPublishedAt' | 'lastError'>): Promise<void> {
        const ref = this.wordpressRef(userId);
        const existing = await getDoc(ref);
        const connectedAt = existing.exists()
            ? (existing.data().connectedAt ?? Timestamp.now())
            : Timestamp.now();
        await setDoc(ref, {
            siteUrl: config.siteUrl.replace(/\/$/, ''),
            username: config.username.trim(),
            appPassword: config.appPassword.trim(),
            defaultStatus: config.defaultStatus,
            connectedAt,
            lastError: null,
        }, { merge: true });
    }

    async deleteWordpress(userId: string): Promise<void> {
        await deleteDoc(this.wordpressRef(userId));
    }

    async markWordpressPublished(userId: string): Promise<void> {
        await updateDoc(this.wordpressRef(userId), {
            lastPublishedAt: Timestamp.now(),
            lastError: null,
        });
    }

    async markWordpressError(userId: string, error: string): Promise<void> {
        await updateDoc(this.wordpressRef(userId), {
            lastError: error.slice(0, 500),
        });
    }
}
