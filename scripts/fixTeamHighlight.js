/**
 * Remove highlightText from Team plan
 * Only Pro should be "Más Popular"
 */
const admin = require('firebase-admin');
require('dotenv').config();

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function fixTeamHighlight() {
    console.log('🔧 Removing "Más Popular" from Team plan...\n');

    try {
        const teamRef = db.collection('plans').doc('team');
        const teamDoc = await teamRef.get();

        if (!teamDoc.exists) {
            console.log('❌ Team plan not found');
            process.exit(1);
        }

        await teamRef.update({
            highlightText: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log('✅ Removed highlightText from Team plan');
        console.log('✅ Only Pro plan should now be "Más Popular"');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

fixTeamHighlight()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Failed:', error);
        process.exit(1);
    });
