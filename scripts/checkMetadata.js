#!/usr/bin/env node
const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();

async function checkMetadata() {
    const snapshot = await db.collection('library_resources')
        .where('isCore', '==', true)
        .limit(1)
        .get();

    if (snapshot.empty) {
        console.log('No core documents found');
        return;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log('📄 Document:', data.title);
    console.log('🔍 Metadata:');
    console.log('   geminiName:', data.metadata?.geminiName);
    console.log('   geminiUri:', data.metadata?.geminiUri);
    console.log('\nFull metadata:', JSON.stringify(data.metadata, null, 2));
}

checkMetadata().then(() => process.exit(0));
