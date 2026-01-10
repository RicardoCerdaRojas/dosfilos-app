/**
 * Phase 0: Feature ID Audit Script
 * 
 * This script verifies consistency between:
 * 1. Feature IDs defined in Firebase plans collection
 * 2. Feature IDs used throughout the codebase
 * 
 * Usage:
 *   npm run audit:features
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

interface FeatureAuditResult {
    firebaseFeatures: Set<string>;
    codeFeatures: Set<string>;
    onlyInFirebase: string[];
    onlyInCode: string[];
    common: string[];
    planFeatureMap: Record<string, string[]>;
}

/**
 * Extract all unique feature IDs from Firebase plans collection
 */
async function extractFirebaseFeatures(): Promise<{
    features: Set<string>;
    planMap: Record<string, string[]>;
}> {
    console.log('📋 Extracting features from Firebase plans collection...');

    const plansSnapshot = await db.collection('plans').get();
    const allFeatures = new Set<string>();
    const planMap: Record<string, string[]> = {};

    plansSnapshot.docs.forEach(doc => {
        const plan = doc.data();
        const features = plan.features || [];

        planMap[doc.id] = features;

        features.forEach((feature: string) => {
            allFeatures.add(feature);
        });
    });

    console.log(`✅ Found ${allFeatures.size} unique features across ${plansSnapshot.size} plans`);

    return {
        features: allFeatures,
        planMap
    };
}

/**
 * Search codebase for feature ID patterns
 */
function extractCodeFeatures(): Set<string> {
    console.log('🔍 Scanning codebase for feature IDs...');

    const codeFeatures = new Set<string>();
    const featurePattern = /['"`]([a-z]+:[a-z_]+)['"`]/g;

    // Directories to search
    const searchDirs = [
        path.join(__dirname, '../../web/src'),
        path.join(__dirname, '../../application/src'),
        path.join(__dirname, '../../domain/src'),
    ];

    function scanDirectory(dir: string) {
        if (!fs.existsSync(dir)) return;

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

    searchDirs.forEach(dir => scanDirectory(dir));

    console.log(`✅ Found ${codeFeatures.size} unique feature IDs in code`);

    return codeFeatures;
}

/**
 * Generate audit report
 */
function generateReport(result: FeatureAuditResult): string {
    const lines: string[] = [];

    lines.push('# Feature ID Audit Report');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total in Firebase**: ${result.firebaseFeatures.size}`);
    lines.push(`- **Total in Code**: ${result.codeFeatures.size}`);
    lines.push(`- **Common**: ${result.common.length}`);
    lines.push(`- **Only in Firebase**: ${result.onlyInFirebase.length}`);
    lines.push(`- **Only in Code**: ${result.onlyInCode.length}`);
    lines.push('');

    // Critical Issues
    if (result.onlyInCode.length > 0) {
        lines.push('## ⚠️ CRITICAL: Features in Code but NOT in Firebase');
        lines.push('');
        lines.push('These features are referenced in code but don\'t exist in any plan:');
        lines.push('');
        result.onlyInCode.forEach(feature => {
            lines.push(`- \`${feature}\``);
        });
        lines.push('');
    }

    // Warnings
    if (result.onlyInFirebase.length > 0) {
        lines.push('## ⚡ WARNING: Features in Firebase but NOT in Code');
        lines.push('');
        lines.push('These features exist in plans but are never referenced in code:');
        lines.push('');
        result.onlyInFirebase.forEach(feature => {
            lines.push(`- \`${feature}\``);
        });
        lines.push('');
    }

    // Common features (good!)
    lines.push('## ✅ Common Features (Consistent)');
    lines.push('');
    result.common.forEach(feature => {
        lines.push(`- \`${feature}\``);
    });
    lines.push('');

    // Plan breakdown
    lines.push('## Plan Feature Breakdown');
    lines.push('');
    Object.entries(result.planFeatureMap).forEach(([planId, features]) => {
        lines.push(`### Plan: ${planId}`);
        lines.push('');
        features.forEach(feature => {
            const status = result.common.includes(feature) ? '✅' : '⚠️';
            lines.push(`${status} \`${feature}\``);
        });
        lines.push('');
    });

    // Recommendations
    lines.push('## Recommendations');
    lines.push('');

    if (result.onlyInCode.length > 0) {
        lines.push('### Action Required: Add Missing Features to Firebase');
        lines.push('');
        lines.push('Run the following commands or update plans manually:');
        lines.push('');
        lines.push('```typescript');
        result.onlyInCode.forEach(feature => {
            lines.push(`// Add '${feature}' to appropriate plan(s)`);
        });
        lines.push('```');
        lines.push('');
    }

    if (result.onlyInFirebase.length > 0) {
        lines.push('### Optional: Remove Unused Features from Firebase');
        lines.push('');
        lines.push('These features can be safely removed if not planned for future use:');
        lines.push('');
        result.onlyInFirebase.forEach(feature => {
            lines.push(`- \`${feature}\``);
        });
        lines.push('');
    }

    return lines.join('\n');
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

        // Compare
        const onlyInFirebase = Array.from(firebaseFeatures)
            .filter(f => !codeFeatures.has(f))
            .sort();

        const onlyInCode = Array.from(codeFeatures)
            .filter(f => !firebaseFeatures.has(f))
            .sort();

        const common = Array.from(firebaseFeatures)
            .filter(f => codeFeatures.has(f))
            .sort();

        const result: FeatureAuditResult = {
            firebaseFeatures,
            codeFeatures,
            onlyInFirebase,
            onlyInCode,
            common,
            planFeatureMap: planMap
        };

        // Generate report
        const report = generateReport(result);

        // Save report
        const reportPath = path.join(__dirname, '../docs/feature-id-audit-report.md');
        fs.writeFileSync(reportPath, report);

        console.log(`\n📄 Report saved to: ${reportPath}`);

        // Print summary to console
        console.log('\n' + '='.repeat(60));
        console.log('AUDIT SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Features in Firebase: ${firebaseFeatures.size}`);
        console.log(`Total Features in Code: ${codeFeatures.size}`);
        console.log(`Common (Consistent): ${common.length}`);
        console.log(`Only in Firebase: ${onlyInFirebase.length}`);
        console.log(`Only in Code: ${onlyInCode.length}`);

        if (onlyInCode.length > 0) {
            console.log('\n⚠️  CRITICAL: Some features in code are missing from Firebase!');
            console.log('See report for details.');
            process.exit(1);
        } else if (onlyInFirebase.length > 0) {
            console.log('\n⚡ WARNING: Some features in Firebase are not used in code.');
            console.log('This is not critical but should be reviewed.');
        } else {
            console.log('\n✅ Perfect! All features are consistent.');
        }

    } catch (error) {
        console.error('❌ Error during audit:', error);
        process.exit(1);
    }
}

// Run audit
auditFeatures();
