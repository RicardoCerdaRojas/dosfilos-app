/**
 * Word cache entry stored in global cache
 */
export interface WordCacheEntry {
    lemma: string;
    language: string;
    gloss: string;
    grammaticalCategory: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Repository for caching Greek word analysis
 * 
 * This cache is shared across all users to reduce API costs.
 * Key is lemma (dictionary form) + language.
 */
export interface IWordCacheRepository {
    /**
     * Get cached entry for a lemma in specific language
     * @returns WordCacheEntry if found, null otherwise
     */
    get(lemma: string, language: string): Promise<WordCacheEntry | null>;

    /**
     * Save entry to cache
     */
    set(entry: WordCacheEntry): Promise<void>;
}
