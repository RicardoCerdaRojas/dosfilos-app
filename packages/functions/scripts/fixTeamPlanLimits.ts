#!/usr/bin/env ts-node
import * as admin from 'firebase-admin';

/**
 * Script to add/update limits to the team plan in Firestore
 * 
 * This will set the correct limits for the team plan so that
 * UsageLimitsService can properly check usage limits.
 */

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
    console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: 'dosfilosapp',
});

const db = admin.firestore();

// Update all plans with correct limits
async function updateAllPlans() {
    try {
        console.log('🔧 Actualizando todos los planes para asegurar consistencia...\n');

        // FREE PLAN
        const freePlanLimits = {
            limits: {
                sermonsPerMonth: 1,
                maxPreachingPlans: 1, // TOTAL limit (not monthly)
                greekSessionsPerMonth: 1,
                libraryStorageMB: 0, // No library access
                aiRequestsPerDay: 5,
                maxMembers: 1
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // PRO PLAN
        const proPlanLimits = {
            limits: {
                sermonsPerMonth: 4,
                maxPreachingPlansPerMonth: 2, // Monthly limit
                greekSessionsPerMonth: 3,
                libraryStorageMB: 200,
                aiRequestsPerDay: 50,
                maxMembers: 1
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // TEAM PLAN
        const teamPlanLimits = {
            limits: {
                sermonsPerMonth: 12,
                maxPreachingPlansPerMonth: 6,
                greekSessionsPerMonth: 15,
                libraryStorageMB: 500,
                aiRequestsPerDay: 100,
                maxMembers: 5
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Update all plans
        await db.collection('plans').doc('free').update(freePlanLimits);
        console.log('✅ Plan Free actualizado');

        await db.collection('plans').doc('pro').update(proPlanLimits);
        console.log('✅ Plan Pro actualizado');

        await db.collection('plans').doc('team').update(teamPlanLimits);
        console.log('✅ Plan Team actualizado');

        console.log('\n🎉 ¡Todos los planes actualizados correctamente!\n');
        console.log('📋 Resumen de límites:');
        console.log('\n  FREE:');
        console.log('    - 1 sermón/mes');
        console.log('    - 1 plan total (no monthly)');
        console.log('    - 1 estudio griego/mes');
        console.log('    - Sin biblioteca');
        console.log('\n  PRO:');
        console.log('    - 4 sermones/mes');
        console.log('    - 2 planes/mes');
        console.log('    - 3 estudios griego/mes');
        console.log('    - 200 MB biblioteca');
        console.log('\n  TEAM:');
        console.log('    - 12 sermones/mes');
        console.log('    - 6 planes/mes');
        console.log('    - 15 estudios griego/mes');
        console.log('    - 500 MB biblioteca\n');

    } catch (error) {
        console.error('❌ Error actualizando los planes:', error);
        process.exit(1);
    }
}

// Run the update
updateAllPlans()
    .then(() => {
        console.log('👋 ¡Completado!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
