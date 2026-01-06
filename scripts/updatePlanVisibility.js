/**
 * Script to update plan visibility in Firestore
 * Updates the 'iglesia' (enterprise) plan to be hidden from public listings
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath)
});

const db = admin.firestore();

async function updatePlanVisibility() {
    try {
        console.log('🔄 Updating plan visibility in Firestore...');

        // Update the 'iglesia' plan to hide it
        const planRef = db.collection('plans').doc('iglesia');
        const planDoc = await planRef.get();

        if (!planDoc.exists) {
            console.log('⚠️  Plan "iglesia" not found in Firestore');
            console.log('📋 Available plans:');
            const plansSnapshot = await db.collection('plans').get();
            plansSnapshot.forEach(doc => {
                console.log(`  - ${doc.id}: isPublic=${doc.data().isPublic}`);
            });
            return;
        }

        await planRef.update({
            isPublic: false,
            isActive: false // Also mark as inactive
        });

        console.log('✅ Plan "iglesia" hidden successfully');
        console.log('   - isPublic: false');
        console.log('   - isActive: false');

        // Show all plans and their visibility status
        console.log('\n📋 Current plan visibility:');
        const plansSnapshot = await db.collection('plans').get();
        plansSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${doc.id}: isPublic=${data.isPublic}, isActive=${data.isActive}`);
        });

    } catch (error) {
        console.error('❌ Error updating plan:', error);
    } finally {
        process.exit(0);
    }
}

updatePlanVisibility();
