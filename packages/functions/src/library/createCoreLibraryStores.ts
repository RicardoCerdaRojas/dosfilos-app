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
 * Cloud Function: Create Core Library File Search Stores
 * 
 * This MUST run server-side because:
 * - Gemini API adding files to stores has CORS restrictions
 * - Can't be called from browser
 * 
 * Flow:
 * 1. Query Firestore for core library documents (isCore = true)
 * 2. Group by coreContext (exegesis, homiletics, generic)
 * 3. Create 3 File Search Stores
 * 4. Add files to each store
 * 5. Save config to Firestore
 */
export const createCoreLibraryStores = onCall(
    {
        cors: true,
        memory: '1GiB',
        timeoutSeconds: 300,
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

        try {
            console.log('🔧 Starting Core Library Stores creation...');

            // 1. Get admin user ID
            const usersSnapshot = await db.collection('users')
                .where('email', '==', 'rdocerda@gmail.com')
                .limit(1)
                .get();

            if (usersSnapshot.empty) {
                throw new HttpsError('not-found', 'Admin user not found');
            }

            const adminUserId = usersSnapshot.docs[0].id;

            // 2. Get core documents
            const coreDocsSnapshot = await db.collection('library_resources')
                .where('userId', '==', adminUserId)
                .where('isCore', '==', true)
                .get();

            // Group by context
            const docsByContext: Record<string, any[]> = {
                exegesis: [],
                homiletics: [],
                generic: []
            };

            coreDocsSnapshot.forEach(doc => {
                const data = doc.data();
                const context = data.coreContext || 'generic';
                if (docsByContext[context]) {
                    docsByContext[context].push({
                        id: doc.id,
                        title: data.title,
                        author: data.author,
                        geminiUri: data.metadata?.geminiUri,
                        pageCount: data.pageCount || 0
                    });
                }
            });

            console.log('📚 Core documents:', {
                exegesis: docsByContext.exegesis.length,
                homiletics: docsByContext.homiletics.length,
                generic: docsByContext.generic.length
            });

            // 3. Create stores
            const stores: Record<string, string | null> = {
                exegesis: null,
                homiletics: null,
                generic: null
            };

            const filesMetadata: Record<string, any[]> = {
                exegesis: [],
                homiletics: [],
                generic: []
            };

            for (const context of ['exegesis', 'homiletics', 'generic']) {
                const docs = docsByContext[context];
                if (docs.length === 0) {
                    console.log(`⚠️ Skipping ${context} (no documents)`);
                    continue;
                }

                // Filter docs with geminiUri
                const docsWithUri = docs.filter(d => d.geminiUri);
                if (docsWithUri.length === 0) {
                    console.log(`⚠️ Skipping ${context} (no synced documents)`);
                    continue;
                }

                console.log(`📦 Creating store for ${context}...`);

                // Create empty store
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
                    console.error(`❌ Failed to create ${context} store:`, errorText);
                    continue;
                }

                const storeData = await createResponse.json() as { name: string };
                stores[context] = storeData.name;
                console.log(`  ✅ Store created: ${storeData.name}`);

                // Import files to store using :importFile endpoint
                for (const doc of docsWithUri) {
                    console.log(`    Importing ${doc.title}...`);
                    const importResponse = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/${storeData.name}:importFile?key=${apiKey}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fileName: doc.geminiName })
                        }
                    );

                    if (importResponse.ok) {
                        console.log(`    ✅ ${doc.title} imported`);
                        filesMetadata[context].push({
                            geminiUri: doc.geminiUri,
                            name: doc.title,
                            author: doc.author,
                            pages: doc.pageCount,
                            uploadedAt: new Date()
                        });
                    } else {
                        const errorText = await importResponse.text();
                        console.warn(`    ⚠️ Failed to import ${doc.title}:`, errorText);
                    }
                }
            }

            // 4. Save config
            await db.doc('config/coreLibraryStores').set({
                stores,
                files: filesMetadata,
                createdAt: new Date(),
                lastValidatedAt: new Date()
            });

            console.log('✅ Config saved to Firestore');

            return {
                success: true,
                stores,
                filesCount: {
                    exegesis: filesMetadata.exegesis.length,
                    homiletics: filesMetadata.homiletics.length,
                    generic: filesMetadata.generic.length
                }
            };

        } catch (error: any) {
            console.error('❌ Error creating stores:', error);
            throw new HttpsError('internal', error.message);
        }
    });
