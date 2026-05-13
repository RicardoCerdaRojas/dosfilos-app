import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    increment,
    query,
    orderBy,
    where,
    writeBatch,
    Timestamp,
    arrayUnion,
    arrayRemove,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
    Extraction,
    IExtractionRepository,
    CreateExtractionInput,
} from '@dosfilos/domain';

/**
 * Top-level `extractions/` collection. Documents are scoped per-user
 * via the required `userId` field; rules enforce ownership. The
 * top-level shape (vs nested under sessions) is what lets us cheaply
 * answer "all my extractions across sessions" and "all extractions in
 * project X" — both are simple `where` queries.
 *
 * Document shape mirrors the domain `Extraction` interface 1:1 except
 * for the timestamp fields which round-trip through Firestore
 * `Timestamp`. `null` (not undefined) is used for empty optional refs
 * so the field always exists for query/index purposes.
 */
export class FirestoreExtractionRepository implements IExtractionRepository {
    private getCollectionRef() {
        return collection(db, 'extractions');
    }

    private getDocRef(extractionId: string) {
        return doc(db, 'extractions', extractionId);
    }

    private fromFirestore(snap: { id: string; data: () => any }): Extraction {
        const data = snap.data();
        // Lazy migration: pre-2026-05-13 docs stored a single
        // `projectId: string | null` field. Coerce to the new
        // `projectIds: string[]` shape on read so the entity is
        // consistent regardless of when the doc was created.
        const projectIds: string[] = Array.isArray(data.projectIds)
            ? data.projectIds
            : (data.projectId ? [data.projectId] : []);
        return {
            id: snap.id,
            userId: data.userId,
            sessionId: data.sessionId ?? null,
            projectIds,
            type: data.type,
            title: data.title,
            markdown: data.markdown,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
            derivedFromMessageIds: data.derivedFromMessageIds ?? [],
            externalRef: data.externalRef ?? null,
            version: data.version ?? 1,
            sourceSessionDeleted: data.sourceSessionDeleted ?? false,
        };
    }

    async create(input: CreateExtractionInput): Promise<Extraction> {
        const docRef = doc(this.getCollectionRef());
        const now = new Date();
        const extraction: Extraction = {
            id: docRef.id,
            userId: input.userId,
            sessionId: input.sessionId,
            projectIds: input.projectIds ?? [],
            type: input.type,
            title: input.title,
            markdown: input.markdown,
            createdAt: now,
            updatedAt: now,
            derivedFromMessageIds: input.derivedFromMessageIds,
            externalRef: input.externalRef ?? null,
            version: 1,
        };
        try {
            await setDoc(docRef, {
                ...extraction,
                createdAt: Timestamp.fromDate(now),
                updatedAt: Timestamp.fromDate(now),
            });
        } catch (err) {
            // Surface write failures — without this log a rejected
            // setDoc (rules mismatch, network) reads as a silent
            // success because the in-memory Extraction is still
            // returned to the caller and rendered in the editor.
            console.error('[FirestoreExtractionRepository.create] setDoc failed', {
                userId: input.userId,
                sessionId: input.sessionId,
                type: input.type,
                error: err,
            });
            throw err;
        }
        console.info('[FirestoreExtractionRepository.create] wrote extraction', {
            id: extraction.id,
            userId: extraction.userId,
            sessionId: extraction.sessionId,
            type: extraction.type,
        });
        return extraction;
    }

    async getById(userId: string, extractionId: string): Promise<Extraction | null> {
        const snap = await getDoc(this.getDocRef(extractionId));
        if (!snap.exists()) return null;
        const data = snap.data();
        if (data.userId !== userId) return null;
        return this.fromFirestore(snap);
    }

    async listBySession(userId: string, sessionId: string): Promise<Extraction[]> {
        const q = query(
            this.getCollectionRef(),
            where('userId', '==', userId),
            where('sessionId', '==', sessionId),
            orderBy('createdAt', 'desc'),
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => this.fromFirestore(d));
    }

    async listByProject(userId: string, projectId: string): Promise<Extraction[]> {
        const q = query(
            this.getCollectionRef(),
            where('userId', '==', userId),
            where('projectIds', 'array-contains', projectId),
            orderBy('createdAt', 'desc'),
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => this.fromFirestore(d));
    }

    async listByUser(userId: string): Promise<Extraction[]> {
        const q = query(
            this.getCollectionRef(),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => this.fromFirestore(d));
    }

    async updateMarkdown(userId: string, extractionId: string, markdown: string): Promise<void> {
        const docRef = this.getDocRef(extractionId);
        const snap = await getDoc(docRef);
        if (!snap.exists() || snap.data().userId !== userId) {
            throw new Error('Extraction not found or not owned by user');
        }
        await updateDoc(docRef, {
            markdown,
            version: increment(1),
            updatedAt: Timestamp.fromDate(new Date()),
        });
    }

    async rename(userId: string, extractionId: string, title: string): Promise<void> {
        const docRef = this.getDocRef(extractionId);
        const snap = await getDoc(docRef);
        if (!snap.exists() || snap.data().userId !== userId) {
            throw new Error('Extraction not found or not owned by user');
        }
        await updateDoc(docRef, {
            title,
            updatedAt: Timestamp.fromDate(new Date()),
        });
    }

    async addToProject(userId: string, extractionId: string, projectId: string): Promise<void> {
        const docRef = this.getDocRef(extractionId);
        const snap = await getDoc(docRef);
        if (!snap.exists() || snap.data().userId !== userId) {
            throw new Error('Extraction not found or not owned by user');
        }
        // arrayUnion is idempotent + safe under concurrent edits.
        // Also clears the legacy `projectId` field so docs migrated
        // from the v1 single-pin schema can't drift back into ambiguity.
        await updateDoc(docRef, {
            projectIds: arrayUnion(projectId),
            projectId: null,
            updatedAt: Timestamp.fromDate(new Date()),
        });
    }

    async removeFromProject(userId: string, extractionId: string, projectId: string): Promise<void> {
        const docRef = this.getDocRef(extractionId);
        const snap = await getDoc(docRef);
        if (!snap.exists() || snap.data().userId !== userId) {
            throw new Error('Extraction not found or not owned by user');
        }
        await updateDoc(docRef, {
            projectIds: arrayRemove(projectId),
            projectId: null,
            updatedAt: Timestamp.fromDate(new Date()),
        });
    }

    async delete(userId: string, extractionId: string): Promise<void> {
        const docRef = this.getDocRef(extractionId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) return;
        if (snap.data().userId !== userId) {
            throw new Error('Extraction not owned by user');
        }
        await deleteDoc(docRef);
    }

    async orphanBySession(userId: string, sessionId: string): Promise<void> {
        const q = query(
            this.getCollectionRef(),
            where('userId', '==', userId),
            where('sessionId', '==', sessionId),
        );
        const snap = await getDocs(q);
        if (snap.empty) return;
        const batch = writeBatch(db);
        const now = Timestamp.fromDate(new Date());
        snap.docs.forEach(d => batch.update(d.ref, {
            sessionId: null,
            sourceSessionDeleted: true,
            updatedAt: now,
        }));
        await batch.commit();
    }

    async orphanByProject(userId: string, projectId: string): Promise<void> {
        const q = query(
            this.getCollectionRef(),
            where('userId', '==', userId),
            where('projectIds', 'array-contains', projectId),
        );
        const snap = await getDocs(q);
        if (snap.empty) return;
        const batch = writeBatch(db);
        const now = Timestamp.fromDate(new Date());
        snap.docs.forEach(d => batch.update(d.ref, {
            projectIds: arrayRemove(projectId),
            projectId: null,
            updatedAt: now,
        }));
        await batch.commit();
    }
}
