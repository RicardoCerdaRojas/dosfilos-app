import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
    crossReferenceDocId,
    type BibleCrossReferenceDoc,
    type ICrossReferenceRepository,
    type RangeLookupRequest,
    type VerseLookupRequest,
} from '@dosfilos/domain';

/**
 * Firestore reader for the cross-reference engine. Writes happen
 * exclusively through the `ingestBibleCrossReferences` callable
 * (Admin SDK bypass), so this implementation exposes lookups only.
 *
 * Range lookups (`findByRange`) issue a single `where` query against
 * `sourceBook + sourceChapter + sourceVerse` so a pericope of 12 verses
 * costs one round-trip instead of 12 doc reads.
 */
export class FirebaseCrossReferenceRepository implements ICrossReferenceRepository {
    private readonly collection = 'bibleCrossReferences';

    async findByVerse(req: VerseLookupRequest): Promise<BibleCrossReferenceDoc | null> {
        const ref = doc(db, this.collection, crossReferenceDocId(req.book, req.chapter, req.verse));
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return this.toDoc(snap.id, snap.data());
    }

    async findByRange(req: RangeLookupRequest): Promise<BibleCrossReferenceDoc[]> {
        const q = query(
            collection(db, this.collection),
            where('sourceBook', '==', req.book),
            where('sourceChapter', '==', req.chapter),
            where('sourceVerse', '>=', req.startVerse),
            where('sourceVerse', '<=', req.endVerse),
        );
        const snap = await getDocs(q);
        return snap.docs
            .map((d) => this.toDoc(d.id, d.data()))
            .sort((a, b) => a.sourceVerse - b.sourceVerse);
    }

    private toDoc(id: string, data: any): BibleCrossReferenceDoc {
        return {
            id,
            sourceBook: data.sourceBook,
            sourceChapter: data.sourceChapter,
            sourceVerse: data.sourceVerse,
            parallels: Array.isArray(data.parallels) ? data.parallels : [],
            count: data.count ?? (Array.isArray(data.parallels) ? data.parallels.length : 0),
            source: data.source ?? 'unknown',
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
