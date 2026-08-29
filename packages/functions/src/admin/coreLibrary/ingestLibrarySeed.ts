import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { writeAuditLog } from '../auditLog';
import { appCheckCallableOptions } from '../../config/appCheckOptions';
import seedData from './data/core-library-seed.json';

/**
 * Cloud Function: Ingest non-confession sources from the canonical CORE
 * Library seed JSON into `/library_resources`.
 *
 * Confession sources (14 entries) already live in `/confessions/` (PR 0.2
 * `ingestCoreLibraryConfessions`). This callable handles the remaining 8
 * sources that belong in the unified library admin surface:
 *
 *   - SBLGNT (CC BY 4.0 Greek NT — drives PDF export attribution)
 *   - Schaff Creeds of Christendom Vols I/II/III (public domain historical)
 *   - Chicago Statements 1978 / 1982 / 1986 (metadata-only, copyrighted)
 *
 * Documents are written with deterministic IDs (= `source_id`) so re-runs
 * are idempotent and don't multiply seed entries on each call.
 *
 * Each doc is tagged `isSystemSource: true` and `userId = <caller>` so the
 * existing `CoreLibraryAdmin` queries (which filter by `userId`) surface
 * them alongside the admin's personal uploads. The system flag protects
 * them from accidental deletion via the per-user library UI.
 */

const CONFESSION_SOURCE_IDS = new Set<string>([
    'schaff-creeds-vol-1',
    'schaff-creeds-vol-2',
    'schaff-creeds-vol-3',
    'apostles-creed',
    'nicene-creed',
    'athanasian-creed',
    'definition-of-chalcedon',
    'westminster-confession',
    'westminster-shorter-catechism',
    'westminster-larger-catechism',
    'belgic-confession',
    'heidelberg-catechism',
    'canons-of-dort',
    'augsburg-confession',
]);

interface SeedSource {
    source_id: string;
    title: string;
    short_title?: string;
    author_or_editor?: string;
    editor?: string;
    year: number | string;
    source_type: string;
    tradition: string;
    language: string;
    rights_status: string;
    license: string;
    license_url?: string;
    copyright_notice?: string;
    ingestion_status: string;
    risk_level: string;
    source_url: string;
    download_url?: string | null;
    rag_use?: string[];
    do_not_use_for?: string[];
    required_attribution?: string[];
    special_handling?: string[];
    citation: {
        short: string;
        footnote: string;
        bibliography: string;
        rag_display: string;
    };
    example_section_reference?: string;
}

interface SeedJson {
    schema_version: string;
    sources: SeedSource[];
}

interface IngestReport {
    sourceId: string;
    status: 'written' | 'skipped-confession';
    license: string;
    ingestionStatus: string;
}

/**
 * Map a JSON seed source to a `library_resources` document shape that the
 * existing repository mapper and `CoreLibraryAdmin` UI know how to read.
 *
 * Notes on the mapping:
 *  - `coreStores` is empty by default — admin manually assigns the seed
 *    docs to whichever store (`griego`, `generico`, …) makes sense after
 *    ingest. This avoids inventing a "modern statements" store eagerly.
 *  - `publiclyCitable` flips to `true` for openly-licensed material so the
 *    legacy badge stays accurate next to the new rights-aware badges.
 *  - `extractionVersion`, `indexingStatus`, and the various Gemini metadata
 *    fields stay empty because seed docs are metadata-only at ingest time
 *    — extraction/indexing of full text is a follow-up step that requires
 *    fetching the actual source file.
 */
function mapSourceToResource(source: SeedSource, callerUid: string): Record<string, unknown> {
    const license = source.license;
    const isOpenLicense =
        license === 'Public Domain' ||
        license === 'CC BY 4.0' ||
        license === 'CC BY-SA 4.0';

    return {
        userId: callerUid,
        isSystemSource: true,
        // Seed entries are metadata-only: no Cloud Storage object, no text
        // to extract, no chunks to build. These two fields MUST be stamped
        // explicitly even though nothing ever runs on them, because the
        // repository deserializer defaults an ABSENT `textExtractionStatus`
        // to `'pending'` — which the library UI then counted as "extracting
        // text", showing a permanent phantom "N recursos extrayendo texto"
        // banner for work that was never queued. `sizeBytes` has the same
        // problem: absent → `NaN MB` on the card. `'ready'` here means
        // "the extraction pipeline owes this resource nothing", which is
        // the accurate reading for a catalog entry.
        textExtractionStatus: 'ready',
        sizeBytes: 0,
        // Declared coverage. Without it the deserializer defaults `scope`
        // to 'book' with an empty `coversBibleBooks`, and the library then
        // nags "faltan libros bíblicos asignados" on entries where the
        // question is a category error: a confession, a catechism, a
        // doctrinal statement and a creed collection do not comment on any
        // single biblical book. `whole-bible` says exactly that, and keeps
        // them visible for every passage in the corpus picker (see
        // `resourceMatchesTestament`). The one real scriptural text in the
        // seed is the SBL Greek NT, which is testament-wide.
        scope: source.source_type === 'Biblical text' ? 'whole-testament' : 'whole-bible',
        coversBibleBooks: [],
        title: source.title,
        shortTitle: source.short_title ?? null,
        author: source.author_or_editor ?? source.editor ?? null,
        year: source.year,
        sourceType: source.source_type,
        tradition: source.tradition,
        language: source.language,
        sourceUrl: source.source_url,
        downloadUrl: source.download_url ?? null,
        coreStores: [],
        publiclyCitable: isOpenLicense,
        rightsStatus: source.rights_status,
        license,
        licenseUrl: source.license_url ?? null,
        copyrightNotice: source.copyright_notice ?? null,
        ingestionStatus: source.ingestion_status,
        riskLevel: source.risk_level,
        requiredAttribution: source.required_attribution ?? null,
        specialHandling: source.special_handling ?? null,
        citation: source.citation,
        ragUse: source.rag_use ?? null,
        doNotUseFor: source.do_not_use_for ?? null,
        exampleSectionReference: source.example_section_reference ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };
}

export const ingestLibrarySeedSources = onCall(
    appCheckCallableOptions(),
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const db = admin.firestore();
        const callerUid = request.auth.uid;

        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
            throw new HttpsError('permission-denied', 'Only super admins can ingest the CORE Library seed');
        }

        const seed = seedData as unknown as SeedJson;
        const report: IngestReport[] = [];

        for (const source of seed.sources) {
            if (CONFESSION_SOURCE_IDS.has(source.source_id)) {
                report.push({
                    sourceId: source.source_id,
                    status: 'skipped-confession',
                    license: source.license,
                    ingestionStatus: source.ingestion_status,
                });
                continue;
            }

            const ref = db.collection('library_resources').doc(source.source_id);
            await ref.set(mapSourceToResource(source, callerUid), { merge: true });
            report.push({
                sourceId: source.source_id,
                status: 'written',
                license: source.license,
                ingestionStatus: source.ingestion_status,
            });
        }

        writeAuditLog({
            actorUid: callerUid,
            actorEmail: callerDoc.data()?.email,
            action: 'core_library.seed_ingest',
            details: { report },
        });

        return {
            success: true,
            written: report.filter((r) => r.status === 'written').length,
            skipped: report.filter((r) => r.status === 'skipped-confession').length,
            report,
        };
    },
);
