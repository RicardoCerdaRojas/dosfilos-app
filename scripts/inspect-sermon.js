/**
 * Script para inspeccionar el sermón en Firestore
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function inspectSermon() {
    const sermonId = '65149848-4d9f-40de-89c0-8b57cc00cff3';

    try {
        console.log(`🔍 Inspeccionando sermón: ${sermonId}\n`);

        const sermonRef = db.collection('sermons').doc(sermonId);
        const sermonDoc = await sermonRef.get();

        if (!sermonDoc.exists) {
            console.error('❌ Sermón no encontrado');
            return;
        }

        const data = sermonDoc.data();

        console.log('📄 wizardProgress.homiletics:');
        console.log(JSON.stringify(data.wizardProgress?.homiletics, null, 2));

        console.log('\n📋 Campos clave:');
        console.log('- selectedApproachId:', data.wizardProgress?.homiletics?.selectedApproachId);
        console.log('- homileticalApproach (legacy):', data.wizardProgress?.homiletics?.homileticalApproach);
        console.log('- homileticalApproaches array:', data.wizardProgress?.homiletics?.homileticalApproaches?.length || 0, 'items');

        if (data.wizardProgress?.homiletics?.homileticalApproaches) {
            console.log('\n🎯 Enfoques disponibles:');
            data.wizardProgress.homiletics.homileticalApproaches.forEach((approach, idx) => {
                console.log(`\n  [${idx}] ID: ${approach.id}`);
                console.log(`      Tipo: ${approach.type}`);
                console.log(`      Dirección: ${approach.direction}`);
                console.log(`      Seleccionado: ${approach.id === data.wizardProgress?.homiletics?.selectedApproachId ? 'SÍ ✅' : 'No'}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

inspectSermon()
    .then(() => {
        console.log('\n✅ Inspección completada');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Error:', error);
        process.exit(1);
    });
