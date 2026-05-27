import type { PastoralSeed } from '../entities/PastoralSeed';

/**
 * Reads + mutates pastoralSeeds documents. ADR-015 defines the storage
 * as the top-level collection `pastoralSeeds/{seedId}` keyed by an
 * auto-generated id; `sermonId` is the natural lookup field.
 *
 * The wizard autosaves via `update`; the inspector lists by `userId`.
 * Phase 5 will add a `listByProject(projectId)` method when the
 * `Project` entity lands — kept off the interface for now to avoid
 * forward-referencing a non-existent type.
 */
export interface IPastoralSeedRepository {
    /**
     * Returns the most recently updated seed for the given sermon.
     * The wizard treats sermons as 1:1 with seeds in Phase 1, but the
     * `orderBy updatedAt desc + limit 1` guards against duplicates that
     * could arise from a race during creation.
     */
    findBySermonId(sermonId: string): Promise<PastoralSeed | null>;
    getById(seedId: string): Promise<PastoralSeed | null>;
    /**
     * Persists a freshly minted seed. Returns the same document with
     * server-assigned timestamps when the implementation uses
     * Firestore `serverTimestamp`.
     */
    create(seed: PastoralSeed): Promise<PastoralSeed>;
    /**
     * Partial update keyed by `seedId`. Only the supplied fields are
     * written; `updatedAt` is always bumped server-side.
     */
    update(seedId: string, patch: Partial<PastoralSeed>): Promise<void>;
    /**
     * Audit list — used by the admin inspector + future depth-of-study
     * metrics. Ordered by `updatedAt desc` so the most-recent work
     * surfaces first.
     */
    listByUserId(userId: string, opts?: { limit?: number }): Promise<PastoralSeed[]>;
}
