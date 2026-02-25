const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

async function run() {
    const adminUserId = 'tEAhH2r9F7Q0Q1uJvD4yTIFgChC3'; // Replace with actual user ID mapped to rdocerda@gmail.com

    const usersSnapshot = await db.collection('users')
        .where('email', '==', 'rdocerda@gmail.com')
        .limit(1)
        .get();

    const uid = usersSnapshot.docs[0].id;

    console.log('Querying for Exegesis (context = exegesis) with user ID:', uid);

    const snapshot = await db.collection('library_resources')
        .where('userId', '==', uid)
        .where('coreStores', 'array-contains', 'exegesis')
        .get();

    console.log(`Found ${snapshot.empty ? 0 : snapshot.docs.length} docs`);

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.title} | ${data.metadata?.geminiUri ? 'Has Gemini URI' : 'Missing Gemini URI'}`);
    });
}

run().catch(console.error);
