/**
 * Migration Script: Hide Free Plan from New Users
 * 
 * Purpose: Set Free plan to isPublic=false and isLegacy=true
 * This ensures only legacy users can keep their free plan,
 * while new users must choose from paid plans with 30-day trial.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function hideFreeplanFromNewUsers() {
    console.log('🔒 Hiding Free plan from new user signups...\n');

    try {
        const freePlanRef = db.collection('plans').doc('free');

        // Check if plan exists
        const freePlanDoc = await freePlanRef.get();

        if (!freePlanDoc.exists) {
            console.log('⚠️  Free plan not found in database');
            return;
        }

        console.log('📝 Current Free plan data:');
        console.log(JSON.stringify(freePlanDoc.data(), null, 2));

        // Update the plan
        await freePlanRef.update({
            isPublic: false,
            isLegacy: true,
            description: 'Legacy free plan - not available for new signups (grandfathered users only)',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('\n✅ Free plan updated successfully!');
        console.log('   - isPublic: false (won\'t show in public listings)');
        console.log('   - isLegacy: true (marked as legacy plan)');
        console.log('   - Description updated');

        console.log('\n📊 Impact:');
        console.log('   - Existing free users: Keep their plan ✅');
        console.log('   - New users: Must choose Basic/Pro/Team with 30-day trial');
        console.log('   - Landing page: Won\'t show Free plan');
        console.log('   - Registration: Won\'t show Free plan');

    } catch (error) {
        console.error('❌ Error updating Free plan:', error);
        throw error;
    }
}

// Run the migration
hideFreeplanFromNewUsers()
    .then(() => {
        console.log('\n🎉 Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
