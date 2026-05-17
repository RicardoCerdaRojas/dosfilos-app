import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

const CHUNK_COLLECTION = 'document_chunks';
const LIBRARY_COLLECTION = 'library_resources';
const STORES_CONFIG_DOC = 'config/coreLibraryStores';

export interface ResourceAudit {
    id: string;
    title: string;
    author: string;
    stores: string[];
    extractionVersion?: string;
    indexingStatus?: string;
    indexedChunkCount?: number;     // Reported by indexer (in library_resources)
    actualChunkCount: number;       // Live count from document_chunks
    pageCount?: number;
}

export interface StoreAudit {
    key: string;
    displayName: string;
    storeId: string | null;        // Gemini File Search store id (legacy)
    resourceCount: number;
    llamaParseCount: number;       // Docs with extractionVersion=3.0-llamaparse
    indexedCount: number;          // Docs with indexingStatus=ready
    chunkCount: number;            // Total chunks across all docs in this store
    pageCount: number;             // Total pages across all docs
    tutorCount: number;            // Number of active tutors using this store
}

export interface AuditIssue {
    resourceId: string;
    title: string;
    severity: 'error' | 'warning';
    category: 'no-llamaparse' | 'missing-chunks' | 'inconsistent-count' | 'no-stores' | 'empty-text';
    message: string;
}

export interface AuditResponse {
    generatedAt: string;
    summary: {
        totalResources: number;
        totalStores: number;
        totalChunks: number;
        totalPages: number;
        llamaParseCount: number;
        indexedCount: number;
        issuesCount: number;
    };
    stores: StoreAudit[];
    resources: ResourceAudit[];
    issues: AuditIssue[];
}

/**
 * Callable Cloud Function: auditIndexing
 *
 * Produces a complete audit report of the Phase 2 RAG index.
 * Counts chunks per resource, per store; detects silent failures;
 * cross-references library_resources with document_chunks.
 */
export const auditIndexing = onCall<Record<string, never>>(
    {
        ...appCheckCallableOptions(),
        region: 'us-central1',
        memory: '512MiB',
        timeoutSeconds: 300,
        cors: true,
    },
    async (request): Promise<AuditResponse> => {
        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can run the audit');
        }

        const db = getFirestore();

        // 1. Load stores config
        const configSnap = await db.doc(STORES_CONFIG_DOC).get();
        const storesCfg = (configSnap.data()?.stores ?? {}) as Record<string, string | null>;
        const displayNames = (configSnap.data()?.displayNames ?? {}) as Record<string, string>;

        // 2. Load all core library resources (admin-owned, with coreStores)
        //    We look up admin userId by email first
        const adminSnap = await db.collection('users').where('email', '==', 'rdocerda@gmail.com').limit(1).get();
        if (adminSnap.empty) throw new HttpsError('not-found', 'Admin user not found');
        const adminUserId = adminSnap.docs[0].id;

        const resourcesSnap = await db.collection(LIBRARY_COLLECTION)
            .where('userId', '==', adminUserId)
            .get();

        const coreResources = resourcesSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as any))
            .filter(r => Array.isArray(r.coreStores) && r.coreStores.length > 0);

        console.log(`[Audit] Found ${coreResources.length} core resources`);

        // 3. Load tutors and count per store
        const agentsSnap = await db.collection('ai_agents').get();
        const tutorStoreCount: Record<string, number> = {};
        for (const a of agentsSnap.docs) {
            const data = a.data();
            if (!data.isActive) continue;
            const corpusIds: string[] = data.corpusIds ?? [];
            // Reverse lookup: which store keys do these URIs match?
            for (const uri of corpusIds) {
                for (const [key, storeId] of Object.entries(storesCfg)) {
                    if (storeId === uri) {
                        tutorStoreCount[key] = (tutorStoreCount[key] ?? 0) + 1;
                    }
                }
            }
        }

        // 4. Count chunks per resource (aggregation query — efficient)
        const resourceAudits: ResourceAudit[] = [];
        for (const r of coreResources) {
            const countSnap = await db.collection(CHUNK_COLLECTION)
                .where('resourceId', '==', r.id)
                .count()
                .get();
            const actualChunkCount = countSnap.data().count;

            resourceAudits.push({
                id: r.id,
                title: r.title ?? 'Sin título',
                author: r.author ?? 'Autor desconocido',
                stores: r.coreStores ?? [],
                extractionVersion: r.extractionVersion,
                indexingStatus: r.indexingStatus,
                indexedChunkCount: r.indexedChunkCount,
                actualChunkCount,
                pageCount: r.pageCount,
            });
        }

        // 5. Aggregate per store
        const storeAudits: StoreAudit[] = [];
        const allStoreKeys = Object.keys(storesCfg);
        for (const key of allStoreKeys) {
            const resourcesInStore = resourceAudits.filter(r => r.stores.includes(key));
            storeAudits.push({
                key,
                displayName: displayNames[key] ?? key,
                storeId: storesCfg[key] ?? null,
                resourceCount: resourcesInStore.length,
                llamaParseCount: resourcesInStore.filter(r => r.extractionVersion === '3.0-llamaparse').length,
                indexedCount: resourcesInStore.filter(r => r.indexingStatus === 'ready').length,
                chunkCount: resourcesInStore.reduce((s, r) => s + r.actualChunkCount, 0),
                pageCount: resourcesInStore.reduce((s, r) => s + (r.pageCount ?? 0), 0),
                tutorCount: tutorStoreCount[key] ?? 0,
            });
        }

        // 6. Detect issues
        const issues: AuditIssue[] = [];
        for (const r of resourceAudits) {
            if (!r.extractionVersion || r.extractionVersion !== '3.0-llamaparse') {
                issues.push({
                    resourceId: r.id,
                    title: r.title,
                    severity: 'warning',
                    category: 'no-llamaparse',
                    message: `No extraído con LlamaParse (${r.extractionVersion ?? 'sin extracción'})`,
                });
                continue;
            }
            if (r.stores.length === 0) {
                issues.push({
                    resourceId: r.id,
                    title: r.title,
                    severity: 'warning',
                    category: 'no-stores',
                    message: 'Sin stores asignados (coreStores vacío)',
                });
            }
            if (r.actualChunkCount === 0) {
                issues.push({
                    resourceId: r.id,
                    title: r.title,
                    severity: 'error',
                    category: 'missing-chunks',
                    message: 'Extraído con LlamaParse pero 0 chunks indexados',
                });
                continue;
            }
            if (r.indexedChunkCount !== undefined && Math.abs(r.actualChunkCount - r.indexedChunkCount) > 2) {
                issues.push({
                    resourceId: r.id,
                    title: r.title,
                    severity: 'warning',
                    category: 'inconsistent-count',
                    message: `Inconsistencia: ${r.actualChunkCount} chunks actuales vs ${r.indexedChunkCount} reportados`,
                });
            }
        }

        // 7. Totals
        const totalChunks = resourceAudits.reduce((s, r) => s + r.actualChunkCount, 0);
        const totalPages = resourceAudits.reduce((s, r) => s + (r.pageCount ?? 0), 0);

        const response: AuditResponse = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalResources: resourceAudits.length,
                totalStores: storeAudits.length,
                totalChunks,
                totalPages,
                llamaParseCount: resourceAudits.filter(r => r.extractionVersion === '3.0-llamaparse').length,
                indexedCount: resourceAudits.filter(r => r.indexingStatus === 'ready').length,
                issuesCount: issues.length,
            },
            stores: storeAudits.sort((a, b) => a.displayName.localeCompare(b.displayName, 'es')),
            resources: resourceAudits.sort((a, b) => a.title.localeCompare(b.title, 'es')),
            issues,
        };

        console.log(`[Audit] Complete: ${totalChunks} chunks across ${resourceAudits.length} resources, ${issues.length} issues`);
        return response;
    }
);
