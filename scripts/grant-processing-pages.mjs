#!/usr/bin/env node
/**
 * Acredita páginas de procesamiento a una cuenta, escribiendo el bucket que
 * el sistema realmente lee.
 *
 * ## Por qué existe este script en vez de usar el panel de admin
 *
 * "Otorgar créditos" del admin (`grantUserCredits`) incrementa
 * `processingBalance.premiumPagesAvailable`, que es un campo DERIVADO. La
 * función que cobra la extracción (`readBalance`) nunca lo mira cuando los
 * buckets existen:
 *
 *     packPremium = balance.packPremiumPages ?? balance.premiumPagesAvailable ?? 0;
 *
 * Un documento con `packPremiumPages: 0` tiene el campo PRESENTE, así que el
 * `??` no cae al fallback y el crédito queda invisible. Peor:
 * `consumePagesAdmin` reescribe `*PagesAvailable = newPlan + newPack`, así que
 * la primera extracción posterior PISA lo otorgado. El admin ve el toast de
 * éxito y el saldo desaparece sin que nadie lo relacione con el grant.
 *
 * Este script escribe el bucket `pack*`, que es el correcto por dos razones:
 * es el que `readBalance` suma, y es el que PERSISTE — un crédito otorgado a
 * mano no debería evaporarse en la próxima renovación del plan.
 *
 * Cuando se arregle `grantUserCredits` este script queda como herramienta de
 * desarrollo, no como workaround.
 *
 * ## Uso
 *
 *     node scripts/grant-processing-pages.mjs <uid|email> --premium 3000
 *     node scripts/grant-processing-pages.mjs rdocerda@gmail.com --premium 3000 --commit
 *     node scripts/grant-processing-pages.mjs <uid> --standard 500 --premium 200 --commit
 *
 * Sin `--commit` es dry-run: imprime lo que haría y no escribe nada.
 *
 * Requiere credenciales de aplicación (`gcloud auth application-default login`).
 */
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const TARGET = args[0];
const COMMIT = args.includes('--commit');

function numArg(flag) {
    const i = args.indexOf(flag);
    if (i === -1) return 0;
    const raw = Number(args[i + 1]);
    if (!Number.isFinite(raw) || raw < 0) {
        console.error(`${flag} necesita un número >= 0 (recibido: ${args[i + 1]})`);
        process.exit(1);
    }
    return Math.floor(raw);
}

const ADD_PREMIUM = numArg('--premium');
const ADD_STANDARD = numArg('--standard');

if (!TARGET || TARGET.startsWith('--')) {
    console.error('uso: node scripts/grant-processing-pages.mjs <uid|email> [--premium N] [--standard N] [--commit]');
    process.exit(1);
}
if (ADD_PREMIUM === 0 && ADD_STANDARD === 0) {
    console.error('nada que acreditar: pasá --premium N y/o --standard N');
    process.exit(1);
}

admin.initializeApp({ projectId: 'dosfilosapp' });
const db = admin.firestore();

/** Mismo criterio de lectura que `readBalance` en functions. */
function leerBuckets(balance = {}) {
    const planStandard = balance.planStandardPages ?? 0;
    const planPremium = balance.planPremiumPages ?? 0;
    // El fallback al derivado sólo aplica a docs legacy que no tienen el bucket.
    const packStandard = balance.packStandardPages ?? balance.standardPagesAvailable ?? 0;
    const packPremium = balance.packPremiumPages ?? balance.premiumPagesAvailable ?? 0;
    return { planStandard, planPremium, packStandard, packPremium };
}

async function resolverUid(target) {
    if (!target.includes('@')) return target;
    const snap = await db.collection('users').where('email', '==', target).limit(2).get();
    if (snap.empty) {
        console.error(`No hay usuario con email ${target}`);
        process.exit(1);
    }
    if (snap.size > 1) {
        console.error(`Hay más de un usuario con email ${target} — pasá el uid directo`);
        process.exit(1);
    }
    return snap.docs[0].id;
}

(async () => {
    const uid = await resolverUid(TARGET);
    const ref = db.collection('users').doc(uid);
    const snap = await ref.get();
    if (!snap.exists) {
        console.error(`El documento users/${uid} no existe`);
        process.exit(1);
    }

    const data = snap.data();
    const antes = leerBuckets(data.processingBalance ?? {});

    const packStandard = antes.packStandard + ADD_STANDARD;
    const packPremium = antes.packPremium + ADD_PREMIUM;
    // El derivado se RECALCULA, nunca se incrementa suelto: ésa es la regla que
    // el bug del admin rompió.
    const standardPagesAvailable = antes.planStandard + packStandard;
    const premiumPagesAvailable = antes.planPremium + packPremium;

    const fila = (etiqueta, plan, pack, total) =>
        `  ${etiqueta.padEnd(9)} plan ${String(plan).padStart(6)} + pack ${String(pack).padStart(6)} = ${String(total).padStart(6)}`;

    console.log(`\nusers/${uid}  (${data.email ?? 'sin email'})`);
    console.log('\nANTES');
    console.log(fila('standard', antes.planStandard, antes.packStandard, antes.planStandard + antes.packStandard));
    console.log(fila('premium', antes.planPremium, antes.packPremium, antes.planPremium + antes.packPremium));
    console.log(`\nACREDITA  standard +${ADD_STANDARD}  ·  premium +${ADD_PREMIUM}   (al bucket pack, persistente)`);
    console.log('\nDESPUÉS');
    console.log(fila('standard', antes.planStandard, packStandard, standardPagesAvailable));
    console.log(fila('premium', antes.planPremium, packPremium, premiumPagesAvailable));

    if (!COMMIT) {
        console.log('\nDRY-RUN — no se escribió nada. Repetí con --commit para aplicar.\n');
        process.exit(0);
    }

    await ref.update({
        'processingBalance.packStandardPages': packStandard,
        'processingBalance.packPremiumPages': packPremium,
        'processingBalance.standardPagesAvailable': standardPagesAvailable,
        'processingBalance.premiumPagesAvailable': premiumPagesAvailable,
        'processingBalance.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    });

    // Releer para afirmar sobre lo que quedó guardado, no sobre lo que se envió.
    const verif = leerBuckets((await ref.get()).data().processingBalance ?? {});
    const okStd = verif.packStandard === packStandard;
    const okPrem = verif.packPremium === packPremium;
    console.log(`\nESCRITO   standard ${okStd ? 'OK' : 'NO COINCIDE'} · premium ${okPrem ? 'OK' : 'NO COINCIDE'}\n`);
    process.exit(okStd && okPrem ? 0 : 1);
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
