/**
 * LibraryContextProvider
 * 
 * Global context for managing library resources sync and cache state.
 * Follows SOLID principles:
 * - Single Responsibility: Only handles library sync/cache state
 * - Open/Closed: Extensible via configuration
 * - Interface Segregation: Separate state, actions, and selectors
 * - Dependency Inversion: Depends on service interfaces
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { LibraryResourceEntity, WorkflowPhase } from '@dosfilos/domain';
import { libraryService } from '@dosfilos/application';
import { User } from 'firebase/auth';

// ============================================================================
// Types & Interfaces (Interface Segregation)
// ============================================================================

export type SyncStatus = 'idle' | 'syncing' | 'ready' | 'error';
export type CacheStatus = 'idle' | 'creating' | 'ready' | 'expired' | 'error';

export interface LibraryContextState {
    resources: LibraryResourceEntity[];
    syncStatus: SyncStatus;
    cacheStatus: CacheStatus;
    cacheName: string | null;
    cacheExpiresAt: Date | null;
    lastError: string | null;
}

export interface LibraryContextActions {
    /** Sync expired documents with Gemini Files API */
    syncExpiredDocuments: () => Promise<void>;
    /** Create or refresh the cache */
    refreshCache: () => Promise<void>;
    /** Ensure resources are synced and cached - NON-BLOCKING, returns immediately */
    ensureReady: () => Promise<boolean>;
    /** Load resources for a specific phase */
    loadResourcesForPhase: (phase: WorkflowPhase, resourceIds?: string[]) => Promise<void>;
    /** Clear all state */
    reset: () => void;
}

export interface LibraryContextSelectors {
    /** All resources are synced and cache is ready */
    isReady: boolean;
    /** Some resources need to be synced */
    needsSync: boolean;
    /** Cache needs to be created or refreshed */
    needsCacheRefresh: boolean;
    /** Number of expired resources */
    expiredCount: number;
    /** Number of synced resources */
    syncedCount: number;
    /** Total resources */
    totalCount: number;
    /** Is currently doing any operation */
    isLoading: boolean;
}

export interface LibraryContextValue extends LibraryContextState, LibraryContextActions, LibraryContextSelectors {}

// ============================================================================
// Constants
// ============================================================================

const GEMINI_TTL_HOURS = 44; // Gemini Files API TTL
const CACHE_TTL_SECONDS = 3600; // 1 hour
const CACHE_STORAGE_KEY = 'dosfilos_library_cache';

// ============================================================================
// LocalStorage Helpers
// ============================================================================

interface CacheStorageData {
    cacheName: string;
    expiresAt: string; // ISO string
    resourceIds: string[]; // To verify cache matches current resources
}

function getCacheFromStorage(phaseKey: string): CacheStorageData | null {
    try {
        const stored = localStorage.getItem(`${CACHE_STORAGE_KEY}_${phaseKey}`);
        if (!stored) return null;
        return JSON.parse(stored) as CacheStorageData;
    } catch {
        return null;
    }
}

function saveCacheToStorage(phaseKey: string, data: CacheStorageData): void {
    try {
        localStorage.setItem(`${CACHE_STORAGE_KEY}_${phaseKey}`, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save cache to localStorage:', e);
    }
}

function clearCacheFromStorage(phaseKey: string): void {
    try {
        localStorage.removeItem(`${CACHE_STORAGE_KEY}_${phaseKey}`);
    } catch {
        // Ignore
    }
}

// ============================================================================
// Context Creation
// ============================================================================

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface LibraryContextProviderProps {
    children: React.ReactNode;
    user: User | null;
    initialResourceIds?: string[];
    phaseKey?: string; // Key to identify phase for cache persistence
}

export function LibraryContextProvider({ 
    children, 
    user,
    initialResourceIds = [],
    phaseKey = 'default'
}: LibraryContextProviderProps) {
    // State
    const [resources, setResources] = useState<LibraryResourceEntity[]>([]);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [cacheStatus, setCacheStatus] = useState<CacheStatus>('idle');
    const [cacheName, setCacheName] = useState<string | null>(null);
    const [cacheExpiresAt, setCacheExpiresAt] = useState<Date | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);

    // Restore cache from localStorage on mount or phase change
    useEffect(() => {
        // Wait until we have resource IDs to compare
        // If initialResourceIds is empty, we can't validate the cache yet
        if (initialResourceIds.length === 0) {
            console.log('📦 LibraryContext: Waiting for resourceIds before restoring cache...');
            return;
        }

        const storedCache = getCacheFromStorage(phaseKey);
        if (storedCache) {
            const expiresAt = new Date(storedCache.expiresAt);
            const now = new Date();
            
            // Check if cache is still valid and matches current resources
            const storedIds = [...storedCache.resourceIds].sort().join(',');
            const currentIds = [...initialResourceIds].sort().join(',');
            const resourceIdsMatch = storedIds === currentIds;
            
            console.log('📦 LibraryContext: Cache validation:', {
                phaseKey,
                storedIds,
                currentIds,
                match: resourceIdsMatch,
                expired: expiresAt <= now
            });
            
            if (expiresAt > now && resourceIdsMatch) {
                console.log('✅ LibraryContext: Restoring cache from localStorage for phase:', phaseKey);
                setCacheName(storedCache.cacheName);
                setCacheExpiresAt(expiresAt);
                setCacheStatus('ready');
            } else {
                console.log('⚠️ LibraryContext: Stored cache expired or resources changed, clearing');
                clearCacheFromStorage(phaseKey);
                setCacheName(null);
                setCacheExpiresAt(null);
                setCacheStatus('idle');
            }
        }
    }, [phaseKey, initialResourceIds.join(',')]);

    // ========================================================================
    // Computed Values (Selectors)
    // ========================================================================

    const selectors = useMemo<LibraryContextSelectors>(() => {
        const now = Date.now();
        
        const expiredResources = resources.filter(r => {
            const syncedAt = r.metadata?.geminiSyncedAt
                ? new Date(r.metadata.geminiSyncedAt).getTime()
                : 0;
            return !r.metadata?.geminiUri || (now - syncedAt) > (GEMINI_TTL_HOURS * 60 * 60 * 1000);
        });

        const syncedResources = resources.filter(r => {
            const syncedAt = r.metadata?.geminiSyncedAt
                ? new Date(r.metadata.geminiSyncedAt).getTime()
                : 0;
            return r.metadata?.geminiUri && (now - syncedAt) <= (GEMINI_TTL_HOURS * 60 * 60 * 1000);
        });

        const isCacheExpired = cacheExpiresAt ? cacheExpiresAt.getTime() < now : true;

        return {
            isReady: syncStatus === 'ready' && cacheStatus === 'ready' && !isCacheExpired,
            needsSync: expiredResources.length > 0,
            needsCacheRefresh: cacheStatus !== 'ready' || isCacheExpired,
            expiredCount: expiredResources.length,
            syncedCount: syncedResources.length,
            totalCount: resources.length,
            isLoading: syncStatus === 'syncing' || cacheStatus === 'creating'
        };
    }, [resources, syncStatus, cacheStatus, cacheExpiresAt]);

    // ========================================================================
    // Actions
    // ========================================================================

    const loadResourcesForPhase = useCallback(async (
        phase: WorkflowPhase, 
        resourceIds?: string[]
    ) => {
        if (!user) return;

        try {
            const ids = resourceIds || [];
            if (ids.length === 0) {
                setResources([]);
                return;
            }

            const loadedResources = await Promise.all(
                ids.map(id => libraryService.getResource(id).catch(() => null))
            );

            const validResources = loadedResources.filter((r): r is LibraryResourceEntity => r !== null);
            setResources(validResources);
            
            // Determine initial sync status
            const hasExpired = validResources.some(r => {
                const syncedAt = r.metadata?.geminiSyncedAt
                    ? new Date(r.metadata.geminiSyncedAt).getTime()
                    : 0;
                return !r.metadata?.geminiUri || (Date.now() - syncedAt) > (GEMINI_TTL_HOURS * 60 * 60 * 1000);
            });
            
            setSyncStatus(hasExpired ? 'idle' : 'ready');
            
        } catch (error: any) {
            console.error('❌ loadResourcesForPhase Error:', error);
            setLastError(error.message);
        }
    }, [user]);

    const syncExpiredDocuments = useCallback(async () => {
        if (syncStatus === 'syncing') return;
        
        try {
            setSyncStatus('syncing');
            setLastError(null);

            const now = Date.now();
            const expiredIds = resources
                .filter(r => {
                    const syncedAt = r.metadata?.geminiSyncedAt
                        ? new Date(r.metadata.geminiSyncedAt).getTime()
                        : 0;
                    return !r.metadata?.geminiUri || (now - syncedAt) > (GEMINI_TTL_HOURS * 60 * 60 * 1000);
                })
                .map(r => r.id);

            if (expiredIds.length === 0) {
                setSyncStatus('ready');
                return;
            }

            console.log(`🔄 LibraryContext: Syncing ${expiredIds.length} expired documents...`);
            await libraryService.refreshGeminiLinks(expiredIds);

            // Wait for Firestore propagation
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Re-fetch resources to get updated metadata
            const refreshedResources = await Promise.all(
                resources.map(r => libraryService.getResource(r.id).catch(() => r))
            );

            const validResources = refreshedResources.filter((r): r is LibraryResourceEntity => r !== null);
            setResources(validResources);
            setSyncStatus('ready');
            
            console.log('✅ LibraryContext: Sync complete');

        } catch (error: any) {
            console.error('❌ syncExpiredDocuments Error:', error);
            setSyncStatus('error');
            setLastError(error.message);
        }
    }, [resources, syncStatus]);

    const refreshCache = useCallback(async () => {
        if (cacheStatus === 'creating') return;
        if (resources.length === 0) return;

        try {
            setCacheStatus('creating');
            setLastError(null);

            // Get AI-ready resources (have valid Gemini URI)
            const aiReadyResources = resources.filter(r => r.metadata?.geminiUri);
            
            if (aiReadyResources.length === 0) {
                setCacheStatus('error');
                setLastError('No AI-ready resources available');
                return;
            }

            const geminiUris = aiReadyResources.map(r => r.metadata!.geminiUri!);
            console.log(`🔄 LibraryContext: Creating cache with ${geminiUris.length} resources...`);

            // Create cache using Gemini API
            const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                setCacheStatus('error');
                setLastError('Gemini API Key not configured');
                return;
            }

            const cacheResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'models/gemini-2.5-flash',
                        contents: geminiUris.map(uri => ({
                            role: 'user',
                            parts: [{ fileData: { fileUri: uri, mimeType: 'application/pdf' } }]
                        })),
                        ttl: `${CACHE_TTL_SECONDS}s`
                    })
                }
            );

            if (!cacheResponse.ok) {
                const errorText = await cacheResponse.text();
                console.error('❌ Cache creation failed:', errorText);
                setCacheStatus('error');
                setLastError('Cache creation failed');
                return;
            }

            const cacheData = await cacheResponse.json();
            const newCacheName = cacheData.name;
            const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000);

            setCacheName(newCacheName);
            setCacheExpiresAt(expiresAt);
            setCacheStatus('ready');
            
            // 🎯 Persist to localStorage - use initialResourceIds for consistency
            saveCacheToStorage(phaseKey, {
                cacheName: newCacheName,
                expiresAt: expiresAt.toISOString(),
                resourceIds: [...initialResourceIds] // Use same source as comparison
            });
            
            console.log('✅ LibraryContext: Cache created and persisted:', newCacheName);

        } catch (error: any) {
            console.error('❌ refreshCache Error:', error);
            setCacheStatus('error');
            setLastError(error.message);
        }
    }, [resources, cacheStatus, phaseKey, initialResourceIds]);

    const ensureReady = useCallback(async (): Promise<boolean> => {
        try {
            // If already ready, return immediately
            if (selectors.isReady) {
                console.log('✅ LibraryContext: Already ready');
                return true;
            }

            // If no resources, nothing to do
            if (resources.length === 0) {
                console.log('ℹ️ LibraryContext: No resources to prepare');
                return true;
            }

            // Step 1: Sync expired documents
            if (selectors.needsSync) {
                await syncExpiredDocuments();
            }

            // Step 2: Create/refresh cache
            if (selectors.needsCacheRefresh) {
                await refreshCache();
            }

            console.log('✅ LibraryContext: ensureReady complete');
            return true;

        } catch (error) {
            console.error('❌ ensureReady Error:', error);
            return false;
        }
    }, [resources, selectors, syncExpiredDocuments, refreshCache]);

    const reset = useCallback(() => {
        setResources([]);
        setSyncStatus('idle');
        setCacheStatus('idle');
        setCacheName(null);
        setCacheExpiresAt(null);
        setLastError(null);
    }, []);

    // ========================================================================
    // Load resources when initialResourceIds change (phase change)
    // ========================================================================

    useEffect(() => {
        // DON'T reset cache here - the restoration useEffect handles cache state
        // Only load resources
        
        if (initialResourceIds.length > 0 && user) {
            console.log('📚 LibraryContext: Loading resources for new phase:', initialResourceIds.length);
            loadResourcesForPhase(WorkflowPhase.EXEGESIS, initialResourceIds);
        } else {
            setResources([]);
            setSyncStatus('idle');
        }
    }, [initialResourceIds.join(','), user]); // Join to create stable dependency

    // ========================================================================
    // Context Value
    // ========================================================================

    const value = useMemo<LibraryContextValue>(() => ({
        // State
        resources,
        syncStatus,
        cacheStatus,
        cacheName,
        cacheExpiresAt,
        lastError,
        // Actions
        syncExpiredDocuments,
        refreshCache,
        ensureReady,
        loadResourcesForPhase,
        reset,
        // Selectors
        ...selectors
    }), [
        resources, syncStatus, cacheStatus, cacheName, cacheExpiresAt, lastError,
        syncExpiredDocuments, refreshCache, ensureReady, loadResourcesForPhase, reset,
        selectors
    ]);

    return (
        <LibraryContext.Provider value={value}>
            {children}
        </LibraryContext.Provider>
    );
}

// ============================================================================
// Hook
// ============================================================================

export function useLibraryContext(): LibraryContextValue {
    const context = useContext(LibraryContext);
    if (context === undefined) {
        throw new Error('useLibraryContext must be used within a LibraryContextProvider');
    }
    return context;
}

// ============================================================================
// Optional Hook for components outside provider (returns null-safe defaults)
// ============================================================================

export function useLibraryContextOptional(): LibraryContextValue | null {
    return useContext(LibraryContext) ?? null;
}
