/**
 * Clear Syntax Analysis Cache
 * 
 * Simple script to delete cached syntax analyses from Firestore.
 * Run this when you need to regenerate analyses (e.g., after prompt changes, language updates)
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS env var)
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'dosfilosapp'
    });
}

const db = admin.firestore();

async function clearSyntaxCache() {
    try {
        console.log('🧹 Clearing syntax_analysis_cache...');

        const collectionRef = db.collection('syntax_analysis_cache');
        const snapshot = await collectionRef.get();

        if (snapshot.empty) {
            console.log('✅ Cache already empty');
            return;
        }

        console.log(`Found ${snapshot.size} cached analyses`);

        // Delete all documents
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            console.log(`  - Deleting: ${doc.id}`);
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`✅ Successfully deleted ${snapshot.size} cached analyses`);

    } catch (error) {
        console.error('❌ Error clearing cache:', error);
        throw error;
    }
}

// Run the script
clearSyntaxCache()
    .then(() => {
        console.log('✨ Cache cleared successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('Failed to clear cache:', error);
        process.exit(1);
    });
