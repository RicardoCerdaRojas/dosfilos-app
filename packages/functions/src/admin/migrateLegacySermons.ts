import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * One-shot migration: assigns every orphan sermon (no `projectId`) to a
 * default project per user called "Material previo".
 *
 * Why: the workshop paradigm makes the project the central work unit. Sermons
 * created before this paradigm shift have no project — they need a home so
 * they appear inside the new project-first navigation. We don't move data,
 * just stamp `sermons.projectId` so existing UIs keep working.
 *
 * Idempotent: running it again is a no-op. Existing "Material previo" projects
 * are reused; sermons that already have a `projectId` are skipped.
 */

interface MigrationResult {
    success: boolean;
    usersProcessed: number;
    projectsCreated: number;
    sermonsAssigned: number;
    sermonsSkipped: number;
    errors: Array<{ userId: string; error: string }>;
}

const LEGACY_PROJECT_TITLE = 'Material previo';
const LEGACY_PROJECT_CONTEXT_NOTE =
    'Sermones creados antes del modelo de proyectos. Reorganízalos en proyectos temáticos cuando quieras.';

export const migrateLegacySermons = onCall(
    {
        ...appCheckCallableOptions(),
        region: 'us-central1',
        memory: '512MiB',
        timeoutSeconds: 300,
        cors: true,
    },
    async (request): Promise<MigrationResult> => {
        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can run migrations');
        }

        const db = getFirestore();
        const result: MigrationResult = {
            success: true,
            usersProcessed: 0,
            projectsCreated: 0,
            sermonsAssigned: 0,
            sermonsSkipped: 0,
            errors: [],
        };

        // 1. Find all sermons missing projectId. We can't easily query "field
        //    doesn't exist" in Firestore, so we fetch all sermons and filter
        //    client-side. For larger datasets, paginate.
        const allSermons = await db.collection('sermons').get();
        const orphansByUser = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();

        for (const doc of allSermons.docs) {
            const data = doc.data();
            if (data.projectId) {
                result.sermonsSkipped++;
                continue;
            }
            const userId = data.userId as string | undefined;
            if (!userId) continue;
            if (!orphansByUser.has(userId)) orphansByUser.set(userId, []);
            orphansByUser.get(userId)!.push(doc);
        }

        // 2. For each user with orphans, ensure the legacy project exists, then
        //    stamp `projectId` on every orphan sermon.
        for (const [userId, sermons] of orphansByUser.entries()) {
            try {
                // Look up an existing legacy project for this user
                const existing = await db
                    .collection('ai_projects')
                    .where('userId', '==', userId)
                    .where('title', '==', LEGACY_PROJECT_TITLE)
                    .limit(1)
                    .get();

                let projectId: string;
                if (!existing.empty) {
                    projectId = existing.docs[0].id;
                } else {
                    const projectRef = db.collection('ai_projects').doc();
                    await projectRef.set({
                        userId,
                        title: LEGACY_PROJECT_TITLE,
                        color: 'slate',
                        contextNote: LEGACY_PROJECT_CONTEXT_NOTE,
                        sourceIds: [],
                        createdAt: FieldValue.serverTimestamp(),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                    projectId = projectRef.id;
                    result.projectsCreated++;
                }

                // Batch update orphan sermons (max 500 per batch)
                const batches: FirebaseFirestore.WriteBatch[] = [];
                let current = db.batch();
                let inBatch = 0;
                for (const sermon of sermons) {
                    current.update(sermon.ref, {
                        projectId,
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                    inBatch++;
                    if (inBatch === 450) {
                        batches.push(current);
                        current = db.batch();
                        inBatch = 0;
                    }
                }
                if (inBatch > 0) batches.push(current);
                for (const b of batches) await b.commit();

                result.sermonsAssigned += sermons.length;
                result.usersProcessed++;
            } catch (err: any) {
                result.errors.push({ userId, error: err?.message ?? String(err) });
            }
        }

        if (result.errors.length > 0) result.success = false;

        console.log('[migrateLegacySermons] Done', JSON.stringify(result));
        return result;
    }
);
