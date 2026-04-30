import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    runTransaction,
    type DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
    UserStyleGuide,
    UserStyleGuideDraft,
    IUserStyleGuideRepository,
} from '@dosfilos/domain';

/**
 * Firestore implementation of `IUserStyleGuideRepository`.
 *
 * Document layout: top-level `userStyleGuides/{guideId}` with `ownerId` field
 * (parallels `exegeticalPapers` and `ai_projects`). The collection is queried
 * by `ownerId` for listing; rules enforce owner-only access.
 *
 * Active-guide invariant: at most one guide per user has `isActive: true`.
 * Maintained by `setActive` via a Firestore transaction that flips the prior
 * active guide off and the target guide on atomically.
 */
export class FirestoreUserStyleGuideRepository implements IUserStyleGuideRepository {
    private collectionRef() {
        return collection(db, 'userStyleGuides');
    }

    private docRef(guideId: string) {
        return doc(db, 'userStyleGuides', guideId);
    }

    async listGuides(ownerId: string): Promise<UserStyleGuide[]> {
        const q = query(this.collectionRef(), where('ownerId', '==', ownerId));
        const snap = await getDocs(q);
        return snap.docs
            .map(d => deserialize(d.id, d.data()))
            .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    }

    async getActiveGuide(ownerId: string): Promise<UserStyleGuide | null> {
        const q = query(
            this.collectionRef(),
            where('ownerId', '==', ownerId),
            where('isActive', '==', true)
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;
        // If invariant is intact there's exactly one; if multiple exist
        // (data corruption), return the most recently uploaded — `setActive`
        // will heal the invariant on the next call.
        const guides = snap.docs.map(d => deserialize(d.id, d.data()));
        guides.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
        return guides[0];
    }

    async getGuide(ownerId: string, guideId: string): Promise<UserStyleGuide | null> {
        const snap = await getDoc(this.docRef(guideId));
        if (!snap.exists()) return null;
        const guide = deserialize(snap.id, snap.data());
        if (guide.ownerId !== ownerId) return null;
        return guide;
    }

    async createGuide(draft: UserStyleGuideDraft): Promise<UserStyleGuide> {
        const ref = doc(this.collectionRef());
        const now = new Date();
        const guide: UserStyleGuide = {
            id: ref.id,
            ownerId: draft.ownerId,
            displayName: draft.displayName,
            corpusId: draft.corpusId,
            version: draft.version,
            isActive: draft.isActive,
            uploadedAt: now,
            updatedAt: now,
        };
        await setDoc(ref, serialize(guide));
        // If the new guide is active, deactivate any other active guides
        // so we don't briefly violate the invariant.
        if (guide.isActive) {
            await this.deactivateOthers(guide.ownerId, guide.id);
        }
        return guide;
    }

    async updateGuide(
        ownerId: string,
        guideId: string,
        patch: Partial<Pick<UserStyleGuide, 'displayName' | 'version'>>
    ): Promise<UserStyleGuide> {
        await this.requireOwned(ownerId, guideId);
        const clean = Object.fromEntries(
            Object.entries(patch).filter(([, v]) => v !== undefined)
        );
        await updateDoc(this.docRef(guideId), { ...clean, updatedAt: new Date() });
        const fresh = await this.getGuide(ownerId, guideId);
        if (!fresh) throw new Error(`Guide ${guideId} not found after update`);
        return fresh;
    }

    /**
     * Atomically activate the target guide and deactivate any other active
     * guide for the same owner. Uses a Firestore transaction so a concurrent
     * call can't leave two guides flagged active.
     */
    async setActive(ownerId: string, guideId: string): Promise<UserStyleGuide> {
        const targetRef = this.docRef(guideId);

        // First, fetch siblings outside the transaction (transactions can
        // only `tx.get` documents, not run queries). We accept a small race:
        // if another guide is activated between this read and the write,
        // the next setActive call will heal the invariant.
        const siblingsQuery = query(
            this.collectionRef(),
            where('ownerId', '==', ownerId),
            where('isActive', '==', true)
        );
        const siblingsSnap = await getDocs(siblingsQuery);
        const siblingIds = siblingsSnap.docs.map(d => d.id).filter(id => id !== guideId);

        await runTransaction(db, async (tx) => {
            const targetSnap = await tx.get(targetRef);
            if (!targetSnap.exists()) {
                throw new Error(`Guide ${guideId} not found`);
            }
            if (targetSnap.data().ownerId !== ownerId) {
                throw new Error(`Guide ${guideId} not owned by ${ownerId}`);
            }

            const now = new Date();
            tx.update(targetRef, { isActive: true, updatedAt: now });
            for (const sid of siblingIds) {
                tx.update(this.docRef(sid), { isActive: false, updatedAt: now });
            }
        });

        const fresh = await this.getGuide(ownerId, guideId);
        if (!fresh) throw new Error(`Guide ${guideId} not found after setActive`);
        return fresh;
    }

    async deleteGuide(ownerId: string, guideId: string): Promise<void> {
        await this.requireOwned(ownerId, guideId);
        // The interface contract says the implementation should reject if a
        // non-archived paper references this guide. v1 doesn't track that
        // back-reference cheaply (no inverse index), so we accept the
        // orphan risk for now — `paper.styleGuideId` will dangle and the
        // orchestrator can detect it. Adding an inverse-index check is on
        // the roadmap when we wire the generator.
        await deleteDoc(this.docRef(guideId));
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private async requireOwned(ownerId: string, guideId: string): Promise<void> {
        const guide = await this.getGuide(ownerId, guideId);
        if (!guide) {
            throw new Error(`Guide ${guideId} not found or not owned by ${ownerId}`);
        }
    }

    private async deactivateOthers(ownerId: string, exceptGuideId: string): Promise<void> {
        const q = query(
            this.collectionRef(),
            where('ownerId', '==', ownerId),
            where('isActive', '==', true)
        );
        const snap = await getDocs(q);
        const now = new Date();
        await Promise.all(
            snap.docs
                .filter(d => d.id !== exceptGuideId)
                .map(d => updateDoc(d.ref, { isActive: false, updatedAt: now }))
        );
    }
}

// ── Serialization ───────────────────────────────────────────────────────

function serialize(guide: UserStyleGuide): DocumentData {
    const data: DocumentData = {
        ownerId: guide.ownerId,
        displayName: guide.displayName,
        corpusId: guide.corpusId,
        isActive: guide.isActive,
        uploadedAt: guide.uploadedAt,
        updatedAt: guide.updatedAt,
        version: guide.version, // can be null; Firestore accepts null
    };
    return data;
}

function deserialize(id: string, data: DocumentData): UserStyleGuide {
    return {
        id,
        ownerId: data.ownerId,
        displayName: data.displayName ?? '',
        corpusId: data.corpusId ?? '',
        version: data.version ?? null,
        isActive: !!data.isActive,
        uploadedAt: data.uploadedAt?.toDate?.() ?? data.uploadedAt ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt ?? new Date(),
    };
}
