#!/usr/bin/env node
/**
 * Crea el documento de biblioteca para Adamson (NICNT), cuyo texto se extrajo
 * FUERA del pipeline: LlamaParse falló dos veces seguidas con este archivo
 * (`failed: unknown` en las dos cuentas) y la función murió en su timeout de
 * 540 s antes de que el fallback de Gemini alcanzara a terminar.
 *
 * El `structured.md` ya está en Storage con las 240 páginas ancladas. Esto
 * sólo escribe la metadata para que la app lo vea como extraído y ofrezca el
 * botón "Procesar", que indexa por el camino normal.
 *
 * One-off: prefijo `_` como los otros de esta carpeta. Borrable después.
 *
 *   node scripts/_seedAdamsonResource.mjs           → dry-run
 *   node scripts/_seedAdamsonResource.mjs --commit  → crea el documento
 *   node scripts/_seedAdamsonResource.mjs --index   → dispara el indexado
 *
 * ## Por qué hace falta `--index`
 *
 * `autoIndexOnExtractionReady` es un `onDocumentUpdated`: exige un `before` y
 * un `after`, y sólo actúa cuando `textExtractionStatus` TRANSICIONA a
 * 'ready'. Un documento que NACE en 'ready' —como el que crea este script—
 * nunca produce esa transición, así que el trigger no dispara.
 *
 * `--index` le da la transición de verdad: baja el estado a 'processing' y lo
 * vuelve a subir a 'ready'. El indexado lo hace el camino de producción, con
 * su propio código y su propio registro. No se escribe ningún estado falso.
 */
import admin from 'firebase-admin';

const COMMIT = process.argv.includes('--commit');
const INDEX = process.argv.includes('--index');
const RID = 'a0bd49c6-4e48-465f-9ac5-507e988760b9';
const OWNER = '1xSpGj0kYuZIGUzXHWBQZVVBgeZ2';
const TOKEN = '1f28af57-fff1-466d-9d40-fd359f0f3854';
const BUCKET = 'dosfilosapp.firebasestorage.app';
const BASE = `users/${OWNER}/library/${RID}`;

admin.initializeApp({ projectId: 'dosfilosapp' });
const db = admin.firestore();
const ahora = new Date();

const doc = {
    author: 'Adamson',
    title: 'The Epistle of James - New International Commentary on the New Testament',
    // `commentary` (no `exegetical-commentary`) a propósito: es el tipo de
    // biblioteca que el selector de corpus pre-filtra para el rol ANCLA.
    type: 'commentary',
    scope: 'book',
    coversBibleBooks: ['JAS'],

    mimeType: 'application/pdf',
    sizeBytes: 12370538,
    pageCount: 240,
    characterCount: 594939,

    // Honesta: el texto salió de la capa de texto del PDF con marcadores de
    // página, que es exactamente lo que esta versión describe. El indexador
    // la acepta como estructurada.
    extractionVersion: '5.0-pdfparse-structured',
    extractedWithGemini: false,
    extractedWithLlamaParse: false,
    extractionWarning: null,
    textExtractionStatus: 'ready',
    requestedExtractionMode: 'standard',
    wasTruncated: false,

    textContent: null,
    textContentUrl: null,
    structuredContentUrl: `gs://${BUCKET}/${BASE}/structured.md`,
    storageUrl: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(`${BASE}/adamson-nicnt.pdf`)}?alt=media&token=${TOKEN}`,

    // Sin indexar todavía: así la tarjeta ofrece "Procesar".
    needsReindex: false,
    coreStores: [],
    preferredForPhases: [],
    metadata: {},

    userId: OWNER,
    createdAt: ahora,
    updatedAt: ahora,
    processingStartedAt: ahora,
    extractedAt: ahora,
};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const ref = db.collection('library_resources').doc(RID);
    const previo = await ref.get();

    if (INDEX) {
        if (!previo.exists) {
            console.error(`\nNo existe library_resources/${RID} — creá el documento primero (--commit).\n`);
            process.exit(1);
        }
        const d = previo.data();
        if (d.indexerVersion === '2.0-structured') {
            console.error(`\nYa está indexado (indexerVersion 2.0-structured). El trigger lo saltearía.\n`);
            process.exit(1);
        }
        console.log(`\nDando la transición que el trigger espera:`);
        console.log(`  textExtractionStatus  ${d.textExtractionStatus} → processing → ready`);

        await ref.update({ textExtractionStatus: 'processing', updatedAt: new Date() });
        await dormir(3000);
        await ref.update({ textExtractionStatus: 'ready', updatedAt: new Date() });

        console.log(`\nDisparado. El indexado corre en autoIndexOnExtractionReady (tope 540 s).`);
        console.log(`Esperados ~419 chunks, páginas 2 a 240. Seguilo en la tarjeta.\n`);
        process.exit(0);
    }

    if (previo.exists) {
        console.error(`\nYa existe library_resources/${RID} — abortando para no pisarlo.\n`);
        console.error(`Si lo que querés es indexarlo, usá --index.\n`);
        process.exit(1);
    }

    console.log(`\nlibrary_resources/${RID}`);
    for (const [k, v] of Object.entries(doc)) {
        const s = v instanceof Date ? v.toISOString() : JSON.stringify(v);
        console.log(`  ${k.padEnd(24)} ${String(s).slice(0, 92)}`);
    }

    if (!COMMIT) {
        console.log('\nDRY-RUN — no se escribió nada. Repetí con --commit.\n');
        process.exit(0);
    }

    await ref.set(doc);

    // Releer y afirmar sobre lo guardado, no sobre lo enviado.
    const guardado = (await ref.get()).data();
    const ok = guardado?.textExtractionStatus === 'ready'
        && guardado?.structuredContentUrl === doc.structuredContentUrl
        && guardado?.extractionVersion === '5.0-pdfparse-structured';
    console.log(`\nESCRITO — verificación: ${ok ? 'OK' : 'NO COINCIDE'}\n`);
    process.exit(ok ? 0 : 1);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
