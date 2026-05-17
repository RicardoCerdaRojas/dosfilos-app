import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

interface UpdateCoreLibraryStoreRequest {
    key: string;
    displayName: string;
    description?: string;
}

/**
 * Updates a Core Library store's display metadata.
 *
 * Post Phase-2-only cleanup: no longer touches the Gemini File Search API.
 * Stores are pure logical keys; their displayName and description live only
 * in `config/coreLibraryStores` in Firestore.
 */
export const updateCoreLibraryStore = onCall<UpdateCoreLibraryStoreRequest>(
    {
        ...appCheckCallableOptions(),
        cors: true,
        memory: '256MiB',
        timeoutSeconds: 30,
    },
    async (request) => {
        const db = getFirestore();

        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can edit core library stores');
        }

        const { key, displayName, description } = request.data;
        if (!key || !displayName) {
            throw new HttpsError('invalid-argument', 'Key and Display Name are required');
        }

        try {
            console.log(`✏️ Updating Core Store: ${key}`);

            const configRef = db.doc('config/coreLibraryStores');
            const configSnap = await configRef.get();
            const config = configSnap.exists ? configSnap.data() : null;

            if (!config?.stores || !(key in config.stores)) {
                throw new HttpsError('not-found', `Store with key '${key}' does not exist`);
            }

            await configRef.set({
                descriptions: {
                    ...(config.descriptions || {}),
                    [key]: description || '',
                },
                displayNames: {
                    ...(config.displayNames || {}),
                    [key]: displayName,
                },
            }, { merge: true });

            return {
                success: true,
                key,
                message: `Store '${displayName}' actualizado`,
            };
        } catch (error: any) {
            console.error(`❌ Error updating store ${key}:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', error.message);
        }
    }
);
