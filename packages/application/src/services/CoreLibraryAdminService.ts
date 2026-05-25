import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    query,
    updateDoc,
    where,
    writeBatch,
    arrayUnion,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';

export interface AdminAgent {
    id: string;
    name: string;
    icon?: string;
    isActive?: boolean;
    corpusIds?: string[];
}

export interface AdminLibraryResource {
    id: string;
    title?: string;
    author?: string;
    publiclyCitable?: boolean;
    extractionVersion?: string;
    indexingStatus?: string;
    indexingError?: string;
    indexedChunkCount?: number;
    textContent?: string;
    textContentUrl?: string;
    coreStores?: string[];
    // ADR-006 / PR 0.3 — rights-aware citation metadata. Defaults applied
    // in the service mapping so the admin UI renders "Sin clasificar"
    // badges on legacy docs without requiring a Firestore backfill.
    license?: string;
    licenseUrl?: string;
    copyrightNotice?: string;
    ingestionStatus?: string;
    riskLevel?: string;
    requiredAttribution?: string[];
    specialHandling?: string[];
    doctrineLevel?: string;
    metadata?: {
        geminiUri?: string;
        annotatedGeminiUri?: string;
        annotatedGeminiName?: string;
    };
    [key: string]: any;
}

/**
 * Apply conservative rights-aware defaults to legacy `library_resources`
 * docs that pre-date PR 0.3. Mirrors [FirebaseLibraryRepository.mapResource]
 * so the admin UI shows the same classification status as runtime citation
 * resolution. Pre-migration docs land as `unknown` license +
 * `requires_manual_review` ingestion, which surfaces the "Sin clasificar"
 * badge in [CoreLibraryAdmin].
 */
function applyRightsDefaults(raw: AdminLibraryResource): AdminLibraryResource {
    return {
        ...raw,
        license: raw.license ?? 'unknown',
        ingestionStatus: raw.ingestionStatus ?? 'requires_manual_review',
    };
}

export interface CoreLibraryStoresConfigData {
    stores: Record<string, string | null>;
    files: Record<string, any[]>;
    descriptions?: Record<string, string>;
    displayNames?: Record<string, string>;
    createdAt?: Date;
    lastValidatedAt?: Date;
}

interface SyncStoreResult {
    success: boolean;
    alreadySynced?: boolean;
    storeCreated?: boolean;
    filesAdded?: number;
}

interface IndexResult {
    success?: boolean;
    skipped?: boolean;
    chunkCount?: number;
    pageRange?: { min: number; max: number };
}

interface ReprocessResult {
    success?: boolean;
    skipped?: boolean;
    pageCount?: number;
    creditsUsed?: number;
    error?: string;
}

interface UnlinkResult {
    success: boolean;
    message: string;
}

/**
 * Service that owns every Firestore / Cloud Functions / Cloud Storage call
 * the CoreLibraryAdmin UI used to make inline. Exposes a small typed surface
 * so the React component can stay free of `firebase/*` imports.
 *
 * No business logic lives here beyond glueing those primitives together; the
 * Cloud Functions still do the heavy lifting server-side.
 */
export class CoreLibraryAdminService {
    private readonly RESOURCES = 'library_resources';
    private readonly AGENTS = 'ai_agents';
    private readonly CONFIG_PATH = 'config/coreLibraryStores';

    // ── Config ─────────────────────────────────────────────────────────────
    async getStoreConfig(): Promise<CoreLibraryStoresConfigData | null> {
        const db = getFirestore();
        const snap = await getDoc(doc(db, this.CONFIG_PATH));
        if (!snap.exists()) return null;
        const data = snap.data();
        return {
            stores: data.stores || {},
            files: data.files || {},
            descriptions: data.descriptions || {},
            displayNames: data.displayNames || {},
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            lastValidatedAt: data.lastValidatedAt?.toDate?.() ?? new Date(),
        };
    }

    async getStoreIdForKey(key: string): Promise<string | null> {
        const db = getFirestore();
        const snap = await getDoc(doc(db, this.CONFIG_PATH));
        return snap.data()?.stores?.[key] ?? null;
    }

    // ── Agents ─────────────────────────────────────────────────────────────
    async getAgents(): Promise<AdminAgent[]> {
        const db = getFirestore();
        const snap = await getDocs(collection(db, this.AGENTS));
        return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    }

    /**
     * Replaces `oldStoreId` with `newStoreId` inside every agent's `corpusIds`.
     * Returns the number of agents that were updated (for telemetry).
     */
    async replaceAgentCorpusReference(oldStoreId: string, newStoreId: string): Promise<number> {
        const db = getFirestore();
        const snap = await getDocs(collection(db, this.AGENTS));
        const batch = writeBatch(db);
        let updatedCount = 0;
        snap.forEach(agentDoc => {
            const data = agentDoc.data();
            const ids: string[] = data.corpusIds || [];
            if (ids.includes(oldStoreId)) {
                const updated = ids.map(id => (id === oldStoreId ? newStoreId : id));
                batch.update(agentDoc.ref, { corpusIds: updated });
                updatedCount++;
            }
        });
        if (updatedCount > 0) await batch.commit();
        return updatedCount;
    }

    // ── Library resources ──────────────────────────────────────────────────
    async getUserResources(userId: string): Promise<AdminLibraryResource[]> {
        const db = getFirestore();
        const q = query(collection(db, this.RESOURCES), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => applyRightsDefaults({ id: d.id, ...(d.data() as any) }));
    }

    async getResourcesInStore(userId: string, storeKey: string): Promise<AdminLibraryResource[]> {
        const db = getFirestore();
        const q = query(
            collection(db, this.RESOURCES),
            where('userId', '==', userId),
            where('coreStores', 'array-contains', storeKey),
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => applyRightsDefaults({ id: d.id, ...(d.data() as any) }));
    }

    async findResourceByTitleInStore(
        userId: string,
        title: string,
        storeKey: string,
    ): Promise<AdminLibraryResource | null> {
        const db = getFirestore();
        const q = query(
            collection(db, this.RESOURCES),
            where('userId', '==', userId),
            where('title', '==', title),
            where('coreStores', 'array-contains', storeKey),
        );
        const snapshot = await getDocs(q);
        const first = snapshot.docs[0];
        return first ? applyRightsDefaults({ id: first.id, ...(first.data() as any) }) : null;
    }

    async addResourceToStore(resourceId: string, storeKey: string): Promise<void> {
        const db = getFirestore();
        const ref = doc(db, this.RESOURCES, resourceId);
        const batch = writeBatch(db);
        batch.update(ref, { coreStores: arrayUnion(storeKey) });
        await batch.commit();
    }

    async addResourcesToStore(resourceIds: string[], storeKey: string): Promise<void> {
        if (resourceIds.length === 0) return;
        const db = getFirestore();
        const batch = writeBatch(db);
        resourceIds.forEach(id => {
            batch.update(doc(db, this.RESOURCES, id), {
                coreStores: arrayUnion(storeKey),
            });
        });
        await batch.commit();
    }

    async updateResourceMetadata(
        resourceId: string,
        data: Partial<AdminLibraryResource> & Record<string, unknown>,
    ): Promise<void> {
        const db = getFirestore();
        await updateDoc(doc(db, this.RESOURCES, resourceId), data);
    }

    async setAnnotatedGeminiInfo(
        resourceId: string,
        uri: string,
        name: string,
    ): Promise<void> {
        const db = getFirestore();
        await updateDoc(doc(db, this.RESOURCES, resourceId), {
            'metadata.annotatedGeminiUri': uri,
            'metadata.annotatedGeminiName': name,
        });
    }

    /**
     * Bulk-marks the given documents as `publiclyCitable: false` (safe default
     * for legacy entries created before the citable flag existed). Chunks the
     * writes to respect Firestore's 500-op batch limit.
     */
    async markResourcesAsRestrictedCitable(resourceIds: string[]): Promise<number> {
        if (resourceIds.length === 0) return 0;
        const db = getFirestore();
        const batchSize = 450;
        let total = 0;
        for (let i = 0; i < resourceIds.length; i += batchSize) {
            const batch = writeBatch(db);
            const slice = resourceIds.slice(i, i + batchSize);
            for (const id of slice) {
                batch.update(doc(db, this.RESOURCES, id), { publiclyCitable: false });
                total++;
            }
            await batch.commit();
        }
        return total;
    }

    // ── Storage ────────────────────────────────────────────────────────────
    async getDownloadUrl(gsUri: string): Promise<string> {
        const storage = getStorage();
        const fileRef = storageRef(storage, gsUri);
        return await getDownloadURL(fileRef);
    }

    // ── Cloud Functions ────────────────────────────────────────────────────
    async indexDocument(resourceId: string, force: boolean): Promise<IndexResult> {
        const fn = httpsCallable<
            { resourceId: string; force: boolean },
            IndexResult
        >(getFunctions(), 'indexStructuredDocument', { timeout: 900_000 });
        const result = await fn({ resourceId, force });
        return result.data ?? {};
    }

    async reprocessWithLlamaParse(resourceId: string, force: boolean): Promise<ReprocessResult> {
        const fn = httpsCallable<
            { resourceId: string; force: boolean },
            ReprocessResult
        >(getFunctions(), 'reprocessWithLlamaParse', { timeout: 900_000 });
        const result = await fn({ resourceId, force });
        return result.data ?? {};
    }

    /**
     * Standard-cost extraction path: re-extracts a single library_resource using
     * Gemini 2.0 Flash (~5-12× cheaper than LlamaParse for narrative books).
     * Output structure is identical, so the chunker / RAG pipeline don't change.
     */
    async processWithGemini(resourceId: string, force: boolean): Promise<ReprocessResult> {
        const fn = httpsCallable<
            { resourceId: string; force: boolean },
            ReprocessResult
        >(getFunctions(), 'processWithGemini', { timeout: 900_000 });
        const result = await fn({ resourceId, force });
        return result.data ?? {};
    }

    /**
     * Routes the extraction request to the standard (Gemini) or premium
     * (LlamaParse) path. The default is `'standard'`; admin can opt into
     * `'premium'` for complex layouts (multi-column, dense tables, scanned).
     */
    async processResource(
        resourceId: string,
        force: boolean,
        mode: 'standard' | 'premium' = 'standard',
    ): Promise<ReprocessResult> {
        return mode === 'premium'
            ? this.reprocessWithLlamaParse(resourceId, force)
            : this.processWithGemini(resourceId, force);
    }

    async syncStore(context: string): Promise<SyncStoreResult> {
        const fn = httpsCallable<{ context: string }, SyncStoreResult>(
            getFunctions(),
            'syncCoreLibraryStore',
        );
        const result = await fn({ context });
        return result.data;
    }

    async unlinkFileFromStore(documentId: string, context: string): Promise<UnlinkResult> {
        const fn = httpsCallable<
            { documentId: string; context: string },
            UnlinkResult
        >(getFunctions(), 'removeFileFromStore');
        const result = await fn({ documentId, context });
        return result.data;
    }

    async deleteStore(key: string): Promise<{ success?: boolean; message?: string }> {
        const fn = httpsCallable<{ key: string }, { success?: boolean; message?: string }>(
            getFunctions(),
            'deleteCoreLibraryStore',
        );
        const result = await fn({ key });
        return result.data ?? {};
    }

    async updateStore(key: string, displayName: string, description: string): Promise<void> {
        const fn = httpsCallable(getFunctions(), 'updateCoreLibraryStore');
        await fn({ key, displayName, description });
    }

    async createStore(input: { key: string; displayName: string; description: string }): Promise<void> {
        const fn = httpsCallable(getFunctions(), 'createCoreLibraryStore');
        await fn(input);
    }

    /**
     * One-shot Cloud Functions used by the legacy migration buttons in the admin
     * panel. Returned as `unknown` because each callable has a different result
     * shape; the caller narrows it.
     */
    async runMigration(name: 'migrateLegacySermons' | 'migratePlanQuotas'): Promise<unknown> {
        const fn = httpsCallable(getFunctions(), name);
        const result = await fn({});
        return result.data;
    }

    /**
     * Triggers the CORE Library seed ingest — writes the non-confession
     * sources from [docs/pastoral-fidelity/data/core-library-seed.json]
     * into `/library_resources` with full rights-aware metadata. Idempotent
     * (uses `source_id` as the Firestore doc id, `merge: true`).
     *
     * Confession sources are skipped here because they already live in
     * `/confessions/` via PR 0.2 (`ingestCoreLibraryConfessions`).
     */
    async ingestLibrarySeedSources(): Promise<{
        success: boolean;
        written: number;
        skipped: number;
        report: Array<{
            sourceId: string;
            status: 'written' | 'skipped-confession';
            license: string;
            ingestionStatus: string;
        }>;
    }> {
        const fn = httpsCallable<
            Record<string, never>,
            {
                success: boolean;
                written: number;
                skipped: number;
                report: Array<{
                    sourceId: string;
                    status: 'written' | 'skipped-confession';
                    license: string;
                    ingestionStatus: string;
                }>;
            }
        >(getFunctions(), 'ingestLibrarySeedSources');
        const result = await fn({});
        return result.data;
    }

    /**
     * Returns every doc in `/library_resources` flagged
     * `isSystemSource === true` — used by the "CORE Seed" tab in
     * `CoreLibraryAdmin` so admins can see the canonical seed entries
     * regardless of `coreStores` assignment.
     */
    async getSystemSourceResources(): Promise<AdminLibraryResource[]> {
        const db = getFirestore();
        const q = query(
            collection(db, this.RESOURCES),
            where('isSystemSource', '==', true),
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => applyRightsDefaults({ id: d.id, ...(d.data() as any) }));
    }

    // ── LlamaParse multi-account monitoring (Hito 6) ──────────────────────

    /**
     * Reads every doc in the top-level `llamaparseAccounts` collection — used
     * by the admin monitoring page to render the consumption table.
     */
    async getLlamaParseAccounts(): Promise<Array<Record<string, any>>> {
        const db = getFirestore();
        const snap = await getDocs(collection(db, 'llamaparseAccounts'));
        return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    }

    /**
     * Toggles `active` on a LlamaParse account doc — used by the admin UI to
     * temporarily disable an account without deleting its history.
     */
    async setLlamaParseAccountActive(accountId: string, active: boolean): Promise<void> {
        const db = getFirestore();
        await updateDoc(doc(db, 'llamaparseAccounts', accountId), {
            active,
            updatedAt: new Date(),
        });
    }
}

export const coreLibraryAdminService = new CoreLibraryAdminService();
