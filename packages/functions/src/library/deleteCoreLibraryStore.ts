import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface DeleteCoreLibraryStoreRequest {
    key: string;
}

export const deleteCoreLibraryStore = onCall<DeleteCoreLibraryStoreRequest>(
    {
        cors: true,
        memory: '1GiB',
        timeoutSeconds: 300,
    },
    async (request) => {
        const db = getFirestore();

        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can delete core library stores');
        }

        const { key } = request.data;
        if (!key) {
            throw new HttpsError('invalid-argument', 'Store key is required');
        }

        const configRef = db.doc('config/coreLibraryStores');
        const configSnap = await configRef.get();
        const config = configSnap.exists ? configSnap.data() : null;

        if (!config?.stores || !(key in config.stores)) {
            throw new HttpsError('not-found', `Store '${key}' does not exist`);
        }

        // Post Phase-2-only cleanup: stores no longer have a Gemini File Search
        // backing. We only clean up Firestore structures.

        // 2. Remove 'key' from coreStores of all library_resources that reference it
        const resourcesSnap = await db.collection('library_resources')
            .where('coreStores', 'array-contains', key)
            .get();

        const resourceIds: string[] = [];
        const batchSize = 450;
        for (let i = 0; i < resourcesSnap.docs.length; i += batchSize) {
            const batch = db.batch();
            resourcesSnap.docs.slice(i, i + batchSize).forEach(d => {
                resourceIds.push(d.id);
                batch.update(d.ref, { coreStores: FieldValue.arrayRemove(key) });
            });
            await batch.commit();
        }

        // 3. Delete all document_chunks that reference this store
        //    (chunks store a `stores: string[]` array of keys)
        const chunksSnap = await db.collection('document_chunks')
            .where('stores', 'array-contains', key)
            .get();

        let chunksDeleted = 0;
        for (let i = 0; i < chunksSnap.docs.length; i += batchSize) {
            const batch = db.batch();
            chunksSnap.docs.slice(i, i + batchSize).forEach(d => {
                // If chunk belongs to multiple stores, just remove this key; else delete the chunk.
                const data = d.data() as any;
                const stores: string[] = Array.isArray(data.stores) ? data.stores : [];
                if (stores.length > 1) {
                    batch.update(d.ref, { stores: FieldValue.arrayRemove(key) });
                } else {
                    batch.delete(d.ref);
                    chunksDeleted++;
                }
            });
            await batch.commit();
        }

        // 4. Remove the key from config maps
        const updatedStores = { ...(config.stores || {}) };
        delete updatedStores[key];
        const updatedFiles = { ...(config.files || {}) };
        delete updatedFiles[key];
        const updatedDescriptions = { ...(config.descriptions || {}) };
        delete updatedDescriptions[key];
        const updatedDisplayNames = { ...(config.displayNames || {}) };
        delete updatedDisplayNames[key];

        await configRef.set({
            stores: updatedStores,
            files: updatedFiles,
            descriptions: updatedDescriptions,
            displayNames: updatedDisplayNames,
        }, { merge: false });

        console.log(`[deleteCoreLibraryStore] Deleted '${key}' — resources unlinked: ${resourceIds.length}, chunks deleted: ${chunksDeleted}`);

        return {
            success: true,
            key,
            resourcesUnlinked: resourceIds.length,
            chunksDeleted,
            message: `Store '${key}' eliminado. ${resourceIds.length} doc(s) desvinculado(s), ${chunksDeleted} chunk(s) eliminado(s).`,
        };
    }
);
