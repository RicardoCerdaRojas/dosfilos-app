/**
 * Hito 4 — Migración de planes a nueva estructura.
 *
 * Mantiene los IDs legacy (`basic`, `pro`, `team`) para evitar tocar miles de
 * suscripciones existentes. Lo que cambia:
 *
 *   1. Display names: "Basic" → "Personal", "Pro" → "Pro", "Team" → "Equipo".
 *   2. Limits ajustados a la tabla del PRICING_PROCESSING_ROADMAP:
 *        Free:     50 queries / 0 docs / 0 bonus
 *        Personal: 500 queries / 30 docs / 2,000 standard pages bonus
 *        Pro:      2,000 queries / 100 docs / 5,000 standard + 200 premium bonus
 *        Equipo:   5,000 queries / 500 docs / 10,000 standard + 500 premium bonus
 *   3. Nuevo campo `bonusInitial: { standardPages, premiumPages }` por plan.
 *
 * El campo `bonusInitial` lo lee la Cloud Function `completeRegistration` y el
 * webhook `stripeWebhook` para acreditar páginas al `processingBalance` del
 * usuario una sola vez por suscripción.
 *
 * Idempotente: re-ejecutar el script sobreescribe los mismos campos sin daño.
 *
 * Ejecutar: `node scripts/migrate-plans-to-new-structure.js`
 */

const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * Localized name + description per plan. Patches `plan_translations/{id}` so
 * the existing `getLocalizedPlan` flow returns the new names without us
 * having to re-seed the full features/modules/limits trees.
 */
const PLAN_TRANSLATIONS = {
    free: {
        es: { name: 'Free', description: 'Acceso a la biblioteca curada con 50 consultas/mes.' },
        en: { name: 'Free', description: 'Curated library access with 50 queries/month.' },
    },
    basic: {
        es: { name: 'Personal', description: 'Para tu estudio personal con biblioteca propia.' },
        en: { name: 'Personal', description: 'Your own personal study library.' },
    },
    pro: {
        es: { name: 'Pro', description: 'Para pastores que predican regularmente. Tutores Greek/Hebrew incluidos.' },
        en: { name: 'Pro', description: 'For pastors who preach regularly. Greek/Hebrew tutors included.' },
    },
    team: {
        es: { name: 'Equipo', description: 'Para equipos pastorales e iglesias. Multi-usuario.' },
        en: { name: 'Team', description: 'For pastoral teams and churches. Multi-user.' },
    },
};

const PLAN_UPDATES = {
    free: {
        name: 'Free',
        description: 'Acceso a la biblioteca curada con 50 consultas/mes.',
        limits: {
            sermonsPerMonth: 0,
            greekSessionsPerMonth: 0,
            libraryStorageMB: 0,
            libraryDocsLimit: 0,
            pagesProcessedPerMonth: 0,
            queriesPerMonth: 50,
        },
        bonusInitial: {
            standardPages: 0,
            premiumPages: 0,
        },
        sortOrder: 0,
        isPublic: true,
        isLegacy: false,
    },
    basic: {
        name: 'Personal',
        description: 'Para tu estudio personal con biblioteca propia.',
        limits: {
            sermonsPerMonth: 0,
            greekSessionsPerMonth: 0,
            libraryStorageMB: 1024,
            libraryDocsLimit: 30,
            queriesPerMonth: 500,
        },
        bonusInitial: {
            standardPages: 2000,
            premiumPages: 0,
        },
        sortOrder: 1,
        isPublic: true,
        isLegacy: false,
    },
    pro: {
        name: 'Pro',
        description: 'Para pastores que predican regularmente. Incluye tutores Greek/Hebrew.',
        limits: {
            sermonsPerMonth: -1,
            greekSessionsPerMonth: -1,
            libraryStorageMB: 4096,
            libraryDocsLimit: 100,
            queriesPerMonth: 2000,
        },
        bonusInitial: {
            standardPages: 5000,
            premiumPages: 200,
        },
        highlightText: 'Más Popular',
        sortOrder: 2,
        isPublic: true,
        isLegacy: false,
    },
    team: {
        name: 'Equipo',
        description: 'Para equipos pastorales e iglesias. Multi-usuario.',
        limits: {
            sermonsPerMonth: -1,
            greekSessionsPerMonth: -1,
            libraryStorageMB: 16384,
            libraryDocsLimit: 500,
            queriesPerMonth: 5000,
            maxMembers: 5,
        },
        bonusInitial: {
            standardPages: 10000,
            premiumPages: 500,
        },
        sortOrder: 3,
        isPublic: true,
        isLegacy: false,
    },
};

async function migrate() {
    console.log('🚀 Hito 4 — Migrando plans collection a nueva estructura\n');

    let updated = 0;
    let skipped = 0;

    for (const [planId, updates] of Object.entries(PLAN_UPDATES)) {
        const ref = db.collection('plans').doc(planId);
        const snap = await ref.get();
        if (!snap.exists) {
            console.log(`   ⚠️  Plan "${planId}" no existe en Firestore, saltando`);
            skipped++;
            continue;
        }

        const current = snap.data() || {};
        // Merge limits so we don't drop fields the script doesn't know about
        // (e.g. legacy fields like aiRequestsPerDay still in use elsewhere).
        const mergedLimits = { ...current.limits, ...updates.limits };

        await ref.update({
            ...updates,
            limits: mergedLimits,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(
            `   ✅ ${planId} → "${updates.name}" · ${updates.bonusInitial.standardPages}std + ${updates.bonusInitial.premiumPages}prem bonus`,
        );
        updated++;
    }

    console.log(`\n📊 Plans collection: updated ${updated}, skipped ${skipped}`);

    // ── Patch plan_translations.name + .description for each locale ──────
    console.log('\n🌐 Patching plan_translations (name + description)…');
    let translationsPatched = 0;
    for (const [planId, locales] of Object.entries(PLAN_TRANSLATIONS)) {
        const transRef = db.collection('plan_translations').doc(planId);
        const transSnap = await transRef.get();
        if (!transSnap.exists) {
            console.log(`   ⚠️  plan_translations/${planId} no existe; saltando`);
            continue;
        }
        const existing = transSnap.data()?.translations ?? {};
        const merged = { ...existing };
        for (const [locale, fields] of Object.entries(locales)) {
            merged[locale] = { ...(existing[locale] ?? {}), ...fields };
        }
        await transRef.update({
            translations: merged,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`   ✅ ${planId} translations patched (es + en)`);
        translationsPatched++;
    }
    console.log(`\n📊 Translations: patched ${translationsPatched}`);

    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
