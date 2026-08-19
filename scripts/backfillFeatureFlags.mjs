/**
 * Backfill del set de flags por defecto sobre las cuentas EXISTENTES.
 *
 * Hasta 2026-08-19 no existía ningún default: cada flag se encendía a mano desde
 * el admin. Las cuentas que nadie tocó — incluidas las de pago — estrenaban la app
 * SIN el flujo de fidelidad pastoral. Este script cierra esa brecha hacia atrás;
 * los defaults de las cuentas nuevas los ponen `AuthService.registerFree` y
 * `completeRegistration`.
 *
 * ADITIVO POR DISEÑO: solo ENCIENDE lo que falta. Nunca apaga ni pisa lo que
 * alguien decidió a mano — si una cuenta tiene un flag en `false` a propósito
 * (p.ej. un enforce que se probó y se revirtió), se RESPETA y se reporta.
 *
 * La lista NO se hardcodea: se lee del fuente del dominio, que es el SSOT.
 *
 * Uso:
 *   node scripts/backfillFeatureFlags.mjs           # dry-run: solo reporta
 *   node scripts/backfillFeatureFlags.mjs --apply   # escribe
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const APPLY = process.argv.includes('--apply');
const HERE = dirname(fileURLToPath(import.meta.url));
const DOMAIN_USER_TS = join(HERE, '../packages/domain/src/entities/User.ts');

/** SSOT: el set de defaults sale del dominio, no de una copia en este archivo. */
function readDefaultFlags() {
    const src = readFileSync(DOMAIN_USER_TS, 'utf8');
    const block = /export const DEFAULT_FEATURE_FLAGS: readonly FeatureFlagName\[\] = \[([\s\S]*?)\];/.exec(src);
    if (!block) throw new Error(`No se pudo leer DEFAULT_FEATURE_FLAGS en ${DOMAIN_USER_TS}`);
    return [...block[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

const DEFAULTS = readDefaultFlags();
admin.initializeApp({ projectId: 'dosfilosapp' });
const db = admin.firestore();

const snap = await db.collection('users').get();
const plan = [];

snap.forEach((doc) => {
    const data = doc.data();
    const current = data?.featureFlags ?? {};
    // Solo los que FALTAN (ausentes). Un `false` explícito es una decisión: se respeta.
    const faltantes = DEFAULTS.filter((f) => current[f] === undefined);
    const respetados = DEFAULTS.filter((f) => current[f] === false);
    if (faltantes.length || respetados.length) {
        plan.push({
            uid: doc.id,
            email: data?.email ?? '(sin email)',
            plan: data?.subscription?.planId ?? '(sin plan)',
            teniaFlags: Object.keys(current).length > 0,
            enciende: faltantes,
            respetaEnFalse: respetados,
        });
    }
});

const aEscribir = plan.filter((p) => p.enciende.length > 0);

console.log(JSON.stringify({
    modo: APPLY ? 'APPLY (escribe)' : 'DRY-RUN (no escribe)',
    setPorDefecto: DEFAULTS,
    usuariosTotales: snap.size,
    usuariosAActualizar: aEscribir.length,
    detalle: plan,
}, null, 2));

if (!APPLY) {
    console.log('\nDry-run. Nada se escribió. Correr con --apply para aplicar.');
    process.exit(0);
}

let escritos = 0;
for (const p of aEscribir) {
    const patch = Object.fromEntries(p.enciende.map((f) => [`featureFlags.${f}`, true]));
    // Merge por RUTA de campo: no toca el resto del mapa de flags.
    await db.collection('users').doc(p.uid).update(patch);
    escritos++;
    console.log(`✓ ${p.email} — encendidos: ${p.enciende.join(', ')}`);
}
console.log(`\nListo. ${escritos} cuentas actualizadas.`);
process.exit(0);
