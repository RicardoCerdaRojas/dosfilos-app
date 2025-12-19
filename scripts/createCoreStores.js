#!/usr/bin/env node
/**
 * One-time script to create Core Library File Search Stores
 * Run: GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json node scripts/createCoreStores.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();

// IMPORTANT: Set your Gemini API key here or via environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';

async function createCoreLibraryStores() {
    try {
        console.log('🚀 Starting Core Library Stores creation...\n');

        // 1. Get admin user ID
        console.log('📋 Finding admin user...');
        const usersSnapshot = await db.collection('users')
            .where('email', '==', 'rdocerda@gmail.com')
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            throw new Error('Admin user not found');
        }

        const adminUserId = usersSnapshot.docs[0].id;
        console.log(`✅ Admin user ID: ${adminUserId}\n`);

        // 2. Get core documents
        console.log('📚 Fetching core library documents...');
        const coreDocsSnapshot = await db.collection('library_resources')
            .where('userId', '==', adminUserId)
            .where('isCore', '==', true)
            .get();

        // Group by context
        const docsByContext = {
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
                    geminiName: data.metadata?.geminiName, // e.g., "files/xxxxx"
                    pageCount: data.pageCount || 0
                });
            }
        });

        console.log('📊 Core documents by context:');
        console.log(`   Exegesis: ${docsByContext.exegesis.length}`);
        console.log(`   Homiletics: ${docsByContext.homiletics.length}`);
        console.log(`   Generic: ${docsByContext.generic.length}\n`);

        // 3. Create stores
        const stores = {
            exegesis: null,
            homiletics: null,
            generic: null
        };

        const filesMetadata = {
            exegesis: [],
            homiletics: [],
            generic: []
        };

        for (const context of ['exegesis', 'homiletics', 'generic']) {
            const docs = docsByContext[context];
            if (docs.length === 0) {
                console.log(`⚠️  Skipping ${context} (no documents)\n`);
                continue;
            }

            // Filter docs with geminiUri
            const docsWithUri = docs.filter(d => d.geminiUri);
            if (docsWithUri.length === 0) {
                console.log(`⚠️  Skipping ${context} (no synced documents)\n`);
                continue;
            }

            console.log(`📦 Creating store for ${context}...`);
            // Create empty store first
            const displayName = `Dos Filos - Biblioteca de ${context.charAt(0).toUpperCase() + context.slice(1)}`;
            const createResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ displayName })
                }
            );
            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                console.error(`❌ Failed to create ${context} store: ${errorText}`);
                continue;
            }
            const storeData = await createResponse.json();
            stores[context] = storeData.name;
            console.log(`   ✅ Store created: ${storeData.name}`);
            // Import files to store using :importFile endpoint
            for (const doc of docsWithUri) {
                console.log(`   📄 Importing "${doc.title}"...`);
                const importResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/${storeData.name}:importFile?key=${GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileName: doc.geminiName })
                    }
                );
                if (importResponse.ok) {
                    console.log(`      ✅ Imported successfully`);
                    filesMetadata[context].push({
                        geminiUri: doc.geminiUri,
                        name: doc.title,
                        author: doc.author,
                        pages: doc.pageCount,
                        uploadedAt: new Date()
                    });
                } else {
                    const errorText = await importResponse.text();
                    console.warn(`      ⚠️  Failed (HTTP ${importResponse.status}): ${errorText}`);
                }
            }
            console.log('');
        }

        // 4. Save config to Firestore
        console.log('💾 Saving configuration to Firestore...');
        await db.doc('config/coreLibraryStores').set({
            stores,
            files: filesMetadata,
            createdAt: new Date(),
            lastValidatedAt: new Date()
        });

        console.log('✅ Configuration saved!\n');

        // Summary
        console.log('🎉 CORE LIBRARY STORES CREATED SUCCESSFULLY!\n');
        console.log('📊 Summary:');
        console.log(`   Exegesis: ${filesMetadata.exegesis.length} files`);
        console.log(`   Homiletics: ${filesMetadata.homiletics.length} files`);
        console.log(`   Generic: ${filesMetadata.generic.length} files\n`);

        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run
createCoreLibraryStores();
