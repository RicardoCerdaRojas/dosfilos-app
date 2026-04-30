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
    ExegeticalPaper,
    ExegeticalPaperDraft,
    ExegeticalPaperPhase,
    ExegeticalStep,
    ExegeticalStepKind,
    ExegeticalStepState,
    ExegeticalStepVersion,
    IExegeticalPaperRepository,
    ProjectSource,
} from '@dosfilos/domain';
import { EMPTY_VERIFICATION_SUMMARY } from '@dosfilos/domain';

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

    // ── Sources ───────────────────────────────────────────────────────────
    //
    // Sources are stored inline in `paper.sources`. Mutations run inside a
    // Firestore transaction so two tabs of the same user adding sources at
    // the same time can't lose writes (read-modify-write race). Owner check
    // happens inside the transaction against `data.ownerId`.

    async addSource(
        ownerId: string,
        paperId: string,
        source: Omit<ProjectSource, 'id' | 'paperId' | 'createdAt'>
    ): Promise<ProjectSource> {
        const ref = this.docRef(paperId);
        const newSource: ProjectSource = {
            id: crypto.randomUUID(),
            paperId,
            createdAt: new Date(),
            corpusId: source.corpusId,
            role: source.role,
            displayLabel: source.displayLabel,
            citationKey: source.citationKey,
            order: source.order,
        };

        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) {
                throw new Error(`Paper ${paperId} not found`);
            }
            const data = snap.data();
            if (data.ownerId !== ownerId) {
                throw new Error(`Paper ${paperId} not owned by ${ownerId}`);
            }
            const sources: ProjectSource[] = Array.isArray(data.sources) ? data.sources : [];
            sources.push(newSource);
            tx.update(ref, {
                sources,
                updatedAt: new Date(),
            });
        });

        return newSource;
    }

    async updateSource(
        ownerId: string,
        paperId: string,
        sourceId: string,
        patch: Partial<Pick<ProjectSource, 'role' | 'displayLabel' | 'citationKey' | 'order'>>
    ): Promise<ProjectSource> {
        const ref = this.docRef(paperId);
        let updated: ProjectSource | null = null;

        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) {
                throw new Error(`Paper ${paperId} not found`);
            }
            const data = snap.data();
            if (data.ownerId !== ownerId) {
                throw new Error(`Paper ${paperId} not owned by ${ownerId}`);
            }
            const sources: ProjectSource[] = Array.isArray(data.sources) ? [...data.sources] : [];
            const idx = sources.findIndex(s => s.id === sourceId);
            if (idx === -1) {
                throw new Error(`Source ${sourceId} not found in paper ${paperId}`);
            }
            // Only apply defined keys — undefined would erase the existing value.
            const merged: ProjectSource = { ...sources[idx] };
            if (patch.role !== undefined) merged.role = patch.role;
            if (patch.displayLabel !== undefined) merged.displayLabel = patch.displayLabel;
            if (patch.citationKey !== undefined) merged.citationKey = patch.citationKey;
            if (patch.order !== undefined) merged.order = patch.order;
            sources[idx] = merged;
            updated = merged;
            tx.update(ref, {
                sources,
                updatedAt: new Date(),
            });
        });

        if (!updated) throw new Error('Source update failed');
        return updated;
    }

    async removeSource(ownerId: string, paperId: string, sourceId: string): Promise<void> {
        const ref = this.docRef(paperId);

        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) {
                throw new Error(`Paper ${paperId} not found`);
            }
            const data = snap.data();
            if (data.ownerId !== ownerId) {
                throw new Error(`Paper ${paperId} not owned by ${ownerId}`);
            }
            const sources: ProjectSource[] = Array.isArray(data.sources) ? data.sources : [];
            const filtered = sources.filter(s => s.id !== sourceId);
            tx.update(ref, {
                sources: filtered,
                updatedAt: new Date(),
            });
        });
    }

    // ── Steps ─────────────────────────────────────────────────────────────
    //
    // Steps live inline on the paper (`paper.steps`). Mutations run inside
    // a Firestore transaction so concurrent updates from the same user
    // (e.g. accepting one step while a regen of another finishes) can't
    // corrupt the array via read-modify-write races.

    async seedStepsForPassage(ownerId: string, paperId: string): Promise<ExegeticalStep[]> {
        const ref = this.docRef(paperId);
        let result: ExegeticalStep[] = [];

        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) {
                throw new Error(`Paper ${paperId} not found`);
            }
            const data = snap.data();
            if (data.ownerId !== ownerId) {
                throw new Error(`Paper ${paperId} not owned by ${ownerId}`);
            }

            const existing: ExegeticalStep[] = Array.isArray(data.steps) ? data.steps : [];
            // Idempotent: if any step exists, return existing untouched.
            if (existing.length > 0) {
                result = existing;
                return;
            }

            // Compute the verse list. v1 supports only single-chapter
            // passages with explicit verses — multi-chapter and chapter-
            // only ranges throw with a clear message so the UI can
            // render a hint instead of silently doing nothing weird.
            const passage = data.passage;
            if (!passage) {
                throw new Error('Paper has no passage');
            }
            if (passage.chapterStart !== passage.chapterEnd) {
                throw new Error(
                    'v1 only supports single-chapter passages. Edit the passage to a single-chapter range before generating.'
                );
            }
            if (passage.verseStart === null || passage.verseEnd === null) {
                throw new Error(
                    'v1 requires explicit verses. Edit the passage to include verse start/end before generating.'
                );
            }

            const newSteps: ExegeticalStep[] = [];
            const now = new Date();

            // One step per verse, then conclusion, introduction, assembly.
            // Order matches the wizard flow: verses are written first,
            // conclusion second, introduction third (sees the body), and
            // assembly mechanically concatenates with the introduction
            // surfaced FIRST in the assembled output (TMS convention).
            for (let v = passage.verseStart; v <= passage.verseEnd; v++) {
                newSteps.push(buildStep({
                    paperId,
                    kind: 'verse',
                    order: newSteps.length + 1,
                    now,
                    verseRef: {
                        bookId: passage.bookId,
                        chapterStart: passage.chapterStart,
                        chapterEnd: passage.chapterStart,
                        verseStart: v,
                        verseEnd: v,
                    },
                }));
            }
            newSteps.push(buildStep({ paperId, kind: 'conclusion', order: newSteps.length + 1, now }));
            newSteps.push(buildStep({ paperId, kind: 'introduction', order: newSteps.length + 1, now }));
            newSteps.push(buildStep({ paperId, kind: 'assembly', order: newSteps.length + 1, now }));

            tx.update(ref, {
                steps: newSteps,
                phase: 'in-progress',
                currentStepId: newSteps[0]!.id,
                updatedAt: now,
            });
            result = newSteps;
        });

        return result;
    }

    async setStepState(
        ownerId: string,
        paperId: string,
        stepId: string,
        state: ExegeticalStepState
    ): Promise<ExegeticalStep> {
        return this.mutateStep(ownerId, paperId, stepId, (step) => {
            step.state = state;
            step.updatedAt = new Date();
            return step;
        });
    }

    async appendStepVersion(
        ownerId: string,
        paperId: string,
        stepId: string,
        version: Omit<ExegeticalStepVersion, 'id' | 'createdAt'>
    ): Promise<ExegeticalStepVersion> {
        const fullVersion: ExegeticalStepVersion = {
            id: crypto.randomUUID(),
            createdAt: new Date(),
            markdown: version.markdown,
            origin: version.origin,
            parentVersionId: version.parentVersionId,
            modelId: version.modelId,
            regenerationHint: version.regenerationHint,
            tokensUsed: version.tokensUsed,
            verifications: version.verifications,
        };

        await this.mutateStep(ownerId, paperId, stepId, (step) => {
            step.versions = [...step.versions, fullVersion];
            step.current = fullVersion;
            step.state = 'awaiting-review';
            step.updatedAt = new Date();
            return step;
        });

        return fullVersion;
    }

    async acceptStepVersion(
        ownerId: string,
        paperId: string,
        stepId: string,
        versionId: string
    ): Promise<ExegeticalStep> {
        return this.mutateStep(ownerId, paperId, stepId, (step) => {
            const target = step.versions.find(v => v.id === versionId);
            if (!target) {
                throw new Error(`Version ${versionId} not found in step ${stepId}`);
            }
            step.accepted = target;
            step.state = 'accepted';
            step.updatedAt = new Date();
            return step;
        });
    }

    async saveManualEdit(
        ownerId: string,
        paperId: string,
        stepId: string,
        markdown: string
    ): Promise<ExegeticalStep> {
        const editVersion: ExegeticalStepVersion = {
            id: crypto.randomUUID(),
            createdAt: new Date(),
            markdown,
            origin: 'edited',
            parentVersionId: null, // filled inside mutateStep using step.accepted
            modelId: null,
            regenerationHint: null,
            tokensUsed: null,
            verifications: { ...EMPTY_VERIFICATION_SUMMARY },
        };

        return this.mutateStep(ownerId, paperId, stepId, (step) => {
            // Edits are anchored to whatever was previously accepted (or
            // current, as a fallback). Resets verifications: per the
            // user's request, edits do NOT auto-re-run verification —
            // they show as 'manualPending' instead until the user
            // explicitly clicks "verify".
            const parent = step.accepted ?? step.current;
            const versioned: ExegeticalStepVersion = {
                ...editVersion,
                parentVersionId: parent?.id ?? null,
            };
            step.versions = [...step.versions, versioned];
            step.accepted = versioned;
            // State stays 'accepted' if it was already; if it was
            // 'awaiting-review' or earlier and the user manually edits,
            // we count that as an implicit accept of the manual content.
            step.state = 'accepted';
            step.updatedAt = new Date();
            return step;
        });
    }

    /**
     * Generic step mutator: reads the paper, finds the step by id,
     * applies the mutator, writes back. Wrapped in a transaction so the
     * read-modify-write doesn't race with concurrent step changes.
     */
    private async mutateStep(
        ownerId: string,
        paperId: string,
        stepId: string,
        mutator: (step: ExegeticalStep) => ExegeticalStep
    ): Promise<ExegeticalStep> {
        const ref = this.docRef(paperId);
        let updatedStep: ExegeticalStep | null = null;

        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) {
                throw new Error(`Paper ${paperId} not found`);
            }
            const data = snap.data();
            if (data.ownerId !== ownerId) {
                throw new Error(`Paper ${paperId} not owned by ${ownerId}`);
            }
            const steps: ExegeticalStep[] = Array.isArray(data.steps) ? [...data.steps] : [];
            const idx = steps.findIndex(s => s.id === stepId);
            if (idx === -1) {
                throw new Error(`Step ${stepId} not found in paper ${paperId}`);
            }
            const next = mutator({ ...steps[idx]! });
            steps[idx] = next;
            updatedStep = next;
            tx.update(ref, { steps, updatedAt: new Date() });
        });

        if (!updatedStep) throw new Error('Step mutation produced no result');
        return updatedStep;
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

/**
 * Constructs a fresh `ExegeticalStep` in 'pending' state with empty
 * version history. Used by `seedStepsForPassage` to build the initial
 * step list when the user starts generation.
 */
function buildStep(input: {
    paperId: string;
    kind: ExegeticalStepKind;
    order: number;
    now: Date;
    verseRef?: ExegeticalStep['verseRef'];
}): ExegeticalStep {
    return {
        id: crypto.randomUUID(),
        paperId: input.paperId,
        kind: input.kind,
        verseRef: input.verseRef ?? null,
        order: input.order,
        state: 'pending',
        current: null,
        accepted: null,
        versions: [],
        createdAt: input.now,
        updatedAt: input.now,
    };
}
