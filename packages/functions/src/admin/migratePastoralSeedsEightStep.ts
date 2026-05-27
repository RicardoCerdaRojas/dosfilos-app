import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Pastoral Fidelity Phase 1.6 (ADR-022) — one-shot migration of
 * `pastoralSeeds/` from the six-step spine to the eight-step spine.
 *
 * Per seed:
 *   - rename `syntax` → `structuralAnalysis` (verbatim copy)
 *   - rename `morphology` → `wordStudies`, with the inner array
 *     `wordStudies[]` → `studies[]` (ADR-022 D2)
 *   - create empty `contextGenre` (pos 2) + `timelessPrinciple` (pos 7)
 *     where missing — legacy seeds become "incomplete" until the pastor
 *     fills the two new steps on resume (accepted: dogfooding volume).
 *   - recompute `completed = false` for seeds touched by the migration
 *     (the two new required steps are empty), so the wizard re-gates.
 *
 * Idempotent: a seed already in the eight-step shape (has
 * `structuralAnalysis` AND `contextGenre`) is skipped. The functions
 * package intentionally does NOT depend on `@dosfilos/domain`, so the
 * step shapes are mirrored locally here.
 *
 * Admin-only. Run once after deploy.
 */

interface MigrationResult {
    success: boolean;
    seedsScanned: number;
    seedsMigrated: number;
    seedsSkipped: number;
    errors: Array<{ seedId: string; error: string }>;
}

export const migratePastoralSeedsEightStep = onCall(
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
            seedsScanned: 0,
            seedsMigrated: 0,
            seedsSkipped: 0,
            errors: [],
        };

        const snap = await db.collection('pastoralSeeds').get();
        result.seedsScanned = snap.size;

        const emptyContextGenre = {
            genre: '',
            genreConfirmed: false,
            genreImplication: '',
            bookLocationNote: '',
            historicalContextConsulted: false,
            timeSpentSeconds: 0,
            completedAt: null,
        };
        const emptyTimelessPrinciple = {
            principle: '',
            verificationReport: null,
            timeSpentSeconds: 0,
            completedAt: null,
        };

        let batch = db.batch();
        let inBatch = 0;
        const batches: FirebaseFirestore.WriteBatch[] = [];

        for (const doc of snap.docs) {
            try {
                const data = doc.data();
                const alreadyMigrated = data.structuralAnalysis && data.contextGenre;
                if (alreadyMigrated) {
                    result.seedsSkipped++;
                    continue;
                }

                const patch: Record<string, unknown> = {
                    updatedAt: FieldValue.serverTimestamp(),
                };

                // Rename syntax → structuralAnalysis.
                if (!data.structuralAnalysis && data.syntax) {
                    patch.structuralAnalysis = data.syntax;
                    patch.syntax = FieldValue.delete();
                }

                // Rename morphology → wordStudies + inner wordStudies[] → studies[].
                if (!data.wordStudies && data.morphology) {
                    const m = data.morphology ?? {};
                    patch.wordStudies = {
                        studies: Array.isArray(m.wordStudies) ? m.wordStudies : [],
                        timeSpentSeconds: m.timeSpentSeconds ?? 0,
                        completedAt: m.completedAt ?? null,
                    };
                    patch.morphology = FieldValue.delete();
                }

                // Create the two new steps where missing.
                if (!data.contextGenre) patch.contextGenre = emptyContextGenre;
                if (!data.timelessPrinciple) patch.timelessPrinciple = emptyTimelessPrinciple;

                // The two new required steps are empty → seed is incomplete.
                patch.completed = false;
                patch.completedAt = null;

                batch.update(doc.ref, patch);
                inBatch++;
                result.seedsMigrated++;
                if (inBatch === 450) {
                    batches.push(batch);
                    batch = db.batch();
                    inBatch = 0;
                }
            } catch (err: any) {
                result.errors.push({ seedId: doc.id, error: err?.message ?? String(err) });
            }
        }
        if (inBatch > 0) batches.push(batch);
        for (const b of batches) await b.commit();

        if (result.errors.length > 0) result.success = false;
        console.log('[migratePastoralSeedsEightStep] Done', JSON.stringify(result));
        return result;
    },
);
