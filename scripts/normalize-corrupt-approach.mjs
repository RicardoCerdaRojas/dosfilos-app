/**
 * Normaliza valores CORRUPTOS del campo `wizardProgress.homiletics.homileticalApproach`
 * en la colección `sermons`. Corrupto = un valor que NO es ninguna forma actual del
 * catálogo NI un token legado conocido (thematic/topical/narrative/expository/expositivo).
 * Ejemplos vistos en prod: un tono ("pastoral con tono de ánimo") y un bloque de prompt
 * entero filtrado como valor del campo — corrupción de escritura, no elección de pastor.
 *
 * Criterio (decisión del fundador 2026-07-07): trazabilidad cuando hay elección real
 * detrás (topical→temático, lo maneja el normalizer en lectura); LIMPIEZA cuando es dato
 * corrupto. No se preserva corrupción como si fuera decisión.
 *
 * Acción: pone el campo en unset (FieldValue.delete) + deja una MARCA DE ORIGEN CORRUPTO
 * EN EL PROPIO DOCUMENTO (provenance con la data, NO en admin_audit_log — ese log es
 * compliance de acciones de admin, no se contamina con correcciones de dato de dominio).
 *
 * SEGURIDAD: dry-run por defecto (solo lee + imprime). Muta SOLO con --apply.
 * Correr DESPUÉS de mergear el cierre de escritura (isApproachType guard), para que los
 * corruptos no se regeneren entre el barrido y el cierre.
 *
 * Uso:
 *   node scripts/normalize-corrupt-approach.mjs           # dry-run (no muta)
 *   node scripts/normalize-corrupt-approach.mjs --apply   # aplica (muta 2 docs de prod)
 */
import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
const projectId = 'dosfilosapp';

// Tokens conocidos (formas actuales + legado que el normalizer maneja). Todo lo demás
// que exista en el campo = corrupto.
const KNOWN = new Set([
    'temático', 'pastoral', 'teológico', 'apologético', 'evangelístico', 'narrativo', // formas actuales
    'thematic', 'topical', 'narrative', 'expository', 'expositivo', // legado reconocido
]);

admin.initializeApp({ projectId, serviceAccountId: `${projectId}@appspot.gserviceaccount.com` });
const db = admin.firestore();

function isCorrupt(v) {
    return typeof v === 'string' && v.trim().length > 0 && !KNOWN.has(v);
}

const snap = await db.collection('sermons').get();
const corrupt = [];
snap.docs.forEach((doc) => {
    const v = doc.data()?.wizardProgress?.homiletics?.homileticalApproach;
    if (isCorrupt(v)) corrupt.push({ id: doc.id, value: v });
});

console.log(`\nMODO: ${APPLY ? '⚠️  APPLY (muta prod)' : 'dry-run (solo lectura)'}`);
console.log(`sermones escaneados: ${snap.size}`);
console.log(`docs con approach CORRUPTO: ${corrupt.length}`);
for (const c of corrupt) {
    const preview = c.value.length > 120 ? c.value.slice(0, 120) + `… [${c.value.length} chars]` : c.value;
    console.log(`  - ${c.id}: ${JSON.stringify(preview)}`);
}

if (!corrupt.length) {
    console.log('\nNada que limpiar.');
    process.exit(0);
}

if (!APPLY) {
    console.log('\nDry-run: no se mutó nada. Corré con --apply (tras el OK del fundador) para aplicar.');
    process.exit(0);
}

// APPLY: unset del campo + marca de origen corrupto EN EL DOC.
for (const c of corrupt) {
    await db.collection('sermons').doc(c.id).update({
        'wizardProgress.homiletics.homileticalApproach': FieldValue.delete(),
        'wizardProgress.homiletics.homileticalApproachCleanup': {
            previousValue: c.value.slice(0, 500), // truncado; suficiente para trazar el origen
            reason: 'corrupt_write', // no era elección de pastor: corrupción de escritura del campo
            normalizedAt: FieldValue.serverTimestamp(),
        },
    });
    console.log(`  ✓ normalizado: ${c.id} (campo → unset, marca de origen corrupto en el doc)`);
}
console.log(`\nListo. ${corrupt.length} doc(s) normalizados. El normalizer en lectura ya los trata como unset; al regenerar, el halt+marca fail-closed pide forma real.`);
process.exit(0);
