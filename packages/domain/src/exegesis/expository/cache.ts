import type { BibleBookId } from '../../bible/canon/BibleCanon';
import type { BookPanorama } from './BookPanorama';
import type { ExegeticalUnit } from './ExegeticalUnit';
import type { MacroSection } from './MacroSection';

/**
 * Server-side cache for the structural passes of the expository
 * pipeline (Pases 1-3: panorama, macroestructura, microestructura).
 *
 * Why only Pases 1-3:
 *   These passes produce CANONICAL CONTENT — given a book + display
 *   language, the syntactic and structural analysis should be the
 *   same for every pastor. Two pastors studying Filemón in Spanish
 *   deserve the same panorama and macro structure; that's what the
 *   methodology delivers. Caching them globally saves the Pro 2.5
 *   tokens for every pastor after the first run on each book.
 *
 * Why NOT Pases 4-5:
 *   Pase 4 (preachable conversion) involves homiletical
 *   interpretation: combine/split decisions, propositional
 *   register, target sermon count. Each pastor's series should
 *   reflect their own decisions; caching those would homogenize
 *   sermon plans across users in a way the methodology actively
 *   resists.
 *   Pase 5 (fidelity review) depends on Pase 4 output, so caching
 *   it follows the same logic.
 *
 * Cache key:
 *   `(bookId, displayLanguage, pipelineVersion)`. Pipeline version
 *   change auto-invalidates by changing the document id; a fresh
 *   doc is written on the next run.
 *
 * Trust model:
 *   The cache document, when populated, is internally consistent
 *   (panorama → macros → micros were produced by a single pipeline
 *   run). Readers can trust it without re-validating each layer
 *   against the others.
 *
 * Permissions (Firestore rules expectation):
 *   - read: any authenticated user (canonical content, not personal)
 *   - write: server-side only (Cloud Function or admin SDK) to
 *     prevent malicious cache poisoning. Web client writes via the
 *     repo will go through a callable function in the long term;
 *     for v1.6 the rules can allow authenticated writes since
 *     content is bounded by the LLM output schema.
 */
export interface IExpositoryAssistantCacheRepository {
    /**
     * Returns the cached entry for a book+language+version, or null
     * when no entry exists. Implementations should be cheap (single
     * Firestore read by id) — used on the hot path of every pass.
     */
    get(
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
    ): Promise<ExpositoryAssistantCacheEntry | null>;

    /**
     * Upserts the panorama field on the cache document. Creates the
     * document if it doesn't exist, otherwise patches just the
     * panorama-related fields without touching macro/micro data.
     */
    upsertPanorama(
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
        panorama: BookPanorama,
        modelId: string,
        passVersion: string,
    ): Promise<void>;

    /**
     * Upserts the macroSections field. The document should already
     * have a panorama (otherwise the macro pass shouldn't have run);
     * implementations may treat a missing document as an error or
     * silently create one with macros only — the consumer doesn't
     * care.
     */
    upsertMacro(
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
        macroSections: MacroSection[],
        passVersion: string,
    ): Promise<void>;

    /** Same as upsertMacro for the exegeticalUnits (Pase 3) field. */
    upsertMicro(
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
        exegeticalUnits: ExegeticalUnit[],
        passVersion: string,
    ): Promise<void>;

    /**
     * Atomically increments the hit counter and updates lastHitAt.
     * Fire-and-forget from the consumer's perspective; failures are
     * non-fatal (the cache hit value already returned).
     */
    recordHit(
        bookId: BibleBookId,
        displayLanguage: 'es' | 'en',
        pipelineVersion: string,
        pass: 'panorama' | 'macro' | 'micro',
    ): Promise<void>;
}

/**
 * Shape of a cache document. All pass payloads are optional because
 * a document may be partially populated (e.g. pastor cancelled
 * before Pase 3 ran). The decorator wrapping the assistant only
 * returns a cached value when the corresponding field is present.
 */
export interface ExpositoryAssistantCacheEntry {
    bookId: BibleBookId;
    displayLanguage: 'es' | 'en';
    pipelineVersion: string;

    /** Pase 1 cached output. */
    panorama?: BookPanorama;
    panoramaModelId?: string;
    panoramaPassVersion?: string;
    panoramaCachedAt?: Date;

    /** Pase 2 cached output. */
    macroSections?: MacroSection[];
    macroPassVersion?: string;
    macroCachedAt?: Date;

    /** Pase 3 cached output. */
    exegeticalUnits?: ExegeticalUnit[];
    microPassVersion?: string;
    microCachedAt?: Date;

    /**
     * Per-pass hit counters for cost accounting and "what books are
     * popular" analytics. The decorator increments these
     * fire-and-forget.
     */
    hits?: {
        panorama?: number;
        macro?: number;
        micro?: number;
    };
    lastHitAt?: Date;

    /** When the document was first created. Useful for TTL audits. */
    createdAt?: Date;
}
