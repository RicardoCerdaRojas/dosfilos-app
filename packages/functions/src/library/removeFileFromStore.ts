import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

interface RemoveFileFromStoreRequest {
    documentId: string;
    context: string;
}

export const removeFileFromStore = onCall<RemoveFileFromStoreRequest>(
    {
        ...appCheckCallableOptions(),
        cors: true,
        memory: '1GiB',
        timeoutSeconds: 180,
        secrets: ['GEMINI_API_KEY']
    },
    async (request) => {
        const db = getFirestore();
        // Only admin can call this
        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can remove files from core library stores');
        }

        const { documentId, context } = request.data;
        if (!documentId || !context) {
            throw new HttpsError('invalid-argument', 'Document ID and Context are required');
        }

        try {
            console.log(`🗑️ Removing document ${documentId} from store context '${context}'...`);

            const docRef = db.collection('library_resources').doc(documentId);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                throw new HttpsError('not-found', 'Document not found');
            }

            const data = docSnap.data() as any;
            if (!data.coreStores || !data.coreStores.includes(context)) {
                throw new HttpsError('failed-precondition', 'Document is not in this store');
            }

            // 1. Remove context from library_resources.coreStores
            await docRef.update({
                coreStores: FieldValue.arrayRemove(context)
            });

            // 2. Remove context from all chunks that belong to this resource.
            //    If the chunk only belonged to this store, delete it; otherwise just unlink.
            const chunksSnap = await db.collection('document_chunks')
                .where('resourceId', '==', documentId)
                .where('stores', 'array-contains', context)
                .get();

            const batchSize = 450;
            let chunksUnlinked = 0;
            let chunksDeleted = 0;
            for (let i = 0; i < chunksSnap.docs.length; i += batchSize) {
                const batch = db.batch();
                chunksSnap.docs.slice(i, i + batchSize).forEach(d => {
                    const data = d.data() as any;
                    const stores: string[] = Array.isArray(data.stores) ? data.stores : [];
                    if (stores.length > 1) {
                        batch.update(d.ref, { stores: FieldValue.arrayRemove(context) });
                        chunksUnlinked++;
                    } else {
                        batch.delete(d.ref);
                        chunksDeleted++;
                    }
                });
                await batch.commit();
            }

            console.log(`[removeFileFromStore] doc=${documentId} store=${context} chunksUnlinked=${chunksUnlinked} chunksDeleted=${chunksDeleted}`);

            return {
                success: true,
                chunksUnlinked,
                chunksDeleted,
                message: `Documento desvinculado de ${context}.`,
            };

        } catch (error: any) {
            console.error(`❌ Error removing file ${documentId} from store ${context}:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', error.message);
        }
    }
);
