import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

interface UpdateCoreLibraryStoreRequest {
    key: string;
    displayName: string;
    description?: string;
}

export const updateCoreLibraryStore = onCall<UpdateCoreLibraryStoreRequest>(
    {
        cors: true,
        memory: '256MiB',
        timeoutSeconds: 30,
        secrets: ['GEMINI_API_KEY']
    },
    async (request) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY not configured');
        }

        // Only admin can call this
        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can edit core library stores');
        }

        const { key, displayName, description } = request.data;
        if (!key || !displayName) {
            throw new HttpsError('invalid-argument', 'Key and Display Name are required');
        }

        try {
            console.log(`✏️ Updating Core Store: ${key}...`);

            const configRef = db.doc('config/coreLibraryStores');
            const configSnap = await configRef.get();
            const config = configSnap.exists ? configSnap.data() : null;

            if (!config?.stores?.[key]) {
                throw new HttpsError('not-found', `Store with key '${key}' does not exist`);
            }

            const storeId = config.stores[key]; // e.g. "fileSearchStores/xxx"

            // 1. Update Gemini Store
            const updateResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/${storeId}?updateMask=displayName&key=${apiKey}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ displayName: `Dos Filos - ${displayName}` })
                }
            );

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new HttpsError('internal', `Failed to update store in Gemini: ${errorText}`);
            }

            console.log(`✅ Gemini Store updated: ${storeId}`);

            // 2. Update Config in Firestore
            await configRef.set({
                descriptions: {
                    ...(config.descriptions || {}),
                    [key]: description || ''
                },
                displayNames: {
                    ...(config.displayNames || {}),
                    [key]: displayName
                }
            }, { merge: true });

            return {
                success: true,
                key,
                message: `Store '${displayName}' updated successfully`
            };

        } catch (error: any) {
            console.error(`❌ Error updating store ${key}:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', error.message);
        }
    }
);
