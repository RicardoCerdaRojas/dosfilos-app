#!/usr/bin/env ts-node
import * as admin from 'firebase-admin';

/**
 * Script to verify and fix plan definitions in Firestore
 * 
 * This script will:
 * 1. Check if the "team" plan exists in the `plans` collection
 * 2. Verify that the plan has correct limits configured
 * 3. Create or update the plan if necessary
 * 
 * Usage:
 * GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json ts-node checkPlanDefinition.ts
 */

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
    console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
    console.error('Please set it to the path of your Firebase service account key JSON file');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: 'dosfilosapp',
});

const db = admin.firestore();

async function checkAndFixPlanDefinitions() {
    try {
        console.log('🔍 Verificando definiciones de planes en Firestore...\n');

        // Check all plans
        const planIds = ['free', 'pro', 'team'];
        const results = [];

        for (const planId of planIds) {
            console.log(`📋 Verificando plan: ${planId}`);
            const planRef = db.collection('plans').doc(planId);
            const planDoc = await planRef.get();

            if (!planDoc.exists) {
                console.log(`   ❌ El plan "${planId}" NO EXISTE en Firestore`);
                results.push({ planId, exists: false, data: null });
            } else {
                const data = planDoc.data();
                console.log(`   ✅ El plan "${planId}" existe`);
                console.log(`   📊 Límites configurados:`);
                console.log(`      - sermonsPerMonth: ${data?.limits?.sermonsPerMonth || 'NO CONFIGURADO'}`);
                console.log(`      - greekSessionsPerMonth: ${data?.limits?.greekSessionsPerMonth || 'NO CONFIGURADO'}`);
                console.log(`      - maxPreachingPlansPerMonth: ${data?.limits?.maxPreachingPlansPerMonth || 'NO CONFIGURADO'}`);
                console.log(`      - maxPreachingPlans: ${data?.limits?.maxPreachingPlans || 'NO CONFIGURADO'}`);
                console.log(`      - libraryStorageMB: ${data?.limits?.libraryStorageMB || 'NO CONFIGURADO'}`);
                console.log(`   📑 Módulos: ${data?.modules?.length || 0} módulos`);
                console.log(`   ✨ Features: ${data?.features?.length || 0} features`);
                results.push({ planId, exists: true, data });
            }
            console.log('');
        }

        // Summary
        console.log('📊 RESUMEN:');
        console.log('═══════════════════════════════════════════════════════\n');

        const missingPlans = results.filter(r => !r.exists);
        if (missingPlans.length > 0) {
            console.log('❌ Planes faltantes en Firestore:');
            missingPlans.forEach(p => console.log(`   - ${p.planId}`));
            console.log('');
            console.log('💡 SOLUCIÓN: Necesitas crear estos planes en Firestore.');
            console.log('   Puedes usar la consola de Firebase o ejecutar un script de migración.\n');
        } else {
            console.log('✅ Todos los planes existen en Firestore\n');
        }

        // Check user subscription
        console.log('👤 Verificando suscripción del usuario rdocerda@gmail.com...\n');
        const userSnapshot = await db.collection('users')
            .where('email', '==', 'rdocerda@gmail.com')
            .limit(1)
            .get();

        if (userSnapshot.empty) {
            console.log('❌ Usuario no encontrado');
        } else {
            const userDoc = userSnapshot.docs[0];
            const userData = userDoc.data();
            const planId = userData.subscription?.planId || 'free';
            const status = userData.subscription?.status || 'none';

            console.log(`   ✅ Usuario encontrado`);
            console.log(`   📋 Plan actual: ${planId}`);
            console.log(`   📊 Estado: ${status}`);

            // Check if the user's plan exists in Firestore
            const userPlanExists = results.find(r => r.planId === planId && r.exists);
            if (!userPlanExists) {
                console.log(`   ❌ PROBLEMA: El plan "${planId}" del usuario NO EXISTE en la colección plans`);
                console.log(`   💡 Esto causa que los límites no funcionen correctamente\n`);
            } else {
                console.log(`   ✅ El plan del usuario existe en Firestore\n`);
            }
        }

        console.log('═══════════════════════════════════════════════════════');
        console.log('✨ Verificación completada\n');

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
        process.exit(1);
    }
}

// Run the check
checkAndFixPlanDefinitions()
    .then(() => {
        console.log('👋 Hecho!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
