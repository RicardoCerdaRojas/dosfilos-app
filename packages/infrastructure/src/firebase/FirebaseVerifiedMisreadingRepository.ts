import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
    IVerifiedMisreadingRepository,
    MisreadingPassageScope,
    MisreadingReviewStatus,
    VerifiedMisreadingRecord,
} from '@dosfilos/domain';

/**
 * ADR-036 PR4 — lectura del set crítico curado (`verifiedMisreadings/`).
 *
 * SOLO lectura (las escrituras van por las callables role-gated). La admin tab
 * lista la cola por estado; el merge (PR5) consulta por pasaje: filtra por
 * `bookId` en Firestore y resuelve el SOLAPE de versos en memoria (Firestore no
 * hace overlap de rangos en una sola query).
 */
export class FirebaseVerifiedMisreadingRepository implements IVerifiedMisreadingRepository {
    private readonly collection = 'verifiedMisreadings';

    async listByStatus(status: MisreadingReviewStatus): Promise<VerifiedMisreadingRecord[]> {
        const q = query(collection(db, this.collection), where('reviewStatus', '==', status));
        const snap = await getDocs(q);
        return snap.docs.map((d) => this.toRecord(d.id, d.data()));
    }

    async getById(id: string): Promise<VerifiedMisreadingRecord | null> {
        const snap = await getDoc(doc(db, this.collection, id));
        if (!snap.exists()) return null;
        return this.toRecord(snap.id, snap.data());
    }

    async listByPassage(scope: MisreadingPassageScope): Promise<VerifiedMisreadingRecord[]> {
        const q = query(collection(db, this.collection), where('passageScope.bookId', '==', scope.bookId));
        const snap = await getDocs(q);
        return snap.docs
            .map((d) => this.toRecord(d.id, d.data()))
            .filter((r) => versesOverlap(r.passageScope, scope));
    }

    private toRecord(id: string, data: any): VerifiedMisreadingRecord {
        return {
            id,
            schemaVersion: data.schemaVersion ?? 1,
            passageScope: {
                bookId: data.passageScope?.bookId ?? '',
                chapterStart: data.passageScope?.chapterStart ?? 0,
                verseStart: data.passageScope?.verseStart ?? 0,
                verseEnd: data.passageScope?.verseEnd ?? 0,
            },
            claim: data.claim ?? '',
            whyWrong: data.whyWrong ?? '',
            severity: data.severity ?? 'standard',
            correctiveAnchors: Array.isArray(data.correctiveAnchors) ? data.correctiveAnchors : [],
            reviewStatus: data.reviewStatus ?? 'pending-pastoral-review',
            reviewedBy: data.reviewedBy ?? undefined,
            reviewedAt: data.reviewedAt ?? undefined,
            verification: data.verification ?? undefined,
            createdAt: data.createdAt ?? undefined,
        };
    }
}

/** Solape de rango dentro del MISMO libro + MISMO capítulo (scope v1 = un capítulo). */
function versesOverlap(a: MisreadingPassageScope, b: MisreadingPassageScope): boolean {
    if (a.bookId !== b.bookId) return false;
    if (a.chapterStart !== b.chapterStart) return false;
    // Sin verseEnd válido, trata como puntual en verseStart.
    const aEnd = a.verseEnd || a.verseStart;
    const bEnd = b.verseEnd || b.verseStart;
    return a.verseStart <= bEnd && b.verseStart <= aEnd;
}
