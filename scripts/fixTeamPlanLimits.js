/**
 * Script para agregar límites al plan Team
 * 
 * El problema: El plan "team" existe en Firestore pero no tiene el campo "limits",
 * por lo que UsageLimitsService no puede verificar los límites correctamente.
 * 
 * Uso:
 *   node scripts/fixTeamPlanLimits.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();

async function fixTeamPlanLimits() {
    try {
        console.log('🔧 Actualizando límites del plan Team...\n');

        // Actualizar plan Team con límites correctos
        await db.collection('plans').doc('team').update({
            limits: {
                sermonsPerMonth: 12,
                maxPreachingPlansPerMonth: 6, // 6 planes por mes (CRÍTICO: este campo faltaba)
                greekSessionsPerMonth: 15,
                libraryStorageMB: 500
            }
        });

        console.log('✅ Plan Team actualizado correctamente\n');
        console.log('📊 Límites configurados:');
        console.log('   - sermonsPerMonth: 12');
        console.log('   - maxPreachingPlansPerMonth: 6');
        console.log('   - greekSessionsPerMonth: 15');
        console.log('   - libraryStorageMB: 500\n');

        console.log('🎉 ¡Listo! Ahora puedes crear planes de predicación sin problemas.\n');

    } catch (error) {
        console.error('❌ Error actualizando el plan:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

fixTeamPlanLimits();
