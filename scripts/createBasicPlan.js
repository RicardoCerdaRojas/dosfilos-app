/**
 * Migration Script: Create Basic plan in Firestore
 * 
 * Purpose: Create the new "basic" plan document in Firestore production
 * Based on current free plan features with new pricing
 * 
 * Run: node scripts/createBasicPlan.js
 */

const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function createBasicPlan() {
    console.log('🚀 Starting Basic plan creation...\\n');

    const basicPlan = {
        // Plan metadata
        id: 'basic',
        name: 'Basic',
        description: 'Para comenzar tu ministerio de predicación',
        tier: 'basic',

        // Features & Modules (same as old free plan)
        features: [
            'sermon:create',
            'sermon:export_pdf',
            'library:upload',
        ],
        modules: [
            'module:dashboard',
            'module:sermones',
            'module:biblioteca',
            'module:greek_tutor',
        ],

        // Usage limits (based on original free plan)
        limits: {
            sermonsPerMonth: 1,
            maxPreachingPlansPerMonth: 1, // Now monthly like other plans
            greekSessionsPerMonth: 1,
            libraryStorageMB: 50,
        },

        // Pricing
        pricing: {
            currency: 'USD',
            monthly: 9.99,
            yearly: 99.99, // TODO: Get yearly price ID from Stripe
        },

        // Stripe integration
        stripeProductIds: ['price_1Snh3X08MCNNnSDL4izMKQex'],

        // Metadata
        isActive: true,
        isPublic: true,
        sortOrder: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
        // Check if basic plan already exists
        const existingPlan = await db.collection('plans').doc('basic').get();

        if (existingPlan.exists) {
            console.log('⚠️  Basic plan already exists.');
            console.log('Current data:', existingPlan.data());

            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            return new Promise((resolve) => {
                readline.question('\\nDo you want to UPDATE it? (yes/no): ', async (answer) => {
                    readline.close();
                    if (answer.toLowerCase() === 'yes') {
                        await db.collection('plans').doc('basic').update({
                            ...basicPlan,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        console.log('✅ Basic plan UPDATED successfully!');
                    } else {
                        console.log('❌ Skipped update.');
                    }
                    resolve();
                });
            });
        }

        // Create the plan
        await db.collection('plans').doc('basic').set(basicPlan);
        console.log('✅ Basic plan created successfully!\\n');
        console.log('Plan details:', JSON.stringify(basicPlan, null, 2));

    } catch (error) {
        console.error('❌ Error creating Basic plan:', error);
        throw error;
    }
}

// Run the script
createBasicPlan()
    .then(() => {
        console.log('\\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\\n❌ Script failed:', error);
        process.exit(1);
    });
