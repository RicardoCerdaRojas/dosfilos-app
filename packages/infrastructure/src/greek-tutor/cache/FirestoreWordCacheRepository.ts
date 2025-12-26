import { Firestore, doc, setDoc } from 'firebase/firestore';
import { IWordCacheRepository, WordCacheEntry } from '@dosfilos/domain';

/**
 * Firestore implementation of word cache repository
 * 
 * Cache is stored in /greekWordCache collection
 * Document ID format: {lemma}_{language} (e.g., "ἀγαθός_Spanish")
 */
export class FirestoreWordCacheRepository implements IWordCacheRepository {
    private readonly COLLECTION_NAME = 'greekWordCache';

    constructor(private firestore: Firestore) { }

    /**
     * Generate cache document ID from lemma and language
     */
    private getCacheId(lemma: string, language: string): string {
        // Normalize lemma and create safe document ID
        const normalizedLemma = lemma.trim();
        return `${normalizedLemma}_${language}`;
    }

    /**
     * Get cached entry for a lemma
     */
    async get(lemma: string, language: string): Promise<WordCacheEntry | null> {
        try {
            const cacheId = this.getCacheId(lemma, language);
            const docRef = doc(this.firestore, this.COLLECTION_NAME, cacheId);
            const { getDoc } = await import('firebase/firestore');
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                console.log('[WordCache] Cache MISS:', lemma, language);
                return null;
            }

            const data = docSnap.data();
            console.log('[WordCache] Cache HIT:', lemma, language);

            return {
                lemma: data.lemma,
                language: data.language,
                gloss: data.gloss,
                grammaticalCategory: data.grammaticalCategory,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date()
            };
        } catch (error) {
            console.error('[WordCache] Error getting cache:', error);
            return null; // Fail gracefully
        }
    }

    /**
     * Save entry to cache
     */
    async set(entry: WordCacheEntry): Promise<void> {
        try {
            const cacheId = this.getCacheId(entry.lemma, entry.language);
            const docRef = doc(this.firestore, this.COLLECTION_NAME, cacheId);

            await setDoc(docRef, {
                lemma: entry.lemma,
                language: entry.language,
                gloss: entry.gloss,
                grammaticalCategory: entry.grammaticalCategory,
                createdAt: entry.createdAt,
                updatedAt: new Date() // Always update timestamp
            });

            console.log('[WordCache] Cached:', entry.lemma, entry.language);
        } catch (error) {
            console.error('[WordCache] Error setting cache:', error);
            // Fail gracefully - don't throw, just log
        }
    }
}
