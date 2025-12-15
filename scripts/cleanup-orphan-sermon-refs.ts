/**
 * Cleanup script for orphaned sermon references in series
 * 
 * This script finds and removes references to deleted sermons in:
 * - series.draftIds
 * - series.sermonIds  
 * - series.metadata.plannedSermons[].draftId
 * 
 * Prerequisites:
 * - Run: gcloud auth application-default login
 * - Or set GOOGLE_APPLICATION_CREDENTIALS env var
 * 
 * Run with: npx ts-node scripts/cleanup-orphan-sermon-refs.ts
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with Application Default Credentials
initializeApp({
    credential: applicationDefault(),
    projectId: 'dosfilosapp' // Your Firebase project ID
});

const db = getFirestore();

const SERIES_COLLECTION = 'series';
const SERMONS_COLLECTION = 'sermons';

interface OrphanReport {
    seriesId: string;
    seriesTitle: string;
    orphanedDraftIds: string[];
    orphanedSermonIds: string[];
    orphanedPlannedSermonDraftIds: { plannedId: string; draftId: string }[];
}

async function checkSermonExists(sermonId: string): Promise<boolean> {
    try {
        const doc = await db.collection(SERMONS_COLLECTION).doc(sermonId).get();
        return doc.exists;
    } catch (error) {
        return false;
    }
}

async function findOrphanedReferences(): Promise<OrphanReport[]> {
    console.log('🔍 Scanning series for orphaned sermon references...\n');

    const seriesSnapshot = await db.collection(SERIES_COLLECTION).get();
    console.log(`📊 Found ${seriesSnapshot.size} series to check\n`);

    const reports: OrphanReport[] = [];

    for (const seriesDoc of seriesSnapshot.docs) {
        const data = seriesDoc.data();
        const report: OrphanReport = {
            seriesId: seriesDoc.id,
            seriesTitle: data.title || 'Sin título',
            orphanedDraftIds: [],
            orphanedSermonIds: [],
            orphanedPlannedSermonDraftIds: []
        };

        // Check draftIds
        const draftIds = data.draftIds || [];
        for (const draftId of draftIds) {
            const exists = await checkSermonExists(draftId);
            if (!exists) {
                report.orphanedDraftIds.push(draftId);
            }
        }

        // Check sermonIds
        const sermonIds = data.sermonIds || [];
        for (const sermonId of sermonIds) {
            const exists = await checkSermonExists(sermonId);
            if (!exists) {
                report.orphanedSermonIds.push(sermonId);
            }
        }

        // Check plannedSermons draftIds
        const plannedSermons = data.metadata?.plannedSermons || [];
        for (const planned of plannedSermons) {
            if (planned.draftId) {
                const exists = await checkSermonExists(planned.draftId);
                if (!exists) {
                    report.orphanedPlannedSermonDraftIds.push({
                        plannedId: planned.id,
                        draftId: planned.draftId
                    });
                }
            }
        }

        // Only add to reports if there are orphaned references
        const hasOrphans =
            report.orphanedDraftIds.length > 0 ||
            report.orphanedSermonIds.length > 0 ||
            report.orphanedPlannedSermonDraftIds.length > 0;

        if (hasOrphans) {
            reports.push(report);
            console.log(`⚠️  "${report.seriesTitle}" (${report.seriesId}):`);
            if (report.orphanedDraftIds.length > 0) {
                console.log(`    - ${report.orphanedDraftIds.length} orphaned draftIds`);
            }
            if (report.orphanedSermonIds.length > 0) {
                console.log(`    - ${report.orphanedSermonIds.length} orphaned sermonIds`);
            }
            if (report.orphanedPlannedSermonDraftIds.length > 0) {
                console.log(`    - ${report.orphanedPlannedSermonDraftIds.length} orphaned plannedSermon draftIds`);
            }
        }
    }

    return reports;
}

async function cleanupOrphanedReferences(reports: OrphanReport[]): Promise<void> {
    if (reports.length === 0) {
        console.log('\n✅ No orphaned references to clean up!');
        return;
    }

    console.log(`\n🧹 Cleaning up ${reports.length} series with orphaned references...`);

    for (const report of reports) {
        console.log(`\n📝 Cleaning "${report.seriesTitle}"...`);

        const seriesRef = db.collection(SERIES_COLLECTION).doc(report.seriesId);
        const seriesDoc = await seriesRef.get();
        const data = seriesDoc.data();

        if (!data) {
            console.log(`   ⚠️  Series not found, skipping`);
            continue;
        }

        const updates: Record<string, any> = {};

        // Remove orphaned draftIds
        if (report.orphanedDraftIds.length > 0) {
            const cleanedDraftIds = (data.draftIds || []).filter(
                (id: string) => !report.orphanedDraftIds.includes(id)
            );
            updates.draftIds = cleanedDraftIds;
            console.log(`   ✓ Removed ${report.orphanedDraftIds.length} orphaned draftIds`);
        }

        // Remove orphaned sermonIds
        if (report.orphanedSermonIds.length > 0) {
            const cleanedSermonIds = (data.sermonIds || []).filter(
                (id: string) => !report.orphanedSermonIds.includes(id)
            );
            updates.sermonIds = cleanedSermonIds;
            console.log(`   ✓ Removed ${report.orphanedSermonIds.length} orphaned sermonIds`);
        }

        // Clear orphaned plannedSermon draftIds
        if (report.orphanedPlannedSermonDraftIds.length > 0) {
            const orphanedDraftIdSet = new Set(
                report.orphanedPlannedSermonDraftIds.map(o => o.draftId)
            );
            const cleanedPlannedSermons = (data.metadata?.plannedSermons || []).map(
                (planned: any) => {
                    if (planned.draftId && orphanedDraftIdSet.has(planned.draftId)) {
                        // Remove the draftId but keep the planned sermon
                        const { draftId, ...rest } = planned;
                        return rest;
                    }
                    return planned;
                }
            );
            updates['metadata.plannedSermons'] = cleanedPlannedSermons;
            console.log(`   ✓ Cleared ${report.orphanedPlannedSermonDraftIds.length} orphaned plannedSermon draftIds`);
        }

        // Apply updates
        if (Object.keys(updates).length > 0) {
            await seriesRef.update(updates);
            console.log(`   ✅ Series updated successfully`);
        }
    }

    console.log('\n✅ Cleanup complete!');
}

async function main() {
    console.log('🧹 Orphaned Sermon References Cleanup Script\n');
    console.log('='.repeat(50) + '\n');

    try {
        const reports = await findOrphanedReferences();

        console.log(`\n📋 Summary: ${reports.length} series with orphaned references found`);

        if (reports.length > 0) {
            // Ask for confirmation in dry-run mode
            const args = process.argv.slice(2);
            const isDryRun = !args.includes('--execute');

            if (isDryRun) {
                console.log('\n⚠️  DRY RUN MODE - No changes made');
                console.log('   Run with --execute to actually clean up the references');
            } else {
                await cleanupOrphanedReferences(reports);
            }
        } else {
            console.log('\n✅ Database is clean - no orphaned references found!');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
