/**
 * Borra los chunks cuyo recurso ya no existe.
 *
 * Un chunk huérfano NO es basura inerte: el recuperador filtra por
 * usuario y por store, no comprueba que el libro exista, así que un
 * recurso borrado sigue apareciendo en las búsquedas y en las citas.
 * Por eso esto se corre después de borrar recursos, no «alguna vez».
 *
 * Uso:
 *   npx ts-node --skipProject scripts/cleanup-orphan-chunks.ts --dry-run
 *   npx ts-node --skipProject scripts/cleanup-orphan-chunks.ts
 *
 * `--skipProject` es obligatorio: el `tsconfig.json` de la raíz extiende
 * `expo/tsconfig.base`, y `expo` no está en el `node_modules` de la raíz
 * porque el paquete mobile va con nohoist. Sin la bandera, ts-node
 * muere con «File 'expo/tsconfig.base' not found» antes de ejecutar una
 * sola línea.
 *
 * Credenciales, en este orden:
 *   1. `firebase-service-account.json` en la raíz, si existe.
 *   2. Credenciales por defecto de la aplicación (ADC), o sea
 *      `gcloud auth application-default login`.
 * La segunda evita tener que descargar y guardar una llave en disco.
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DRY_RUN = process.argv.includes('--dry-run');

function credencial() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require('../firebase-service-account.json');
        console.log('🔑 Usando firebase-service-account.json');
        return cert(serviceAccount);
    } catch {
        console.log('🔑 Sin llave en disco; usando credenciales por defecto (ADC)');
        return applicationDefault();
    }
}

initializeApp({
    credential: credencial(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? 'dosfilosapp',
});

const db = getFirestore();

const CHUNKS_COLLECTION = 'document_chunks';
const RESOURCES_COLLECTION = 'library_resources';

async function findOrphanedChunks(): Promise<string[]> {
    console.log('🔍 Finding orphaned chunks...\n');

    // Sólo el campo `resourceId`. Sin la proyección, esto arrastra los
    // 55.000 chunks CON su vector de embeddings —cientos de megabytes—
    // para juntar setenta y pico de ids. La consulta tardaba minutos y
    // parecía colgada.
    const chunksSnapshot = await db.collection(CHUNKS_COLLECTION).select('resourceId').get();
    const chunkResourceIds = new Set<string>();

    chunksSnapshot.docs.forEach(doc => {
        const resourceId = doc.data().resourceId;
        if (resourceId) {
            chunkResourceIds.add(resourceId);
        }
    });

    console.log(`📊 Found ${chunksSnapshot.size} total chunks`);
    console.log(`📊 Found ${chunkResourceIds.size} unique resource IDs in chunks\n`);

    // Check which resourceIds don't exist in library_resources
    const orphanedResourceIds: string[] = [];

    for (const resourceId of chunkResourceIds) {
        const resourceDoc = await db.collection(RESOURCES_COLLECTION).doc(resourceId).get();
        if (!resourceDoc.exists) {
            orphanedResourceIds.push(resourceId);
            // Count chunks for this orphaned resource
            const orphanChunks = chunksSnapshot.docs.filter(d => d.data().resourceId === resourceId);
            console.log(`⚠️  Orphaned: ${resourceId} (${orphanChunks.length} chunks)`);
        }
    }

    return orphanedResourceIds;
}

async function deleteOrphanedChunks(resourceIds: string[]): Promise<void> {
    if (resourceIds.length === 0) {
        console.log('\n✅ No orphaned chunks to delete!');
        return;
    }

    if (DRY_RUN) {
        console.log(`\n🔎 SIMULACIÓN: no se borra nada. ${resourceIds.length} recurso(s) huérfano(s) arriba.`);
        return;
    }

    console.log(`\n🗑️  Deleting chunks for ${resourceIds.length} orphaned resources...`);

    for (const resourceId of resourceIds) {
        const chunksQuery = db.collection(CHUNKS_COLLECTION)
            .where('resourceId', '==', resourceId);

        const snapshot = await chunksQuery.get();
        console.log(`\n🗑️  Deleting ${snapshot.size} chunks for ${resourceId}...`);

        // Delete in small batches to avoid transaction size limit
        const batchSize = 50;
        let deleted = 0;

        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = db.batch();
            const batchDocs = snapshot.docs.slice(i, i + batchSize);

            for (const doc of batchDocs) {
                batch.delete(doc.ref);
            }

            await batch.commit();
            deleted += batchDocs.length;
            console.log(`   Deleted ${deleted}/${snapshot.size}`);
        }
    }

    console.log('\n✅ Cleanup complete!');
}

async function main() {
    console.log('🧹 Document Chunks Cleanup Script\n');
    console.log('='.repeat(50) + '\n');

    try {
        const orphanedIds = await findOrphanedChunks();

        if (orphanedIds.length > 0) {
            console.log(`\n📋 Summary: ${orphanedIds.length} orphaned resource(s) found`);
            await deleteOrphanedChunks(orphanedIds);
        } else {
            console.log('\n✅ Database is clean - no orphaned chunks found!');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
