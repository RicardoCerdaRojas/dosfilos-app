const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();

async function updatePlans() {
    try {
        console.log('🚀 Iniciando migración de planes...\n');

        // Update Free Plan
        console.log('📝 Actualizando plan Free...');
        await db.collection('plans').doc('free').update({
            modules: [
                'module:dashboard',
                'module:sermones',
                'module:planes',
                'module:generar',
                'module:biblioteca',
                'module:configuracion',
                'module:greek_tutor'
            ],
            limits: {
                sermonsPerMonth: 1,
                maxPreachingPlans: 1, // Total absoluto
                greekSessionsPerMonth: 1,
                libraryStorageMB: 0 // Sin acceso
            }
        });
        console.log('✅ Plan Free actualizado\n');

        // Update Pro Plan
        console.log('📝 Actualizando plan Pro...');
        await db.collection('plans').doc('pro').update({
            modules: [
                'module:dashboard',
                'module:sermones',
                'module:planes',
                'module:generar',
                'module:biblioteca',
                'module:configuracion',
                'module:greek_tutor'
            ],
            limits: {
                sermonsPerMonth: 4,
                maxPreachingPlansPerMonth: 1, // Mensual
                greekSessionsPerMonth: 3,
                libraryStorageMB: 200
            }
        });
        console.log('✅ Plan Pro actualizado\n');

        // Update Team Plan
        console.log('📝 Actualizando plan Team...');
        await db.collection('plans').doc('team').update({
            modules: [
                'module:dashboard',
                'module:sermones',
                'module:planes',
                'module:generar',
                'module:biblioteca',
                'module:configuracion',
                'module:greek_tutor'
            ],
            limits: {
                sermonsPerMonth: 12,
                maxPreachingPlansPerMonth: 4, // Mensual
                greekSessionsPerMonth: 15,
                libraryStorageMB: 600
            }
        });
        console.log('✅ Plan Team actualizado\n');

        console.log('🎉 Migración completada exitosamente!');
        console.log('\n📊 Resumen de cambios:');
        console.log('- Agregado módulo "module:greek_tutor" a todos los planes');
        console.log('- Free: 1 sermón/mes, 1 plan total, 1 estudio/mes, sin biblioteca');
        console.log('- Pro: 4 sermones/mes, 1 plan/mes, 3 estudios/mes, 200MB biblioteca');
        console.log('- Team: 12 sermones/mes, 4 planes/mes, 15 estudios/mes, 600MB biblioteca');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

updatePlans();
