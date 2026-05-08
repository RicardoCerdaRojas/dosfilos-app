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
    IUserAssignmentBriefRepository,
    UserAssignmentBrief,
    UserAssignmentBriefDraft,
} from '@dosfilos/domain';

/**
 * Firestore implementation of `IUserAssignmentBriefRepository`.
 * Mirrors `FirestoreUserRubricRepository` — top-level
 * `userAssignmentBriefs/{id}` collection with `ownerId` field,
 * default invariant via transaction.
 */
export class FirestoreUserAssignmentBriefRepository implements IUserAssignmentBriefRepository {
    private collectionRef() {
        return collection(db, 'userAssignmentBriefs');
    }

    private docRef(briefId: string) {
        return doc(db, 'userAssignmentBriefs', briefId);
    }

    async listBriefs(ownerId: string): Promise<UserAssignmentBrief[]> {
        const q = query(this.collectionRef(), where('ownerId', '==', ownerId));
        const snap = await getDocs(q);
        return snap.docs
            .map(d => deserialize(d.id, d.data()))
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    async getDefaultBrief(ownerId: string): Promise<UserAssignmentBrief | null> {
        const q = query(
            this.collectionRef(),
            where('ownerId', '==', ownerId),
            where('isDefault', '==', true),
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const briefs = snap.docs.map(d => deserialize(d.id, d.data()));
        briefs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        return briefs[0];
    }

    async getBrief(ownerId: string, briefId: string): Promise<UserAssignmentBrief | null> {
        const snap = await getDoc(this.docRef(briefId));
        if (!snap.exists()) return null;
        const brief = deserialize(snap.id, snap.data());
        if (brief.ownerId !== ownerId) return null;
        return brief;
    }

    async createBrief(draft: UserAssignmentBriefDraft): Promise<UserAssignmentBrief> {
        const ref = doc(this.collectionRef());
        const now = new Date();
        const created: UserAssignmentBrief = {
            id: ref.id,
            ownerId: draft.ownerId,
            displayName: draft.displayName,
            body: draft.body,
            isDefault: draft.isDefault,
            createdAt: now,
            updatedAt: now,
        };
        await setDoc(ref, serialize(created));
        if (created.isDefault) {
            await this.demoteOthers(created.ownerId, created.id);
        }
        return created;
    }

    async updateBrief(
        ownerId: string,
        briefId: string,
        patch: Partial<Pick<UserAssignmentBrief, 'displayName' | 'body'>>,
    ): Promise<UserAssignmentBrief> {
        await this.requireOwned(ownerId, briefId);
        const clean: DocumentData = {};
        if (patch.displayName !== undefined) clean.displayName = patch.displayName;
        if (patch.body !== undefined) clean.body = patch.body;
        clean.updatedAt = new Date();
        await updateDoc(this.docRef(briefId), clean);
        const fresh = await this.getBrief(ownerId, briefId);
        if (!fresh) throw new Error(`Brief ${briefId} not found after update`);
        return fresh;
    }

    async setDefault(ownerId: string, briefId: string): Promise<UserAssignmentBrief> {
        const targetRef = this.docRef(briefId);

        const siblingsQuery = query(
            this.collectionRef(),
            where('ownerId', '==', ownerId),
            where('isDefault', '==', true),
        );
        const siblingsSnap = await getDocs(siblingsQuery);
        const siblingIds = siblingsSnap.docs.map(d => d.id).filter(id => id !== briefId);

        await runTransaction(db, async (tx) => {
            const targetSnap = await tx.get(targetRef);
            if (!targetSnap.exists()) throw new Error(`Brief ${briefId} not found`);
            if (targetSnap.data().ownerId !== ownerId) {
                throw new Error(`Brief ${briefId} not owned by ${ownerId}`);
            }
            const now = new Date();
            tx.update(targetRef, { isDefault: true, updatedAt: now });
            for (const sid of siblingIds) {
                tx.update(this.docRef(sid), { isDefault: false, updatedAt: now });
            }
        });

        const fresh = await this.getBrief(ownerId, briefId);
        if (!fresh) throw new Error(`Brief ${briefId} not found after setDefault`);
        return fresh;
    }

    async deleteBrief(ownerId: string, briefId: string): Promise<void> {
        await this.requireOwned(ownerId, briefId);
        await deleteDoc(this.docRef(briefId));
    }

    private async requireOwned(ownerId: string, briefId: string): Promise<void> {
        const found = await this.getBrief(ownerId, briefId);
        if (!found) {
            throw new Error(`Brief ${briefId} not found or not owned by ${ownerId}`);
        }
    }

    private async demoteOthers(ownerId: string, exceptId: string): Promise<void> {
        const q = query(
            this.collectionRef(),
            where('ownerId', '==', ownerId),
            where('isDefault', '==', true),
        );
        const snap = await getDocs(q);
        const now = new Date();
        await Promise.all(
            snap.docs
                .filter(d => d.id !== exceptId)
                .map(d => updateDoc(d.ref, { isDefault: false, updatedAt: now })),
        );
    }
}

function serialize(brief: UserAssignmentBrief): DocumentData {
    return {
        ownerId: brief.ownerId,
        displayName: brief.displayName,
        body: brief.body,
        isDefault: brief.isDefault,
        createdAt: brief.createdAt,
        updatedAt: brief.updatedAt,
    };
}

function deserialize(id: string, data: DocumentData): UserAssignmentBrief {
    return {
        id,
        ownerId: data.ownerId,
        displayName: data.displayName ?? '',
        body: data.body ?? '',
        isDefault: !!data.isDefault,
        createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt ?? new Date(),
    };
}
