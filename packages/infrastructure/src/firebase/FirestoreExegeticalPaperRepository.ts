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
    type DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
    ExegeticalPaper,
    ExegeticalPaperDraft,
    ExegeticalPaperPhase,
    ExegeticalStep,
    ExegeticalStepState,
    ExegeticalStepVersion,
    IExegeticalPaperRepository,
    ProjectSource,
} from '@dosfilos/domain';

/**
 * Firestore implementation of `IExegeticalPaperRepository`.
 *
 * Document layout:
 *   exegeticalPapers/{paperId}                ← top-level
 *     - ownerId, passage, displayLanguage, title, styleGuideId
 *     - phase, currentStepId, assembledMarkdown, archivedAt
 *     - createdAt, updatedAt (Firestore Timestamps)
 *     - sources: ProjectSource[]              ← stored inline (small,
 *                                               always loaded with paper)
 *     - steps:   ExegeticalStep[]             ← stored inline (small in
 *                                               v1; if step versions grow
 *                                               unbounded later, split to
 *                                               a subcollection)
 *
 * The inline-array decision is deliberate for v1: an exegetical paper has
 * O(passage-verse-count + 3) steps (typically <30) and one accepted version
 * per step at any point. Document size stays well under the 1 MiB limit.
 * Splitting to subcollections costs us atomic reads of "the whole paper"
 * which the wizard relies on. We can shard later if needed.
 *
 * v1 implements only the methods the setup wizard and list page use:
 * paper CRUD + archive. Step and source mutations exist as 'not implemented'
 * stubs that throw — they're filled in as the wizard grows beyond setup.
 */
export class FirestoreExegeticalPaperRepository implements IExegeticalPaperRepository {
    private collectionRef() {
        return collection(db, 'exegeticalPapers');
    }

    private docRef(paperId: string) {
        return doc(db, 'exegeticalPapers', paperId);
    }

    // ── Papers ────────────────────────────────────────────────────────────

    async listPapers(ownerId: string): Promise<ExegeticalPaper[]> {
        const q = query(
            this.collectionRef(),
            where('ownerId', '==', ownerId)
            // orderBy intentionally omitted — sorting is client-side to avoid
            // requiring a composite index for what is a small list per user.
        );
        const snap = await getDocs(q);
        return snap.docs
            .map(d => deserialize(d.id, d.data()))
            .filter(p => p.archivedAt === null)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    async listAllPapers(ownerId: string): Promise<ExegeticalPaper[]> {
        const q = query(this.collectionRef(), where('ownerId', '==', ownerId));
        const snap = await getDocs(q);
        return snap.docs
            .map(d => deserialize(d.id, d.data()))
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    async getPaper(ownerId: string, paperId: string): Promise<ExegeticalPaper | null> {
        const snap = await getDoc(this.docRef(paperId));
        if (!snap.exists()) return null;
        const paper = deserialize(snap.id, snap.data());
        // Defense in depth: enforce ownership at the repo even though
        // Firestore rules also do. A hand-crafted client could try to read
        // with the wrong uid; we double-check.
        if (paper.ownerId !== ownerId) return null;
        return paper;
    }

    async createPaper(draft: ExegeticalPaperDraft): Promise<ExegeticalPaper> {
        const ref = doc(this.collectionRef());
        const now = new Date();
        const paper: ExegeticalPaper = {
            id: ref.id,
            ownerId: draft.ownerId,
            createdAt: now,
            updatedAt: now,
            passage: draft.passage,
            displayLanguage: draft.displayLanguage,
            title: draft.title,
            styleGuideId: draft.styleGuideId,
            sources: draft.sources,
            phase: 'configuring',
            steps: [],
            currentStepId: null,
            assembledMarkdown: null,
            archivedAt: null,
        };
        await setDoc(ref, serialize(paper));
        return paper;
    }

    async updatePaper(
        ownerId: string,
        paperId: string,
        patch: Partial<Pick<ExegeticalPaper, 'title' | 'displayLanguage' | 'styleGuideId' | 'currentStepId' | 'assembledMarkdown'>>
    ): Promise<ExegeticalPaper> {
        await this.requireOwned(ownerId, paperId);
        // Strip undefined — Firestore rejects undefined values; null is fine.
        const clean = Object.fromEntries(
            Object.entries(patch).filter(([, v]) => v !== undefined)
        );
        await updateDoc(this.docRef(paperId), { ...clean, updatedAt: new Date() });
        const fresh = await this.getPaper(ownerId, paperId);
        if (!fresh) throw new Error(`Paper ${paperId} not found after update`);
        return fresh;
    }

    async setPhase(ownerId: string, paperId: string, phase: ExegeticalPaperPhase): Promise<ExegeticalPaper> {
        await this.requireOwned(ownerId, paperId);
        await updateDoc(this.docRef(paperId), { phase, updatedAt: new Date() });
        const fresh = await this.getPaper(ownerId, paperId);
        if (!fresh) throw new Error(`Paper ${paperId} not found after setPhase`);
        return fresh;
    }

    async archivePaper(ownerId: string, paperId: string): Promise<ExegeticalPaper> {
        await this.requireOwned(ownerId, paperId);
        await updateDoc(this.docRef(paperId), {
            archivedAt: new Date(),
            updatedAt: new Date(),
        });
        const fresh = await this.getPaper(ownerId, paperId);
        if (!fresh) throw new Error(`Paper ${paperId} not found after archive`);
        return fresh;
    }

    async unarchivePaper(ownerId: string, paperId: string): Promise<ExegeticalPaper> {
        await this.requireOwned(ownerId, paperId);
        await updateDoc(this.docRef(paperId), {
            archivedAt: null,
            updatedAt: new Date(),
        });
        const fresh = await this.getPaper(ownerId, paperId);
        if (!fresh) throw new Error(`Paper ${paperId} not found after unarchive`);
        return fresh;
    }

    async hardDeletePaper(ownerId: string, paperId: string): Promise<void> {
        await this.requireOwned(ownerId, paperId);
        await deleteDoc(this.docRef(paperId));
    }

    // ── Sources, steps — v1 stubs ─────────────────────────────────────────
    //
    // These are declared on the interface so the wizard and orchestrator can
    // depend on the contract; v1 doesn't exercise them yet (the setup
    // wizard's source step is a v1.5 placeholder, and generation hasn't
    // been wired). Stubbing as 'not implemented' makes the gap explicit
    // rather than silently passing back stale data.

    async addSource(): Promise<ProjectSource> {
        throw notImplemented('addSource');
    }
    async updateSource(): Promise<ProjectSource> {
        throw notImplemented('updateSource');
    }
    async removeSource(): Promise<void> {
        throw notImplemented('removeSource');
    }

    async seedStepsForPassage(): Promise<ExegeticalStep[]> {
        throw notImplemented('seedStepsForPassage');
    }
    async setStepState(
        _ownerId: string,
        _paperId: string,
        _stepId: string,
        _state: ExegeticalStepState
    ): Promise<ExegeticalStep> {
        throw notImplemented('setStepState');
    }
    async appendStepVersion(
        _ownerId: string,
        _paperId: string,
        _stepId: string,
        _version: Omit<ExegeticalStepVersion, 'id' | 'createdAt'>
    ): Promise<ExegeticalStepVersion> {
        throw notImplemented('appendStepVersion');
    }
    async acceptStepVersion(): Promise<ExegeticalStep> {
        throw notImplemented('acceptStepVersion');
    }
    async saveManualEdit(): Promise<ExegeticalStep> {
        throw notImplemented('saveManualEdit');
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private async requireOwned(ownerId: string, paperId: string): Promise<void> {
        const paper = await this.getPaper(ownerId, paperId);
        if (!paper) {
            throw new Error(`Paper ${paperId} not found or not owned by ${ownerId}`);
        }
    }
}

// ── Serialization ───────────────────────────────────────────────────────
//
// Firestore stores `Date` as Timestamp and rejects `undefined`. We convert
// in/out at the boundary so the rest of the app works with native `Date`
// and `null` (which Firestore handles).

function serialize(paper: ExegeticalPaper): DocumentData {
    const data: DocumentData = {
        ownerId: paper.ownerId,
        createdAt: paper.createdAt,
        updatedAt: paper.updatedAt,
        passage: paper.passage,
        displayLanguage: paper.displayLanguage,
        styleGuideId: paper.styleGuideId,
        sources: paper.sources,
        phase: paper.phase,
        steps: paper.steps,
        currentStepId: paper.currentStepId,
        assembledMarkdown: paper.assembledMarkdown,
        archivedAt: paper.archivedAt,
    };
    if (paper.title !== undefined) data.title = paper.title;
    return data;
}

function deserialize(id: string, data: DocumentData): ExegeticalPaper {
    return {
        id,
        ownerId: data.ownerId,
        createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt ?? new Date(),
        passage: data.passage,
        displayLanguage: data.displayLanguage ?? 'es',
        title: data.title,
        styleGuideId: data.styleGuideId ?? null,
        sources: Array.isArray(data.sources) ? data.sources : [],
        phase: data.phase ?? 'configuring',
        steps: Array.isArray(data.steps) ? data.steps : [],
        currentStepId: data.currentStepId ?? null,
        assembledMarkdown: data.assembledMarkdown ?? null,
        archivedAt: data.archivedAt?.toDate?.() ?? data.archivedAt ?? null,
    };
}

function notImplemented(method: string): Error {
    return new Error(
        `[FirestoreExegeticalPaperRepository.${method}] not implemented in v1 — ` +
        `this method is wired in a later commit when the wizard exercises it.`
    );
}
