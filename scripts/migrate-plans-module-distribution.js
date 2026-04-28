/**
 * Plan redistribution migration — module-aligned.
 *
 * Hito 4 only adjusted display names + bonus pages; it intentionally left
 * `features[]` and `limits` untouched. The result was that plan cards still
 * advertised sermon-centric features ("Crear sermones ilimitados") even
 * though the product has expanded to Bible, Greek/Hebrew tutors, Faculty,
 * Library, and Projects.
 *
 * This migration aligns each plan with the module distribution agreed for
 * launch:
 *
 *   Free      — Bible + curated library + 50 Faculty queries/mo + 3 sermons/mo
 *               + 2 Greek/2 Hebrew tutor sessions/mo + 1 series + 1 project
 *   Personal  — + personal library (30 docs) + unlimited sermons/series
 *               + 5 Greek/5 Hebrew tutor sessions/mo + 5 projects
 *               + 500 Faculty queries
 *   Pro       — + semantic search + UNLIMITED Greek + UNLIMITED Hebrew
 *               + unlimited projects + 2000 Faculty queries
 *   Equipo    — + multi-user (5 members) + custom templates
 *               + 5000 Faculty queries
 *
 * AI sermon generation (`Generar Sermón`) is intentionally NOT in any tier —
 * it stays super-admin only. Regular users produce sermons via Project →
 * Export → Sermon → Edit.
 *
 * Idempotent: re-running overwrites the same fields with the same values.
 *
 * Run: `node scripts/migrate-plans-module-distribution.js`
 */

const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const PLAN_UPDATES = {
    free: {
        features: [
            'bible:read',
            'library:curated',
            'sermon:create',
            'sermon:export_pdf',
            'series:create',
            'projects:create',
            'tutor:greek',
            'tutor:hebrew',
            'faculty:chat',
        ],
        modules: [
            'module:dashboard',
            'module:bible',
            'module:library',
            'module:sermons',
            'module:plans',
            'module:projects',
            'module:greek-tutor',
            'module:hebrew-tutor',
            'module:faculty',
        ],
        limits: {
            sermonsPerMonth: 3,
            maxPreachingPlansPerMonth: 1,
            greekSessionsPerMonth: 2,
            hebrewSessionsPerMonth: 2,
            libraryStorageMB: 0,
            libraryDocsLimit: 0,
            queriesPerMonth: 50,
            pagesProcessedPerMonth: 0,
        },
    },
    basic: {
        features: [
            'bible:read',
            'library:curated',
            'library:upload',
            'sermon:create_unlimited',
            'sermon:export_pdf',
            'series:create',
            'projects:create',
            'tutor:greek',
            'tutor:hebrew',
            'faculty:chat',
        ],
        modules: [
            'module:dashboard',
            'module:bible',
            'module:library',
            'module:sermons',
            'module:plans',
            'module:projects',
            'module:greek-tutor',
            'module:hebrew-tutor',
            'module:faculty',
        ],
        limits: {
            sermonsPerMonth: -1,
            maxPreachingPlansPerMonth: -1,
            greekSessionsPerMonth: 5,
            hebrewSessionsPerMonth: 5,
            libraryStorageMB: 1024,
            libraryDocsLimit: 30,
            queriesPerMonth: 500,
        },
    },
    pro: {
        features: [
            'bible:read',
            'library:curated',
            'library:upload',
            'library:semantic_search',
            'sermon:create_unlimited',
            'sermon:export_pdf',
            'series:create',
            'projects:create',
            'tutor:greek_unlimited',
            'tutor:hebrew_unlimited',
            'faculty:chat',
        ],
        modules: [
            'module:dashboard',
            'module:bible',
            'module:library',
            'module:sermons',
            'module:plans',
            'module:projects',
            'module:greek-tutor',
            'module:hebrew-tutor',
            'module:faculty',
        ],
        limits: {
            sermonsPerMonth: -1,
            maxPreachingPlansPerMonth: -1,
            greekSessionsPerMonth: -1,
            hebrewSessionsPerMonth: -1,
            libraryStorageMB: 4096,
            libraryDocsLimit: 100,
            queriesPerMonth: 2000,
        },
    },
    team: {
        features: [
            'bible:read',
            'library:curated',
            'library:upload',
            'library:semantic_search',
            'sermon:create_unlimited',
            'sermon:export_pdf',
            'sermon:custom_templates',
            'series:create',
            'projects:create',
            'tutor:greek_unlimited',
            'tutor:hebrew_unlimited',
            'faculty:chat',
            'team:multi_user',
        ],
        modules: [
            'module:dashboard',
            'module:bible',
            'module:library',
            'module:sermons',
            'module:plans',
            'module:projects',
            'module:greek-tutor',
            'module:hebrew-tutor',
            'module:faculty',
        ],
        limits: {
            sermonsPerMonth: -1,
            maxPreachingPlansPerMonth: -1,
            greekSessionsPerMonth: -1,
            hebrewSessionsPerMonth: -1,
            libraryStorageMB: 16384,
            libraryDocsLimit: 500,
            queriesPerMonth: 5000,
            maxMembers: 5,
        },
    },
};

async function migrate() {
    console.log('🚀 Plan redistribution — module-aligned features + limits\n');

    let updated = 0;
    let skipped = 0;

    for (const [planId, updates] of Object.entries(PLAN_UPDATES)) {
        const ref = db.collection('plans').doc(planId);
        const snap = await ref.get();
        if (!snap.exists) {
            console.log(`   ⚠️  plan ${planId} no existe, saltando`);
            skipped++;
            continue;
        }

        const current = snap.data() || {};
        // Merge limits (preserves bonusInitial-related and legacy fields).
        const mergedLimits = { ...current.limits, ...updates.limits };

        await ref.update({
            features: updates.features,
            modules: updates.modules,
            limits: mergedLimits,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(
            `   ✅ ${planId} → ${updates.features.length} features, ${updates.modules.length} modules`,
        );
        updated++;
    }

    console.log(`\n📊 Plans collection: updated ${updated}, skipped ${skipped}`);
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
