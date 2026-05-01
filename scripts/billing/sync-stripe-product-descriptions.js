#!/usr/bin/env node
/**
 * Syncs each Stripe Product's `description` to include the monthly
 * page-quota copy that lives in Firestore `plans/{id}`. Run after
 * `migrate-plan-quotas.js` so the Stripe Checkout page surfaces the
 * same "Incluye X págs estándar/mes + Y premium/mes" the in-app
 * pricing card now shows.
 *
 * Without this, a user landing on Stripe Checkout via direct link
 * sees only the marketing description ("Para pastores que predican
 * regularmente.") and has no idea what page allotment they're
 * paying for.
 *
 * Auth: requires both
 *   - Application Default Credentials for Firestore (gcloud auth
 *     application-default login)
 *   - STRIPE_SECRET_KEY env var (read from
 *     `packages/functions/.env` or pass inline:
 *     `STRIPE_SECRET_KEY=sk_live_... node scripts/...`)
 *
 * Idempotency: the script appends a sentinel marker
 * `[v1.5-quota-sync]` to the description. On re-runs it strips the
 * old block by sentinel and re-appends — so the description doesn't
 * accumulate duplicates if the quota changes.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/billing/sync-stripe-product-descriptions.js
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/billing/sync-stripe-product-descriptions.js --apply
 *
 * Defaults to dry-run; pass --apply to actually write to Stripe.
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const admin = require('firebase-admin');

// Resolution order for STRIPE_SECRET_KEY:
//   1. env var (caller passed `STRIPE_SECRET_KEY=sk_... node ...`)
//   2. packages/functions/.env (in case it ever lands there)
//   3. Google Secret Manager via gcloud (production reality — Stripe
//      key lives there, declared as `secrets: ['STRIPE_SECRET_KEY']`
//      in every Cloud Function that needs it).
function resolveStripeKey() {
    if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;

    const envPath = path.resolve(__dirname, '../../packages/functions/.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^STRIPE_SECRET_KEY=(.+)$/m);
        if (match) return match[1].trim().replace(/^["']|["']$/g, '');
    }

    try {
        console.log('🔐 Fetching STRIPE_SECRET_KEY from Secret Manager via gcloud...');
        const key = execSync(
            'gcloud secrets versions access latest --secret=STRIPE_SECRET_KEY --project=dosfilosapp',
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
        ).trim();
        if (key) return key;
    } catch (err) {
        console.error('   ↳ gcloud fetch failed:', err.stderr?.toString() || err.message);
    }
    return null;
}

const stripeKey = resolveStripeKey();
if (!stripeKey) {
    console.error('❌ STRIPE_SECRET_KEY not available. Tried env var, .env file, and gcloud Secret Manager.');
    console.error('   Pass it inline:');
    console.error('     STRIPE_SECRET_KEY=sk_live_... node scripts/billing/sync-stripe-product-descriptions.js');
    console.error('   Or grant yourself Secret Manager Accessor on the dosfilosapp project.');
    process.exit(1);
}
process.env.STRIPE_SECRET_KEY = stripeKey;

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-10-28.acacia' });

admin.initializeApp({ projectId: 'dosfilosapp' });
const db = admin.firestore();

const dryRun = !process.argv.includes('--apply');
const SENTINEL_OPEN = '\n\n[v1.5-quota-sync] ';
const SENTINEL_CLOSE = ' [/v1.5-quota-sync]';

/**
 * Builds the quota line to append to the product description.
 * Plain text (no markdown) because Stripe's product description
 * renders as-is in Checkout.
 */
function buildQuotaLine(standard, premium) {
    if (standard === 0 && premium === 0) return null;
    const parts = [];
    if (standard > 0) parts.push(`${standard.toLocaleString()} págs. estándar/mes`);
    if (premium > 0) parts.push(`${premium.toLocaleString()} págs. premium/mes`);
    return `Incluye ${parts.join(' + ')}. ¿Necesitas más? Compra packs prepago desde $3.`;
}

/**
 * Strips any pre-existing sentinel-wrapped block from a description
 * so successive syncs don't accumulate stale text. Falls through
 * unchanged when no sentinel is present.
 */
function stripExistingSentinel(description) {
    if (!description) return '';
    const openIdx = description.indexOf(SENTINEL_OPEN.trim());
    if (openIdx === -1) return description;
    return description.slice(0, openIdx).trimEnd();
}

async function sync() {
    console.log(`💳 Stripe product description sync (mode: ${dryRun ? 'DRY-RUN' : 'APPLY'})...\n`);

    const plansSnap = await db.collection('plans').get();
    const summary = {
        scanned: 0,
        updated: 0,
        skippedNoQuota: 0,
        skippedNoPriceId: 0,
        errors: [],
    };

    for (const planDoc of plansSnap.docs) {
        summary.scanned++;
        const plan = planDoc.data();
        const planId = planDoc.id;
        const limits = plan.limits ?? {};
        const standard = Number(limits.standardPagesPerMonth) || 0;
        const premium = Number(limits.premiumPagesPerMonth) || 0;
        const priceId = plan.stripePriceIds?.monthly ?? plan.stripePriceIds?.yearly;

        if (standard === 0 && premium === 0) {
            console.log(`⊘  ${planId}: no quota — skipping`);
            summary.skippedNoQuota++;
            continue;
        }
        if (!priceId) {
            console.log(`⊘  ${planId}: no Stripe price id — skipping`);
            summary.skippedNoPriceId++;
            continue;
        }

        try {
            // Resolve the Product from the Price.
            const price = await stripe.prices.retrieve(priceId);
            const productId = typeof price.product === 'string' ? price.product : price.product.id;
            const product = await stripe.products.retrieve(productId);

            const baseDescription = stripExistingSentinel(product.description);
            const quotaLine = buildQuotaLine(standard, premium);
            const newDescription = baseDescription
                ? `${baseDescription}${SENTINEL_OPEN}${quotaLine}${SENTINEL_CLOSE}`
                : `${SENTINEL_OPEN.trim()}${quotaLine}${SENTINEL_CLOSE}`;

            if (newDescription === product.description) {
                console.log(`✓  ${planId}: description already in sync (product=${productId})`);
                continue;
            }

            console.log(`📝 ${planId} → product ${productId}`);
            console.log(`   Quota line: ${quotaLine}`);
            if (!dryRun) {
                await stripe.products.update(productId, { description: newDescription });
                console.log(`   ✅ updated`);
            } else {
                console.log(`   (dry-run — no write)`);
            }
            summary.updated++;
        } catch (err) {
            const reason = err?.message ?? String(err);
            console.error(`❌ ${planId}: ${reason}`);
            summary.errors.push({ planId, reason });
        }
    }

    console.log('\n🎉 Sync complete:');
    console.log(JSON.stringify(summary, null, 2));
    if (dryRun) console.log('\n💡 Dry-run only. Re-run with --apply to write to Stripe.');
    process.exit(0);
}

sync().catch(err => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
});
