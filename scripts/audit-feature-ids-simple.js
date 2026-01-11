/**
 * Phase 0: Simple Feature ID Audit Script
 * 
 * This is a simplified version that reads directly from your Firebase project
 * Uses the Firebase Admin SDK with Application Default Credentials
 * 
 * Prerequisites:
 *   1. Firebase CLI logged in (firebase login)
 *   2. Project set in .firebaserc
 * 
 * Usage:
 *   npm run audit:features:simple
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Simple initialization - uses default credentials
admin.initializeApp();

const db = admin.firestore();

/**
 * Extract all unique feature IDs from Firebase plans collection
 */
async function extractFirebaseFeatures() {
    console.log('📋 Extracting features from Firebase plans collection...');

    const plansSnapshot = await db.collection('plans').get();
    const allFeatures = new Set();
    const planMap = {};

    plansSnapshot.docs.forEach(doc => {
        const plan = doc.data();
        const features = plan.features || [];

        planMap[doc.id] = features;

        features.forEach(feature => {
            allFeatures.add(feature);
        });
    });

    console.log(`✅ Found ${allFeatures.size} unique features across ${plansSnapshot.size} plans`);

    return {
        features: Array.from(allFeatures).sort(),
        planMap
    };
}

/**
 * Search codebase for feature ID patterns
 */
function extractCodeFeatures() {
    console.log('🔍 Scanning codebase for feature IDs...');

    const codeFeatures = new Set();
    const featurePattern = /['"`]([a-z]+:[a-z_]+)['"`]/g;

    // Directories to search - relative to project root
    const searchDirs = [
        path.join(__dirname, '../packages/web/src'),
        path.join(__dirname, '../packages/application/src'),
        path.join(__dirname, '../packages/domain/src'),
    ];

    function scanDirectory(dir) {
        if (!fs.existsSync(dir)) {
            console.log(`⚠️  Directory not found: ${dir}`);
            return;
        }

        const files = fs.readdirSync(dir, { withFileTypes: true });

        files.forEach(file => {
            const fullPath = path.join(dir, file.name);

            if (file.isDirectory()) {
                // Skip node_modules and build directories
                if (!['node_modules', 'dist', 'build', '.next'].includes(file.name)) {
                    scanDirectory(fullPath);
                }
            } else if (file.isFile() && /\.(ts|tsx|js|jsx)$/.test(file.name)) {
                const content = fs.readFileSync(fullPath, 'utf-8');

                let match;
                while ((match = featurePattern.exec(content)) !== null) {
                    const featureId = match[1];
                    // Validate format: namespace:feature_name
                    if (/^[a-z]+:[a-z_]+$/.test(featureId)) {
                        codeFeatures.add(featureId);
                    }
                }
            }
        });
    }

    searchDirs.forEach(dir => {
        console.log(`  Scanning: ${dir}`);
        scanDirectory(dir);
    });

    console.log(`✅ Found ${codeFeatures.size} unique feature IDs in code`);

    return Array.from(codeFeatures).sort();
}

/**
 * Generate and print report
 */
function generateReport(firebaseFeatures, codeFeatures, planMap) {
    const onlyInFirebase = firebaseFeatures.filter(f => !codeFeatures.includes(f));
    const onlyInCode = codeFeatures.filter(f => !firebaseFeatures.includes(f));
    const common = firebaseFeatures.filter(f => codeFeatures.includes(f));

    const lines = [];

    lines.push('# Feature ID Audit Report');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total in Firebase**: ${firebaseFeatures.length}`);
    lines.push(`- **Total in Code**: ${codeFeatures.length}`);
    lines.push(`- **Common**: ${common.length}`);
    lines.push(`- **Only in Firebase**: ${onlyInFirebase.length}`);
    lines.push(`- **Only in Code**: ${onlyInCode.length}`);
    lines.push('');

    // Critical Issues
    if (onlyInCode.length > 0) {
        lines.push('## ⚠️ CRITICAL: Features in Code but NOT in Firebase');
        lines.push('');
        lines.push('These features are referenced in code but don\'t exist in any plan:');
        lines.push('');
        onlyInCode.forEach(feature => {
            lines.push(`- \`${feature}\``);
        });
        lines.push('');
    }

    // Warnings
    if (onlyInFirebase.length > 0) {
        lines.push('## ⚡ WARNING: Features in Firebase but NOT in Code');
        lines.push('');
        lines.push('These features exist in plans but are never referenced in code:');
        lines.push('');
        onlyInFirebase.forEach(feature => {
            lines.push(`- \`${feature}\``);
        });
        lines.push('');
    }

    // Common features (good!)
    lines.push('## ✅ Common Features (Consistent)');
    lines.push('');
    common.forEach(feature => {
        lines.push(`- \`${feature}\``);
    });
    lines.push('');

    // Plan breakdown
    lines.push('## Plan Feature Breakdown');
    lines.push('');
    Object.entries(planMap).forEach(([planId, features]) => {
        lines.push(`### Plan: ${planId}`);
        lines.push('');
        if (features.length === 0) {
            lines.push('*No features*');
        } else {
            features.forEach(feature => {
                const status = common.includes(feature) ? '✅' : '⚠️';
                lines.push(`${status} \`${feature}\``);
            });
        }
        lines.push('');
    });

    return {
        report: lines.join('\n'),
        onlyInCode,
        onlyInFirebase,
        common
    };
}

/**
 * Main audit function
 */
async function auditFeatures() {
    console.log('🚀 Starting Feature ID Audit...\n');

    try {
        // Extract from both sources
        const { features: firebaseFeatures, planMap } = await extractFirebaseFeatures();
        const codeFeatures = extractCodeFeatures();

        // Generate report
        const { report, onlyInCode, onlyInFirebase, common } = generateReport(
            firebaseFeatures,
            codeFeatures,
            planMap
        );

        // Save report
        const reportPath = path.join(__dirname, '../docs/feature-id-audit-report.md');
        fs.writeFileSync(reportPath, report);

        console.log(`\n📄 Report saved to: ${reportPath}`);

        // Print summary to console
        console.log('\n' + '='.repeat(60));
        console.log('AUDIT SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Features in Firebase: ${firebaseFeatures.length}`);
        console.log(`Total Features in Code: ${codeFeatures.length}`);
        console.log(`Common (Consistent): ${common.length}`);
        console.log(`Only in Firebase: ${onlyInFirebase.length}`);
        console.log(`Only in Code: ${onlyInCode.length}`);

        if (onlyInCode.length > 0) {
            console.log('\n⚠️  CRITICAL: Some features in code are missing from Firebase!');
            console.log('\nFeatures to add to Firebase plans:');
            onlyInCode.forEach(f => console.log(`   - ${f}`));
            console.log('\nSee full report for details.');
            process.exit(1);
        } else if (onlyInFirebase.length > 0) {
            console.log('\n⚡ WARNING: Some features in Firebase are not used in code.');
            console.log('This is not critical but should be reviewed.');
            console.log('\nUnused features:');
            onlyInFirebase.forEach(f => console.log(`   - ${f}`));
        } else {
            console.log('\n✅ Perfect! All features are consistent.');
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error during audit:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run audit
auditFeatures();
