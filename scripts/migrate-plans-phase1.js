/**
 * Phase 1: Migration Script - Update Plans Collection
 * 
 * This script updates the plans collection in Firebase with:
 * - sortOrder field for display ordering
 * - highlightText field for badges
 * - isLegacy field for deprecated plans
 * - stripeProductIds array for Stripe integration
 * - isPublic field to control visibility
 * 
 * Only Basic, Pro, and Team will be public
 * Free and Enterprise will be marked as legacy
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

async function migratePlans() {
    console.log('🚀 Starting Plans Migration...\n');

    try {
        // Get all plans
        const plansSnapshot = await db.collection('plans').get();
        console.log(`📋 Found ${plansSnapshot.size} plans to update\n`);

        // Migration configurations
        const migrations = {
            basic: {
                sortOrder: 1,
                highlightText: null, // No highlight
                isLegacy: false,
                isPublic: true,
                stripeProductIds: ['price_1Snh3X08MCNNnSDL4izMKQex'],
                isActive: true,
                description: 'Para comenzar tu ministerio de predicación'
            },
            pro: {
                sortOrder: 2,
                highlightText: 'Más Popular', // This is the popular one
                isLegacy: false,
                isPublic: true,
                stripeProductIds: ['price_1Snh5U08MCNNnSDLVggbHmWm'],
                isActive: true,
                description: 'Para pastores que predican regularmente'
            },
            team: {
                sortOrder: 3,
                highlightText: null,
                isLegacy: false,
                isPublic: true,
                stripeProductIds: ['price_1SgDiK08MCNNnSDL3mCVFwl4'],
                isActive: true,
                description: 'Para equipos pastorales e iglesias'
            },
            free: {
                sortOrder: 99,
                highlightText: null,
                isLegacy: true,
                isPublic: false, // Hidden from public listings
                stripeProductIds: [],
                isActive: true, // Still active for existing users
                description: 'Plan legacy - migrar a Basic'
            },
            enterprise: {
                sortOrder: 98,
                highlightText: null,
                isLegacy: true,
                isPublic: false, // Hidden from public
                stripeProductIds: [],
                isActive: false, // Not active anymore
                description: 'Plan legacy - features futuras pendientes'
            }
        };

        // Update each plan
        for (const [planId, config] of Object.entries(migrations)) {
            console.log(`📝 Updating plan: ${planId}`);

            const planRef = db.collection('plans').doc(planId);
            const planDoc = await planRef.get();

            if (!planDoc.exists) {
                console.log(`   ⚠️  Plan "${planId}" not found, skipping...`);
                continue;
            }

            // Update the plan
            await planRef.update(config);

            console.log(`   ✅ Updated successfully`);
            console.log(`      - sortOrder: ${config.sortOrder}`);
            console.log(`      - isPublic: ${config.isPublic}`);
            console.log(`      - isLegacy: ${config.isLegacy}`);
            console.log(`      - highlightText: ${config.highlightText || '(none)'}`);
            console.log(`      - stripeProductIds: ${config.stripeProductIds.length} IDs`);
            console.log('');
        }

        // Verify the updates
        console.log('\n' + '='.repeat(60));
        console.log('VERIFICATION - Current Plan Status');
        console.log('='.repeat(60));

        const updatedSnapshot = await db.collection('plans').get();
        const publicPlans = [];
        const legacyPlans = [];

        updatedSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const planInfo = {
                id: doc.id,
                sortOrder: data.sortOrder,
                isPublic: data.isPublic,
                isLegacy: data.isLegacy,
                highlightText: data.highlightText
            };

            if (data.isPublic) {
                publicPlans.push(planInfo);
            } else {
                legacyPlans.push(planInfo);
            }
        });

        console.log('\n📢 PUBLIC PLANS (shown to users):');
        publicPlans
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .forEach(plan => {
                const highlight = plan.highlightText ? ` [${plan.highlightText}]` : '';
                console.log(`   ${plan.sortOrder}. ${plan.id}${highlight}`);
            });

        console.log('\n🔒 LEGACY PLANS (hidden, existing users only):');
        legacyPlans.forEach(plan => {
            console.log(`   ${plan.sortOrder}. ${plan.id} (legacy)`);
        });

        console.log('\n✅ Migration completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Create plan_translations collection');
        console.log('2. Seed translations for Basic, Pro, Team');
        console.log('3. Implement domain layer');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error during migration:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run migration
migratePlans();
