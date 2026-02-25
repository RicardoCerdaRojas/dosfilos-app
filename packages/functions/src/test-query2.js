const admin = require('firebase-admin');

// Initialize with application default credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('library_resources')
    .where('userId', '==', 'rdocerda@gmail.com')
    .where('storeContexts', 'array-contains', 'exegesis')
    .get();

  console.log(`Found ${snapshot.docs.length} documents.`);
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`Doc ID: ${doc.id}`);
    console.log(`Title: ${data.title}`);
    console.log(`geminiUri: ${data.metadata?.geminiUri || 'MISSING'}`);
    console.log('---');
  });
}

run().catch(console.error).finally(() => process.exit(0));
