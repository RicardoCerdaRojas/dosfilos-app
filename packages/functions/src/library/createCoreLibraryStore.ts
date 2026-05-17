import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

interface CreateCoreLibraryStoreRequest {
    key: string;
    displayName: string;
    description?: string;
}

/**
 * Creates a new Core Library store.
 *
 * Post Phase-2-only cleanup: this function NO LONGER creates a Gemini File Search
 * store. Stores are pure logical keys that document_chunks are tagged with via the
 * `stores: string[]` array. Retrieval filters chunks by those keys through
 * findNearest — no external Gemini store is needed.
 *
 * The `config/coreLibraryStores.stores[key]` entry is kept for backwards
 * compatibility with older code that expected a URI value there, but it now
 * stores `null`.
 */
export const createCoreLibraryStore = onCall<CreateCoreLibraryStoreRequest>(
    {
        ...appCheckCallableOptions(),
        cors: true,
        memory: '256MiB',
        timeoutSeconds: 30,
    },
    async (request) => {
        const db = getFirestore();

        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can create core library stores');
        }

        const { key, displayName, description } = request.data;

        if (!key || !/^[a-z0-9-]+$/.test(key)) {
            throw new HttpsError('invalid-argument', 'Invalid key. Must be lowercase alphanumeric with hyphens.');
        }
        if (!displayName) {
            throw new HttpsError('invalid-argument', 'Display Name is required');
        }

        try {
            console.log(`📦 Creating Core Store: ${displayName} (${key}) — Phase 2 only, no Gemini store`);

            const configRef = db.doc('config/coreLibraryStores');
            const configSnap = await configRef.get();
            const config = configSnap.exists ? configSnap.data() : null;

            if (config?.stores && key in config.stores) {
                throw new HttpsError('already-exists', `Store with key '${key}' already exists`);
            }

            // Write the store metadata — the value is kept as `null` for backwards
            // compatibility with code paths that read `config.stores[key]` expecting
            // either a Gemini URI or null.
            await configRef.set({
                stores: {
                    ...(config?.stores || {}),
                    [key]: null,
                },
                files: {
                    ...(config?.files || {}),
                    [key]: [],
                },
                descriptions: {
                    ...(config?.descriptions || {}),
                    [key]: description || '',
                },
                displayNames: {
                    ...(config?.displayNames || {}),
                    [key]: displayName,
                },
                lastValidatedAt: new Date(),
            }, { merge: true });

            console.log(`✅ Core Store registered: ${key}`);
            return {
                success: true,
                key,
                message: `Store '${displayName}' creado (Phase 2 RAG)`,
            };
        } catch (error: any) {
            console.error(`❌ Error creating store ${key}:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', error.message);
        }
    }
);
