import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
    Confession,
    ConfessionSection,
    IConfessionRepository,
} from '@dosfilos/domain';

/**
 * Reads the CORE Library confession catalog. Writes are server-side only
 * via the `ingestCoreLibraryConfessions` callable (super_admin gated),
 * so this implementation exposes read methods only.
 *
 * Section subcollection path: `/confessions/{confessionId}/sections/{sectionId}`.
 * Sections are ordered by their `order` field; consumers (admin viewer,
 * fidelity passes) rely on stable ordering to render lists deterministically.
 */
export class FirebaseConfessionRepository implements IConfessionRepository {
    private readonly collection = 'confessions';

    async listConfessions(): Promise<Confession[]> {
        const snap = await getDocs(collection(db, this.collection));
        return snap.docs.map((d) => this.toConfession(d.id, d.data()));
    }

    async getConfession(confessionId: string): Promise<Confession | null> {
        const ref = doc(db, this.collection, confessionId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return this.toConfession(snap.id, snap.data());
    }

    async listSections(confessionId: string): Promise<ConfessionSection[]> {
        const sectionsRef = collection(db, this.collection, confessionId, 'sections');
        const q = query(sectionsRef, orderBy('order', 'asc'));
        const snap = await getDocs(q);
        return snap.docs.map((d) => this.toSection(d.id, d.data()));
    }

    private toConfession(id: string, data: any): Confession {
        return {
            id,
            title: data.title,
            shortTitle: data.shortTitle,
            authorOrEditor: data.authorOrEditor ?? undefined,
            year: data.year,
            sourceType: data.sourceType,
            tradition: data.tradition,
            language: data.language,
            sourceUrl: data.sourceUrl,
            sectionType: data.sectionType,
            ingestStatus: data.ingestStatus,
            sectionCount: data.sectionCount ?? 0,
            rightsStatus: data.rightsStatus,
            license: data.license,
            licenseUrl: data.licenseUrl ?? undefined,
            copyrightNotice: data.copyrightNotice ?? undefined,
            ingestionStatus: data.ingestionStatus,
            riskLevel: data.riskLevel,
            requiredAttribution: data.requiredAttribution ?? undefined,
            specialHandling: data.specialHandling ?? undefined,
            citation: data.citation,
            ragUse: data.ragUse ?? undefined,
            doNotUseFor: data.doNotUseFor ?? undefined,
            ecumenicalAffirmation: data.ecumenicalAffirmation ?? undefined,
            recommendedDocumentsInside: data.recommendedDocumentsInside ?? undefined,
            createdAt: this.toDate(data.createdAt),
            updatedAt: this.toDate(data.updatedAt),
        };
    }

    private toSection(id: string, data: any): ConfessionSection {
        return {
            sectionId: id,
            sectionReference: data.sectionReference,
            title: data.title ?? undefined,
            text: data.text,
            question: data.question ?? undefined,
            answer: data.answer ?? undefined,
            topics: data.topics ?? undefined,
            doctrineLevel: data.doctrineLevel ?? undefined,
            reviewStatus: data.reviewStatus ?? undefined,
            levelRationale: data.levelRationale ?? undefined,
            order: data.order ?? 0,
            createdAt: this.toDate(data.createdAt),
            updatedAt: this.toDate(data.updatedAt),
        };
    }

    private toDate(value: any): Date {
        if (!value) return new Date();
        if (value instanceof Timestamp) return value.toDate();
        if (value instanceof Date) return value;
        if (typeof value?.toDate === 'function') return value.toDate();
        return new Date(value);
    }
}
