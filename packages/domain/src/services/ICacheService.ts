/**
 * ICacheService - Interface for caching with TTL support
 * Used for embedding cache and search result cache
 */
export interface ICacheService {
    /**
     * Get a cached value
     * @param key - Cache key
     * @returns Cached value or null if not found/expired
     */
    get<T>(key: string): Promise<T | null>;

    /**
     * Set a cached value with optional TTL
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttlSeconds - Time to live in seconds (optional, uses default if not provided)
     */
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

    /**
     * Delete a cached value
     * @param key - Cache key
     */
    delete(key: string): Promise<void>;

    /**
     * Delete all cached values matching a prefix
     * @param prefix - Key prefix to match
     */
    deleteByPrefix(prefix: string): Promise<void>;

    /**
     * Clear all cached values
     */
    clear(): Promise<void>;
}
