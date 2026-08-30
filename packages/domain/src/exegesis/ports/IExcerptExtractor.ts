import type { PassageReference } from '../../bible/canon/passage-reference';
import type { ExcerptSelectionMode, ProjectSourceExcerpt } from '../entities/ProjectSource';

/**
 * Pre-curated retrieval of relevant chunks from indexed library
 * resources, scoped to a paper's passage. Used by the v1.5
 * `ExtractExcerptsForPaperUseCase` to produce the `excerpts` array
 * that powers `mode: 'extracted-excerpts'` sources.
 *
 * Implementations talk to the chunks/embeddings store (today: the
 * `retrieveChunks` cloud function backed by Firestore findNearest).
 * The port stays narrow so the domain doesn't leak knowledge of how
 * retrieval is implemented — the use case only knows "give me the
 * relevant excerpts for this passage from these resources."
 *
 * Errors:
 *   - `ResourcesNotIndexedError` MUST be thrown when any of the
 *     requested `libraryResourceIds` lacks chunks (i.e. its
 *     `ResourceIndexStatus` is anything other than `'indexed'`).
 *     The UI relies on this to gate the "extract" toggle and
 *     surface a precise message instead of silently returning empty.
 */
export interface IExcerptExtractor {
    extract(input: ExtractExcerptsInput): Promise<ExtractExcerptsResult>;
}

export interface ExtractExcerptsInput {
    /**
     * Authenticated user. Required by `retrieveChunks` to scope the
     * search to the user's personal library — admin impersonation is
     * rejected at the callable level.
     */
    userId: string;
    /**
     * The paper's passage. Drives query construction (formatted
     * reference + canonical verse text feed the embedding query).
     */
    passage: PassageReference;
    /**
     * Optional free-text framing the user provided when creating the
     * paper. Concatenated to the query (truncated) to bias retrieval
     * toward the angle the student wants to take. Pass null when the
     * paper has no brief — the extractor falls back to passage-only
     * queries.
     */
    assignmentBrief: string | null;
    /**
     * IDs of library_resources to query. The use case has already
     * verified these belong to the user; the implementation does not
     * re-check ownership but DOES check indexing status and raises
     * `ResourcesNotIndexedError` when any lacks chunks.
     */
    libraryResourceIds: ReadonlyArray<string>;
    /**
     * Maximum excerpts to keep per resource. Each extraction uses
     * `perResourceTopK` against the chunks store so every selected
     * resource contributes its top matches — without this, a single
     * dominant resource could starve the others. Caller-controlled
     * because the UI may surface a slider; the use case defaults to
     * 30 (matches the v1.5 spec cap).
     */
    maxExcerptsPerResource: number;
    /**
     * Optional language hint for the embedding query and any future
     * Flash-based query expansion. Defaults to `'es'` when omitted.
     */
    language?: 'es' | 'en';
}

export interface ExtractExcerptsResult {
    /**
     * Excerpts grouped by `libraryResourceId`. Same shape regardless
     * of `maxExcerptsPerResource` — the implementation guarantees
     * each requested resource appears as a key (with an empty array
     * when retrieval returned nothing for that resource).
     */
    excerptsByResource: Record<string, ReadonlyArray<ProjectSourceExcerpt>>;
    /**
     * The query string actually sent to the embedding model. Stored
     * by the use case as a breadcrumb so the user can later see "the
     * extraction used THIS query" and judge whether to refine.
     */
    queryUsed: string;
    /**
     * Cómo se resolvió cada recurso. Una misma extracción puede mezclar los
     * dos caminos: un comentario con encabezados entra por sección y otro
     * extraído sin estructura cae a semántico, en la misma corrida. La UI y
     * la fuente persistida necesitan el dato POR RECURSO, no por extracción.
     *
     * Opcional para que una implementación que solo hace un camino no tenga
     * que declararlo.
     */
    modeByResource?: Record<string, ExcerptSelectionMode>;
}

/**
 * Thrown by the extractor when one or more requested resources are
 * not in the `'indexed'` state. The use case does NOT catch this —
 * it bubbles up to the UI which renders a "prepare these resources
 * first" panel listing the offending ids.
 */
export class ResourcesNotIndexedError extends Error {
    readonly resourceIds: ReadonlyArray<string>;
    constructor(resourceIds: ReadonlyArray<string>) {
        super(`Resources not indexed: ${resourceIds.join(', ')}`);
        this.name = 'ResourcesNotIndexedError';
        this.resourceIds = resourceIds;
        Object.setPrototypeOf(this, ResourcesNotIndexedError.prototype);
    }
}

/**
 * Narrow probe the extractor uses to decide whether a library
 * resource has chunks (i.e. its `ResourceIndexStatus` is `'indexed'`).
 * Defined here instead of pulling the whole library repository into
 * the extractor — the extractor only needs this one question
 * answered, and the composition root provides an adapter that
 * delegates to `LibraryService.getResourceIndexStatus()`.
 */
export interface IResourceIndexProbe {
    isReady(resourceId: string): Promise<boolean>;
}
