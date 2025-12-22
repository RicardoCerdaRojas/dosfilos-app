/**
 * Script para arreglar el selectedApproachId en el sermón
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function fixApproachId() {
    const sermonId = '65149848-4d9f-40de-89c0-8b57cc00cff3';

    try {
        console.log(`🔍 Arreglando sermón: ${sermonId}\n`);

        const sermonRef = db.collection('sermons').doc(sermonId);
        const sermonDoc = await sermonRef.get();

        if (!sermonDoc.exists) {
            console.error('❌ Sermón no encontrado');
            return;
        }

        const data = sermonDoc.data();
        const homiletics = data.wizardProgress?.homiletics;

        if (!homiletics) {
            console.error('❌ No hay homiletics en el sermón');
            return;
        }

        console.log('📄 selectedApproachId actual:', homiletics.selectedApproachId?.substring(0, 50) + '...');
        console.log('📄 Enfoques disponibles:', homiletics.homileticalApproaches?.length || 0);

        // Get the first approach ID (should be "expositivo-1")
        const correctId = homiletics.homileticalApproaches?.[0]?.id;

        if (!correctId) {
            console.error('❌ No se encontró el approach ID');
            return;
        }

        console.log('✅ ID correcto:', correctId);

        // Update the document
        await sermonRef.update({
            'wizardProgress.homiletics.selectedApproachId': correctId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ selectedApproachId actualizado correctamente');
        console.log(`   De: texto formateado`);
        console.log(`   A: ${correctId}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

fixApproachId()
    .then(() => {
        console.log('\n🎉 Fix completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Error:', error);
        process.exit(1);
    });
