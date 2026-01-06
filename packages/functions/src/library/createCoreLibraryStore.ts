
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

interface CreateCoreLibraryStoreRequest {
    key: string;
    displayName: string;
    description?: string;
}

export const createCoreLibraryStore = onCall<CreateCoreLibraryStoreRequest>(
    {
        cors: true,
        memory: '512MiB',
        timeoutSeconds: 60,
        secrets: ['GEMINI_API_KEY']
    },
    async (request) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY not configured');
        }

        // Only admin can call this
        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can create core library stores');
        }

        const { key, displayName, description } = request.data;

        // Validation
        if (!key || !/^[a-z0-9-]+$/.test(key)) {
            throw new HttpsError('invalid-argument', 'Invalid key. Must be lowercase alphanumeric with hyphens.');
        }
        if (!displayName) {
            throw new HttpsError('invalid-argument', 'Display Name is required');
        }

        try {
            console.log(`📦 Creating new Core Store: ${displayName} (${key})...`);

            // 1. Check if key already exists
            const configRef = db.doc('config/coreLibraryStores');
            const configSnap = await configRef.get();
            const config = configSnap.exists ? configSnap.data() : null;

            if (config?.stores?.[key]) {
                throw new HttpsError('already-exists', `Store with key '${key}' already exists`);
            }

            // 2. Create Store in Gemini
            const createResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ displayName: `Dos Filos - ${displayName}` })
                }
            );

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new HttpsError('internal', `Failed to create store in Gemini: ${errorText}`);
            }

            const storeData = await createResponse.json() as { name: string };
            const newStoreId = storeData.name;
            console.log(`✅ Gemini Store created: ${newStoreId}`);

            // 3. Update Config in Firestore
            await configRef.set({
                stores: {
                    ...(config?.stores || {}),
                    [key]: newStoreId
                },
                files: {
                    ...(config?.files || {}),
                    [key]: []
                },
                descriptions: { // New field for descriptions
                    ...(config?.descriptions || {}),
                    [key]: description || ''
                },
                lastValidatedAt: new Date()
            }, { merge: true });

            return {
                success: true,
                key,
                storeId: newStoreId,
                message: `Store '${displayName}' created successfully`
            };

        } catch (error: any) {
            console.error(`❌ Error creating store ${key}:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', error.message);
        }
    }
);
