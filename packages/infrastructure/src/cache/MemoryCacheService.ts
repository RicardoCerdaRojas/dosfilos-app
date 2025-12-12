import { ICacheService } from '@dosfilos/domain';

interface CacheEntry<T> {
    value: T;
    expiresAt: number | null; // null = no expiry
}

/**
 * MemoryCacheService
 * In-memory cache implementation with TTL support
 * 
 * Used for:
 * - Caching embeddings to avoid regenerating
 * - Caching search results for repeated queries
 */
export class MemoryCacheService implements ICacheService {
    private cache: Map<string, CacheEntry<unknown>> = new Map();
    private static readonly DEFAULT_TTL_SECONDS = 3600; // 1 hour default

    /**
     * Get a cached value
     */
    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value as T;
    }

    /**
     * Set a cached value with optional TTL
     */
    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        const ttl = ttlSeconds ?? MemoryCacheService.DEFAULT_TTL_SECONDS;
        const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : null;

        this.cache.set(key, {
            value,
            expiresAt
        });
    }

    /**
     * Delete a cached value
     */
    async delete(key: string): Promise<void> {
        this.cache.delete(key);
    }

    /**
     * Delete all cached values matching a prefix
     */
    async deleteByPrefix(prefix: string): Promise<void> {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cached values
     */
    async clear(): Promise<void> {
        this.cache.clear();
    }

    /**
     * Get cache stats for debugging
     */
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Singleton instance for app-wide caching
export const memoryCacheService = new MemoryCacheService();
