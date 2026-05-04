import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    Timestamp,
    increment,
} from 'firebase/firestore';
import type {
    BibleBookId,
    BookPanorama,
    ExegeticalUnit,
    ExpositoryAssistantCacheEntry,
    IExpositoryAssistantCacheRepository,
    MacroSection,
} from '@dosfilos/domain';
import { db } from '../config/firebase';

/**
 * Firestore implementation of the v1.6 expository-assistant cache.
 *
 * Storage layout:
 *   collection: `expositoryAssistantCache`
 *   docId: `${bookId}_${displayLanguage}_${pipelineVersion}`
 *
 * The docId is deterministic and short. A pipeline version bump
 * changes the docId so cached docs from older versions silently
 * become unreachable (and can be GC'd in a later sweep).
 *
 * All Date fields are persisted as Firestore Timestamps and
 * deserialized back to Dates on read. The Pase 1-3 payloads are
 * persisted as plain JSON; their domain shapes don't carry any
 * Firestore-incompatible types (no undefined fields surface from
 * the assistant — defensive normalization in
 * GeminiExpositoryAssistant guarantees that).
 */
export class FirestoreExpositoryAssistantCacheRepository
    implements IExpositoryAssistantCacheRepository
{
    private collectionName = 'expositoryAssistantCache';

    private docId(
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
    ): string {
        return `${bookId}_${displayLanguage}_${pipelineVersion}`;
    }

    private docRef(
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
    ) {
        return doc(db, this.collectionName, this.docId(bookId, displayLanguage, pipelineVersion));
    }

    async get(
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
    ): Promise<ExpositoryAssistantCacheEntry | null> {
        try {
            const snap = await getDoc(this.docRef(bookId, displayLanguage, pipelineVersion));
            if (!snap.exists()) return null;
            return this.fromFirestore(snap.data(), bookId, displayLanguage, pipelineVersion);
        } catch (err) {
            // Cache reads must never throw to the caller — a failed
            // lookup just degrades to a cache miss + fresh LLM call.
            // Log so we notice rule misconfigurations.
            console.warn('[expositoryCache] get failed:', err);
            return null;
        }
    }

    async upsertPanorama(
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
        panorama: BookPanorama,
        modelId: string,
        passVersion: string,
    ): Promise<void> {
        const ref = this.docRef(bookId, displayLanguage, pipelineVersion);
        const exists = await getDoc(ref).then((s) => s.exists()).catch(() => false);
        const payload: any = {
            bookId,
            displayLanguage,
            pipelineVersion,
            panorama,
            panoramaModelId: modelId,
            panoramaPassVersion: passVersion,
            panoramaCachedAt: serverTimestamp(),
            ...(exists ? {} : { createdAt: serverTimestamp() }),
        };
        try {
            await setDoc(ref, payload, { merge: true });
        } catch (err) {
            // Writes are also non-fatal — failed cache write means
            // the next user pays the LLM call again, no correctness
            // impact.
            console.warn('[expositoryCache] upsertPanorama failed:', err);
        }
    }

    async upsertMacro(
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
        macroSections: MacroSection[],
        passVersion: string,
    ): Promise<void> {
        try {
            await setDoc(
                this.docRef(bookId, displayLanguage, pipelineVersion),
                {
                    macroSections,
                    macroPassVersion: passVersion,
                    macroCachedAt: serverTimestamp(),
                },
                { merge: true },
            );
        } catch (err) {
            console.warn('[expositoryCache] upsertMacro failed:', err);
        }
    }

    async upsertMicro(
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
        exegeticalUnits: ExegeticalUnit[],
        passVersion: string,
    ): Promise<void> {
        try {
            await setDoc(
                this.docRef(bookId, displayLanguage, pipelineVersion),
                {
                    exegeticalUnits,
                    microPassVersion: passVersion,
                    microCachedAt: serverTimestamp(),
                },
                { merge: true },
            );
        } catch (err) {
            console.warn('[expositoryCache] upsertMicro failed:', err);
        }
    }

    async recordHit(
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
        pass: 'panorama' | 'macro' | 'micro',
    ): Promise<void> {
        try {
            // Atomic increment via Firestore FieldValue. Counter
            // path is `hits.<pass>` so all three counters live as a
            // map within the same doc — readable in one fetch for
            // analytics.
            await setDoc(
                this.docRef(bookId, displayLanguage, pipelineVersion),
                {
                    hits: { [pass]: increment(1) },
                    lastHitAt: serverTimestamp(),
                },
                { merge: true },
            );
        } catch (err) {
            console.warn('[expositoryCache] recordHit failed:', err);
        }
    }

    /**
     * Maps a Firestore document back to the domain shape, converting
     * Timestamps to Dates and trimming Firestore-only metadata.
     */
    private fromFirestore(
        data: any,
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
    ): ExpositoryAssistantCacheEntry {
        const toDate = (v: unknown): Date | undefined =>
            v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : undefined;

        return {
            bookId,
            displayLanguage,
            pipelineVersion,
            ...(data.panorama ? { panorama: data.panorama as BookPanorama } : {}),
            ...(data.panoramaModelId ? { panoramaModelId: data.panoramaModelId } : {}),
            ...(data.panoramaPassVersion ? { panoramaPassVersion: data.panoramaPassVersion } : {}),
            ...(toDate(data.panoramaCachedAt) ? { panoramaCachedAt: toDate(data.panoramaCachedAt) } : {}),
            ...(Array.isArray(data.macroSections) ? { macroSections: data.macroSections as MacroSection[] } : {}),
            ...(data.macroPassVersion ? { macroPassVersion: data.macroPassVersion } : {}),
            ...(toDate(data.macroCachedAt) ? { macroCachedAt: toDate(data.macroCachedAt) } : {}),
            ...(Array.isArray(data.exegeticalUnits) ? { exegeticalUnits: data.exegeticalUnits as ExegeticalUnit[] } : {}),
            ...(data.microPassVersion ? { microPassVersion: data.microPassVersion } : {}),
            ...(toDate(data.microCachedAt) ? { microCachedAt: toDate(data.microCachedAt) } : {}),
            ...(data.hits && typeof data.hits === 'object' ? { hits: data.hits } : {}),
            ...(toDate(data.lastHitAt) ? { lastHitAt: toDate(data.lastHitAt) } : {}),
            ...(toDate(data.createdAt) ? { createdAt: toDate(data.createdAt) } : {}),
        };
    }
}
