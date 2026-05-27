import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import {
    buildPastoralWordAnalysisCacheKey,
    IPastoralWordAnalysisCacheRepository,
    PastoralWordAnalysisCacheKey,
    PastoralWordAnalysisDoc,
} from '@dosfilos/domain';

const COLLECTION = 'pastoralWordAnalyses';

/**
 * Pastoral Fidelity Phase 1.5 — Firestore-backed cache for pastoral
 * word analyses. Reads/writes use the deterministic doc id from
 * `buildPastoralWordAnalysisCacheKey`. The cache is global (any
 * authenticated user can read; write happens server-side from the
 * callable). UI uses this client repo for **read-only** cache probes —
 * the canonical write path is the callable in `functions/`.
 */
export class FirestorePastoralWordAnalysisCacheRepository implements IPastoralWordAnalysisCacheRepository {
    async findByKey(key: PastoralWordAnalysisCacheKey): Promise<PastoralWordAnalysisDoc | null> {
        const id = buildPastoralWordAnalysisCacheKey(key);
        const ref = doc(getFirestore(), COLLECTION, id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        const raw = snap.data() as Record<string, unknown>;
        return {
            id,
            language: raw.language as PastoralWordAnalysisDoc['language'],
            lemma: String(raw.lemma ?? ''),
            passageHash: String(raw.passageHash ?? ''),
            curatedVersion: String(raw.curatedVersion ?? ''),
            verseRef: String(raw.verseRef ?? ''),
            analysis: raw.analysis as PastoralWordAnalysisDoc['analysis'],
            createdAt: toDate(raw.createdAt),
            updatedAt: toDate(raw.updatedAt),
        };
    }

    async save(d: PastoralWordAnalysisDoc): Promise<void> {
        const ref = doc(getFirestore(), COLLECTION, d.id);
        await setDoc(ref, {
            language: d.language,
            lemma: d.lemma,
            passageHash: d.passageHash,
            curatedVersion: d.curatedVersion,
            verseRef: d.verseRef,
            analysis: d.analysis,
            createdAt: Timestamp.fromDate(d.createdAt),
            updatedAt: Timestamp.fromDate(d.updatedAt),
        });
    }
}

function toDate(raw: unknown): Date {
    if (raw instanceof Date) return raw;
    if (raw && typeof raw === 'object' && 'toDate' in raw && typeof (raw as { toDate?: () => Date }).toDate === 'function') {
        return (raw as { toDate: () => Date }).toDate();
    }
    return new Date();
}
