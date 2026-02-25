const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({
  projectId: "demo-project"
});

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('library_resources').get();
  console.log(`Found ${snapshot.docs.length} documents.`);
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`Title: ${data.title}, geminiUri: ${data.metadata?.geminiUri || 'MISSING'}`);
  });
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
