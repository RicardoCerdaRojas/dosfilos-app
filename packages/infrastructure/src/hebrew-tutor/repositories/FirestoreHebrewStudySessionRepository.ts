import type { HebrewStudySession } from '@dosfilos/domain';
import { db } from '../../config/firebase';
import {
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    Timestamp,
} from 'firebase/firestore';

const COLLECTION = 'hebrew_user_sessions';

/**
 * Per-user record of Hebrew study activity. Distinct from
 * `hebrew_analysis_cache` (global per-passage cache shared across users) —
 * this collection tracks each user's own trail of study + project linking.
 *
 * The deterministic id is `${userId}__${slug(passage)}` so calls are
 * idempotent: re-analyzing the same passage just bumps `updatedAt`, doesn't
 * create duplicates.
 */
export class FirestoreHebrewStudySessionRepository {
    private buildId(userId: string, passage: string): string {
        const slug = passage.replace(/[^a-zA-Z0-9]+/g, '_');
        return `${userId}__${slug}`;
    }

    /**
     * Records (or refreshes) a per-user study session. `projectId` is preserved
     * if not provided (won't accidentally clear an existing project link).
     */
    async recordActivity(params: {
        userId: string;
        passage: string;
        projectId?: string | null;
    }): Promise<string> {
        const id = this.buildId(params.userId, params.passage);
        const ref = doc(db, COLLECTION, id);

        const base: Record<string, unknown> = {
            userId: params.userId,
            passage: params.passage,
            updatedAt: serverTimestamp(),
            // createdAt is only set on first write thanks to merge:true
            createdAt: serverTimestamp(),
        };
        if (params.projectId !== undefined) {
            base.projectId = params.projectId; // null clears it; string sets it
        }

        await setDoc(ref, base, { merge: true });
        return id;
    }

    async getAllByUser(userId: string): Promise<HebrewStudySession[]> {
        const q = query(collection(db, COLLECTION), where('userId', '==', userId));
        const snap = await getDocs(q);
        const out: HebrewStudySession[] = [];
        snap.forEach((d) => {
            const data = d.data();
            out.push({
                id: d.id,
                userId: data.userId,
                passage: data.passage,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
                projectId: data.projectId ?? undefined,
            });
        });
        return out;
    }

    async linkToProject(sessionId: string, projectId: string | null): Promise<void> {
        const ref = doc(db, COLLECTION, sessionId);
        await updateDoc(ref, {
            projectId: projectId ?? null,
            updatedAt: serverTimestamp(),
        });
    }
}
