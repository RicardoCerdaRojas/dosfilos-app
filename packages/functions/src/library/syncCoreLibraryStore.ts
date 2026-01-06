import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase if not already done
try {
    initializeApp();
} catch (e) {
    // Already initialized
}

const db = getFirestore();

/**
 * Cloud Function: Sync a specific Core Library Store
 * 
 * Instead of recreating all stores, this function:
 * 1. Compares desired state (docs marked as Core) vs current state (config)
 * 2. Adds missing files to the store
 * 3. Updates the config with the new state
 * 
 * This is much more efficient than recreating everything.
 */

interface SyncCoreLibraryStoreRequest {
    context: 'exegesis' | 'homiletics' | 'generic';
}

export const syncCoreLibraryStore = onCall<SyncCoreLibraryStoreRequest>(
    {
        cors: true,
        memory: '1GiB',
        timeoutSeconds: 180,
        secrets: ['GEMINI_API_KEY']
    },
    async (request) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY not configured');
        }

        // Only admin can call this
        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can sync core library stores');
        }

        const { context } = request.data;
        if (!context || typeof context !== 'string') {
            throw new HttpsError('invalid-argument', 'Invalid context. Must be a valid store key.');
        }

        try {
            console.log(`🔄 Syncing ${context} store...`);

            // 1. Get admin user ID
            const usersSnapshot = await db.collection('users')
                .where('email', '==', 'rdocerda@gmail.com')
                .limit(1)
                .get();

            if (usersSnapshot.empty) {
                throw new HttpsError('not-found', 'Admin user not found');
            }

            const adminUserId = usersSnapshot.docs[0].id;

            // 2. Get DESIRED state: Documents with this store in their coreStores array
            const desiredDocsSnapshot = await db.collection('library_resources')
                .where('userId', '==', adminUserId)
                .where('coreStores', 'array-contains', context)
                .get();

            const desiredDocs = desiredDocsSnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        title: data.title,
                        author: data.author,
                        geminiUri: data.metadata?.geminiUri,
                        geminiName: data.metadata?.geminiName,
                        pageCount: data.pageCount || 0
                    };
                })
                .filter(d => d.geminiUri && d.geminiName); // Only docs with Gemini files

            console.log(`📋 Desired state: ${desiredDocs.length} documents for ${context}`);

            // 3. Get CURRENT state from config
            const configRef = db.doc('config/coreLibraryStores');
            const configSnap = await configRef.get();
            const config = configSnap.exists ? configSnap.data() : null;

            const currentFiles = config?.files?.[context] || [];
            const storeId = config?.stores?.[context];

            console.log(`📊 Current state: ${currentFiles.length} files in store`);

            // 4. If store doesn't exist, create it first
            if (!storeId) {
                console.log(`📦 Creating new ${context} store...`);
                const displayName = `Dos Filos - Biblioteca de ${context.charAt(0).toUpperCase() + context.slice(1)}`;
                const createResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ displayName })
                    }
                );

                if (!createResponse.ok) {
                    const errorText = await createResponse.text();
                    throw new HttpsError('internal', `Failed to create store: ${errorText}`);
                }

                const storeData = await createResponse.json() as { name: string };
                const newStoreId = storeData.name;

                // Update config with new store
                await configRef.set({
                    ...config,
                    stores: {
                        ...(config?.stores || {}),
                        [context]: newStoreId
                    },
                    files: {
                        ...(config?.files || {}),
                        [context]: []
                    },
                    createdAt: config?.createdAt || new Date(),
                    lastValidatedAt: new Date()
                }, { merge: true });

                console.log(`✅ Store created: ${newStoreId}`);

                // Use the new store ID
                const finalStoreId = newStoreId;

                // 5. Import all desired files (store is empty)
                const filesMetadata = [];
                for (const doc of desiredDocs) {
                    console.log(`  📄 Importing ${doc.title}...`);
                    const importResponse = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/${finalStoreId}:importFile?key=${apiKey}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fileName: doc.geminiName })
                        }
                    );

                    if (importResponse.ok) {
                        console.log(`    ✅ Imported`);
                        filesMetadata.push({
                            geminiUri: doc.geminiUri,
                            name: doc.title,
                            author: doc.author,
                            pages: doc.pageCount,
                            uploadedAt: new Date()
                        });
                    } else {
                        const errorText = await importResponse.text();
                        console.warn(`    ⚠️ Failed to import: ${errorText}`);
                    }
                }

                // 6. Update config
                await configRef.set({
                    files: {
                        ...(config?.files || {}),
                        [context]: filesMetadata
                    },
                    lastValidatedAt: new Date()
                }, { merge: true });

                return {
                    success: true,
                    context,
                    storeCreated: true,
                    filesAdded: filesMetadata.length,
                    filesRemoved: 0,
                    totalFiles: filesMetadata.length
                };
            }

            // 5. Compare states and find differences
            const currentUris = new Set(currentFiles.map((f: any) => f.geminiUri));
            const desiredUris = new Set(desiredDocs.map(d => d.geminiUri));

            const toAdd = desiredDocs.filter(d => !currentUris.has(d.geminiUri));
            const toRemove = currentFiles.filter((f: any) => !desiredUris.has(f.geminiUri));

            console.log(`📊 Differences: +${toAdd.length} files to add, -${toRemove.length} files to remove`);

            if (toAdd.length === 0 && toRemove.length === 0) {
                console.log('✅ Store already in sync');
                return {
                    success: true,
                    context,
                    alreadySynced: true,
                    filesAdded: 0,
                    filesRemoved: 0,
                    totalFiles: currentFiles.length
                };
            }

            // 6. Add missing files
            let addedCount = 0;
            for (const doc of toAdd) {
                console.log(`  📄 Adding ${doc.title} to ${context} store...`);
                const importResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/${storeId}:importFile?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileName: doc.geminiName })
                    }
                );

                if (importResponse.ok) {
                    console.log(`    ✅ Added`);
                    addedCount++;
                    currentFiles.push({
                        geminiUri: doc.geminiUri,
                        name: doc.title,
                        author: doc.author,
                        pages: doc.pageCount,
                        uploadedAt: new Date()
                    });
                } else {
                    const errorText = await importResponse.text();
                    console.warn(`    ⚠️ Failed to add: ${errorText}`);
                }
            }

            // 7. Remove extra files (filter them out from config)
            // Note: Gemini API doesn't have a removeFile endpoint, so we can only update our config
            // The files will remain in the store but won't be tracked
            const removedCount = toRemove.length;
            const updatedFiles = currentFiles.filter((f: any) => desiredUris.has(f.geminiUri));

            console.log(`🗑️ Removing ${removedCount} files from config (they remain in Gemini store)`);

            // 8. Update config
            await configRef.set({
                ...config,
                files: {
                    ...(config?.files || {}),
                    [context]: updatedFiles
                },
                lastValidatedAt: new Date()
            }, { merge: true });

            console.log(`✅ ${context} store synced successfully`);

            return {
                success: true,
                context,
                filesAdded: addedCount,
                filesRemoved: removedCount,
                totalFiles: updatedFiles.length
            };

        } catch (error: any) {
            console.error(`❌ Error syncing ${context} store:`, error);
            throw new HttpsError('internal', error.message);
        }
    });
