import { WorkflowPhase } from './SermonWorkflow';
import type { SourceType as ExegesisSourceType } from '../exegesis/entities/SourceType';
import type { BibleBookId } from '../bible/canon/BibleCanon';

/**
 * Granularity of what a library resource covers (v1.7 paper-corpus
 * library match). Determines how the smart-match dialog interprets
 * `coversBibleBooks`:
 *
 *   - 'whole-bible' — lexicons, theological dictionaries, grammars
 *     covering the whole canon (BDAG, TDNT, BDF, Wallace). `coversBibleBooks`
 *     is expected to be empty.
 *   - 'whole-testament' — NT-only or OT-only references (NIDNTTE, HALOT,
 *     NA28). `coversBibleBooks` is expected to be empty.
 *   - 'book' — commentaries, monographs on a single book or a small
 *     cluster (Cockerill on Hebrews, Bauckham on 2 Peter & Jude).
 *     `coversBibleBooks` should list the covered books.
 *   - 'pericope' — narrow studies on a passage or section
 *     (a journal article on Romans 1:18-32). `coversBibleBooks` lists
 *     the host book(s).
 */
export type LibraryResourceScope = 'whole-bible' | 'whole-testament' | 'book' | 'pericope';

export type ResourceType =
    | 'theology'
    | 'grammar'
    | 'critical-text'
    | 'commentary'
    | 'exegetical-commentary'
    | 'theological-dictionary'
    | 'bible-dictionary'
    | 'historical-context'
    | 'biblical-survey'
    | 'article'
    | 'other';

export type TextExtractionStatus = 'pending' | 'processing' | 'ready' | 'failed';

/**
 * Which extractor produced the text content.
 * - '3.0-llamaparse': Primary, best quality (structured pages, preserves Greek/Hebrew/tables)
 * - '4.0-gemini-standard': Standard tier, Gemini Flash with the same `<!-- page: N -->`
 *   contract as LlamaParse — eligible for the auto-index trigger.
 * - '5.0-pdfparse-structured': Last-resort pdf-parse output enriched with synthetic
 *   page markers (form-feed boundaries or equal-segment splitting). Eligible for
 *   the auto-index trigger so the user always ends up with searchable content
 *   even when both premium engines fail.
 * - '2.0-gemini': Legacy Gemini extraction, predates the structured contract.
 * - 'fallback-pdfparse': Legacy pdf-parse output without page markers; not
 *   auto-indexable. Pre-v5 uploads only.
 */
export type ExtractionVersion =
    | '3.0-llamaparse'
    | '4.0-gemini-standard'
    | '5.0-pdfparse-structured'
    | '2.0-gemini'
    | 'fallback-pdfparse';

/**
 * Indexing job status (chunks + embeddings) written by the cloud
 * functions in `packages/functions/src/library/indexStructuredDocument.ts`.
 * Distinct from `textExtractionStatus` — a resource can be `ready`-extracted
 * but still `processing`/`failed` for indexing.
 */
export type IndexingStatus = 'processing' | 'ready' | 'failed';

/**
 * Combined readiness state for the v1.5 exegesis "extract from library"
 * flow. Computed by `LibraryService.getResourceIndexStatus()` from the
 * raw fields on the resource. Used by the corpus picker to badge each
 * library resource and gate the "extract excerpts" toggle.
 */
export type ResourceIndexStatus =
    | 'indexed'           // Ready to be queried via retrieveChunks (chunks + embeddings present)
    | 'extracting'        // Cloud Function is still parsing the file
    | 'indexing'          // Extraction done; auto-index trigger in flight
    | 'needs-extraction'  // No textExtractionStatus or 'pending' — never started
    | 'needs-indexing'    // Extraction ready but with a version that the indexer ignores (legacy)
    | 'failed';           // Either extraction or indexing reported failure

export interface LibraryResource {
    id: string;
    userId: string;
    title: string;
    author: string;
    type: ResourceType;
    storageUrl: string;
    textContent?: string | undefined; // Legacy: Extracted text directly (deprecated)
    textContentUrl?: string | undefined; // URL to text file in Cloud Storage
    structuredContentUrl?: string | undefined; // URL to structured Markdown (LlamaParse output)
    extractionVersion?: ExtractionVersion; // Which extractor produced textContent
    extractedWithLlamaParse?: boolean; // Convenience flag
    /**
     * Server-stamped timestamp set when the cascade transitions
     * `textExtractionStatus` to `'processing'`. The UI uses this to
     * render "Procesando hace 4m 23s" without depending on when the
     * page mounted, and without trusting client clock skew.
     * Undefined for legacy resources that finished extraction before
     * this field was introduced.
     */
    processingStartedAt?: Date;
    /**
     * User-facing message written by the extraction pipeline when the
     * actual tier ended up below what the user requested (e.g. requested
     * Premium → got Standard because all LlamaParse accounts failed).
     * The card surfaces this in a tooltip on the engine badge so the
     * user can decide whether to reprocess. `null` / undefined means
     * extraction succeeded at the requested tier — no warning needed.
     */
    extractionWarning?: string | null;
    /**
     * Error message written when the cascade exhausted every extractor
     * and the resource ended up in `textExtractionStatus: 'failed'`.
     * Used by the failed-state callout to give the user a concrete
     * reason instead of a generic "something failed".
     */
    extractionError?: string;
    /**
     * Error message written when the indexer (chunks + embeddings)
     * failed AFTER extraction completed. Set when `indexingStatus`
     * is `'failed'`. The card surfaces this in a tooltip on the
     * "Por procesar" pill so the user knows what blocked indexing
     * (e.g. "All N chunks failed to embed") and can retry.
     * Cleared automatically on a successful re-index.
     */
    indexingError?: string | null;
    /**
     * Mode the user explicitly requested at upload time:
     *   - 'standard' → skip LlamaParse, use Gemini → pdf-parse fallback.
     *     Debits standard pages from the user's balance.
     *   - 'premium' → try LlamaParse first (best quality for tables /
     *     multi-column / scanned). Debits premium when LlamaParse runs
     *     successfully; falls back to Gemini and debits standard if
     *     LlamaParse fails.
     *
     * Undefined for legacy resources uploaded before this field
     * existed — the cloud function falls back to its previous
     * "premium-first cascade" behavior in that case.
     */
    requestedExtractionMode?: 'standard' | 'premium';
    textExtractionStatus: TextExtractionStatus;
    /**
     * Indexing job status (chunks + embeddings) written by the
     * `indexStructuredDocument` cloud function. Undefined for legacy
     * resources that were never indexed. The auto-index trigger fires
     * after extraction completes and updates this field.
     */
    indexingStatus?: IndexingStatus;
    /**
     * Indexer schema version (e.g. '2.0-structured'). Used by the
     * auto-index trigger to detect already-indexed resources and skip
     * re-work. Also used by the readiness probe to flag resources
     * indexed under an older schema.
     */
    indexerVersion?: string;
    /**
     * Granular exegesis classification (commit 6 of v1.5). Cached on
     * the resource the first time the user picks it for excerpt
     * extraction so subsequent papers get a pre-filled type instead
     * of the always-generic default. Distinct from `type` (the coarse
     * theology/commentary/grammar trio used by Faculty + Sermon
     * Generator) — exegesis cares about much finer distinctions
     * (`commentary-critical` vs `commentary-expository`,
     * `lexicon-technical` vs `theological-dictionary`, etc.). Storing
     * it here means it follows the resource across all papers; the
     * user only classifies once per recurso, not once per paper.
     *
     * Optional: legacy resources don't have it; the extraction
     * dialog falls back to a coarse-type-derived default when absent.
     */
    exegeticalType?: ExegesisSourceType;
    mimeType: string;
    sizeBytes: number;
    characterCount?: number; // Total character count of extracted text
    pageCount?: number; // Total page count from extraction

    // 🎯 Core Library: Stores this document is included in (can be multiple)
    coreStores?: ('exegesis' | 'homiletics' | 'generic')[];

    /**
     * Whether this document's citations may be shown to non-admin users.
     * When false (default), the document is still used for RAG retrieval (admin sees
     * citations + bibliography) but non-admin users see responses with citations stripped.
     * Flip to true ONLY for public-domain / openly-licensed material (Calvino, Spurgeon,
     * Patrística, Gesenius, etc.) or material with an explicit signed license.
     */
    publiclyCitable?: boolean;

    // Phase preference: documents preferred for specific workflow phases
    preferredForPhases?: WorkflowPhase[];

    /**
     * Bible books this resource covers, by canonical id (e.g. ['2PE', 'JUD']
     * for Bauckham WBC; ['HEB'] for Cockerill NICNT). Used by the v1.7
     * paper-corpus smart-match to filter the resource list to those
     * covering the paper's passage's book.
     *
     * Empty array semantics depend on `scope`:
     *   - scope === 'whole-bible' or 'whole-testament' → empty is correct
     *     (the resource covers the whole scope, not specific books)
     *   - scope === 'book' or 'pericope' → empty means UNCLASSIFIED
     *     (UI should nudge the user to fill it in)
     *
     * Optional for legacy resources uploaded before v1.7 — repos return
     * `[]` in that case, callers treat absent + 'book' scope as
     * "unclassified" the same way.
     */
    coversBibleBooks?: ReadonlyArray<BibleBookId>;

    /**
     * Granularity of coverage. See `LibraryResourceScope` for semantics.
     * Optional for legacy resources — repos default to `'book'` (the
     * most common case for a pastor's library) when absent.
     */
    scope?: LibraryResourceScope;

    // Extensible metadata (e.g. for Gemini File URIs)
    metadata?: Record<string, any>;

    /**
     * Marks a resource as a system source — preloaded by the platform
     * (e.g. SBL Greek New Testament critical text), available to every
     * user without consuming their library quota or processing balance.
     * The `userId` field for system sources is the sentinel
     * `SYSTEM_SOURCE_OWNER_ID` so per-user queries skip them; the
     * library service unions user-owned + system-owned resources for
     * UI display.
     *
     * System resources are read-only: the UI hides edit / delete
     * controls and the orchestrator treats them as non-billable.
     */
    isSystemSource?: boolean;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Sentinel `userId` used by every `LibraryResource` flagged as
 * `isSystemSource: true`. The double-underscore prefix is impossible
 * for a Firebase Auth uid, which guarantees no collision with real
 * user-owned resources. Repos query system resources by this
 * sentinel and the library service unions them with the requesting
 * user's own library before rendering.
 */
export const SYSTEM_SOURCE_OWNER_ID = '__system__';

export class LibraryResourceEntity implements LibraryResource {
    public preferredForPhases?: WorkflowPhase[];
    public metadata?: Record<string, any>;
    public coreStores?: ('exegesis' | 'homiletics' | 'generic')[];
    /**
     * Set post-construct via `(entity as any).exegeticalType = …`
     * by the repo deserializer (commit 6 of v1.5). Declared here so
     * `Partial<LibraryResourceEntity>` patches accept it — the class
     * doesn't take it through the constructor because all the v1.5
     * cache fields are owned by deserialization, not creation.
     */
    public exegeticalType?: ExegesisSourceType;
    /**
     * Set at upload time when the user explicitly chose a tier.
     * Persisted to Firestore so the storage-trigger cloud function can
     * read it and respect the user's choice instead of always running
     * the default premium-first cascade.
     */
    public requestedExtractionMode?: 'standard' | 'premium';
    /**
     * v1.7 smart-match metadata. Set either at upload (autocompleted by
     * `inferBibleBooksFromTitle`) or in the metadata editor. Owned by
     * deserialization — not a constructor param.
     */
    public coversBibleBooks?: ReadonlyArray<BibleBookId>;
    public scope?: LibraryResourceScope;
    /**
     * v1.7 Sprint 2 — owned by deserialization. Repos set this when
     * the Firestore doc carries `isSystemSource: true`. UI uses it to
     * render the "system" badge and to suppress edit/delete controls.
     */
    public isSystemSource?: boolean;

    constructor(
        public id: string,
        public userId: string,
        public title: string,
        public author: string,
        public type: ResourceType,
        public storageUrl: string,
        public mimeType: string,
        public sizeBytes: number,
        public textExtractionStatus: TextExtractionStatus = 'pending',
        public textContent?: string,
        public createdAt: Date = new Date(),
        public updatedAt: Date = new Date(),
        preferredForPhases?: WorkflowPhase[],
        metadata?: Record<string, any>,
        public pageCount?: number,
        coreStores?: ('exegesis' | 'homiletics' | 'generic')[]
    ) {
        if (preferredForPhases) {
            this.preferredForPhases = preferredForPhases;
        }
        if (metadata) {
            this.metadata = metadata;
        }
        if (coreStores) {
            this.coreStores = coreStores;
        }
        this.validate();
    }

    private validate(): void {
        if (!this.title || this.title.trim().length < 3) {
            throw new Error('El título del recurso debe tener al menos 3 caracteres');
        }
        // System sources and text-only seeds carry their content
        // inline via `textContent` and don't need a Cloud Storage
        // object. Either is sufficient — require at least one.
        if (!this.storageUrl && !this.textContent) {
            throw new Error('El recurso debe tener una URL de almacenamiento o contenido de texto');
        }
    }

    static create(
        data: Omit<LibraryResource, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): LibraryResourceEntity {
        return new LibraryResourceEntity(
            data.id ?? crypto.randomUUID(),
            data.userId,
            data.title,
            data.author,
            data.type,
            data.storageUrl,
            data.mimeType,
            data.sizeBytes,
            data.textExtractionStatus,
            data.textContent,
            new Date(),
            new Date(),
            data.preferredForPhases,
            data.metadata,
            data.pageCount
        );
    }
}
