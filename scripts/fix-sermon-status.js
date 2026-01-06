/**
 * Script de migración para actualizar el status de un sermón
 * De: 'published' -> 'draft'
 * 
 * Uso: node scripts/fix-sermon-status.js
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function fixSermonStatus() {
    const sermonId = '65149848-4d9f-40de-89c0-8b57cc00cff3';

    try {
        console.log(`🔍 Buscando sermón: ${sermonId}`);

        const sermonRef = db.collection('sermons').doc(sermonId);
        const sermonDoc = await sermonRef.get();

        if (!sermonDoc.exists) {
            console.error('❌ Sermón no encontrado');
            return;
        }

        const currentData = sermonDoc.data();
        console.log('📄 Status actual:', currentData.status);

        // Actualizar status a 'draft'
        await sermonRef.update({
            status: 'draft',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Sermón actualizado correctamente');
        console.log('   Status: published -> draft');

        // Verificar el cambio
        const updatedDoc = await sermonRef.get();
        const updatedData = updatedDoc.data();
        console.log('✓ Nuevo status:', updatedData.status);

    } catch (error) {
        console.error('❌ Error al actualizar sermón:', error);
        throw error;
    }
}

fixSermonStatus()
    .then(() => {
        console.log('\n🎉 Migración completada');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Error en migración:', error);
        process.exit(1);
    });
