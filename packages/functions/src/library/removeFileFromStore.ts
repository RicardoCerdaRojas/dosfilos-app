import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';


interface RemoveFileFromStoreRequest {
    documentId: string;
    context: string;
}

export const removeFileFromStore = onCall<RemoveFileFromStoreRequest>(
    {
        cors: true,
        memory: '512MiB',
        timeoutSeconds: 30
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

            // Remove context from array
            await docRef.update({
                coreStores: FieldValue.arrayRemove(context)
            });

            return {
                success: true,
                message: `File unlinked from ${context}. Store needs to be synced.`
            };

        } catch (error: any) {
            console.error(`❌ Error removing file ${documentId} from store ${context}:`, error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', error.message);
        }
    }
);
