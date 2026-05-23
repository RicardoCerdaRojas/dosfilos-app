import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { CONFESSION_CATALOG, CatalogEntry } from './catalog';
import { hasLocalSeed, loadLocalSeed, SeedSection } from './loader';
import { writeAuditLog } from '../auditLog';
import { appCheckCallableOptions } from '../../config/appCheckOptions';

/**
 * Cloud Function: Ingest CORE Library confession catalog.
 *
 * Idempotent. Writes the 14+ catalog records under `/confessions/{id}` and,
 * for sources with bundled JSON seed data, also writes per-section docs
 * under `/confessions/{id}/sections/{sectionId}`. Sources without a local
 * seed are persisted as catalog entries with `ingestStatus: 'pending'` so
 * the admin viewer can flag what still needs content ingest.
 *
 * Re-running safely overwrites catalog metadata and section content.
 *
 * Args:
 *   - `confessionIds?: string[]` — optional filter. When omitted, runs the
 *     entire catalog. Pass `['heidelberg-catechism']` to refresh a single
 *     source after a parser fix.
 */
export const ingestCoreLibraryConfessions = onCall(
    appCheckCallableOptions(),
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const db = admin.firestore();
        const callerUid = request.auth.uid;

        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
            throw new HttpsError('permission-denied', 'Only super admins can ingest the CORE Library');
        }

        const filter = Array.isArray(request.data?.confessionIds)
            ? new Set<string>(request.data.confessionIds)
            : null;

        const entries = filter
            ? CONFESSION_CATALOG.filter((e) => filter.has(e.id))
            : CONFESSION_CATALOG;

        const report: Array<{
            id: string;
            status: 'ingested' | 'reference-only' | 'pending-content';
            sectionCount: number;
        }> = [];

        for (const entry of entries) {
            const sectionCount = await persistConfession(db, entry);
            const status: 'ingested' | 'reference-only' | 'pending-content' =
                entry.sectionType === 'reference'
                    ? 'reference-only'
                    : sectionCount > 0
                        ? 'ingested'
                        : 'pending-content';
            report.push({ id: entry.id, status, sectionCount });
        }

        writeAuditLog({
            actorUid: callerUid,
            actorEmail: callerDoc.data()?.email,
            action: 'core_library.ingest',
            details: {
                requestedIds: filter ? Array.from(filter) : 'all',
                report,
            },
        });

        return { success: true, report };
    },
);

async function persistConfession(
    db: FirebaseFirestore.Firestore,
    entry: CatalogEntry,
): Promise<number> {
    const ref = db.collection('confessions').doc(entry.id);

    let seedSections: SeedSection[] | null = null;
    if (entry.sectionType === 'sectioned' && hasLocalSeed(entry.id)) {
        seedSections = loadLocalSeed(entry.id)?.sections ?? null;
    }

    const sectionCount = seedSections?.length ?? 0;
    const ingestStatus =
        entry.sectionType === 'reference'
            ? 'not-applicable'
            : sectionCount > 0
                ? 'complete'
                : 'pending';

    await ref.set({
        title: entry.title,
        shortTitle: entry.shortTitle,
        authorOrEditor: entry.authorOrEditor ?? null,
        year: entry.year,
        sourceType: entry.sourceType,
        tradition: entry.tradition,
        language: entry.language,
        sourceUrl: entry.sourceUrl,
        sectionType: entry.sectionType,
        ingestStatus,
        sectionCount,
        rightsStatus: entry.rightsStatus,
        license: entry.license,
        licenseUrl: entry.licenseUrl ?? null,
        copyrightNotice: entry.copyrightNotice ?? null,
        ingestionStatus: entry.ingestionStatus,
        riskLevel: entry.riskLevel,
        requiredAttribution: entry.requiredAttribution ?? null,
        specialHandling: entry.specialHandling ?? null,
        citation: entry.citation,
        ragUse: entry.ragUse ?? null,
        doNotUseFor: entry.doNotUseFor ?? null,
        ecumenicalAffirmation: entry.ecumenicalAffirmation ?? null,
        recommendedDocumentsInside: entry.recommendedDocumentsInside ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    if (seedSections && seedSections.length > 0) {
        const sectionsRef = ref.collection('sections');
        const batch = db.batch();
        for (const section of seedSections) {
            const sectionId = sanitizeSectionId(section.sectionReference);
            const sectionRef = sectionsRef.doc(sectionId);
            batch.set(sectionRef, {
                sectionReference: section.sectionReference,
                title: section.title ?? null,
                text: section.text,
                question: section.question ?? null,
                answer: section.answer ?? null,
                topics: section.topics ?? null,
                order: section.order,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
    }

    return sectionCount;
}

/**
 * Firestore doc IDs cannot contain `/`. Replace it with `_` so section
 * references like "Q&A 1" or "1.1" survive as stable IDs.
 */
function sanitizeSectionId(ref: string): string {
    return ref.replace(/[/]/g, '_').replace(/\s+/g, '-');
}
