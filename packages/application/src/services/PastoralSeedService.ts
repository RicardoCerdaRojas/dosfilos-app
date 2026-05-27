import {
    createEmptyPastoralSeed,
    evaluatePastoralSeed,
    IPastoralSeedRepository,
    PASTORAL_SEED_STEP_ORDER,
    PastoralSeed,
    PastoralSeedEvaluation,
    PastoralSeedStepKey,
    PasteEvent,
    ToolUsage,
    WordStudy,
} from '@dosfilos/domain';
import { FirestorePastoralSeedRepository } from '@dosfilos/infrastructure';

/**
 * Orchestrates pastoralSeeds reads + writes used by the wizard.
 *
 * Owns the "first-touch creation" flow: when the wizard's `Step 1`
 * enters for a given sermon and no seed exists yet, `ensureForSermon`
 * mints an empty one. Subsequent autosaves call `update` directly
 * through this service so we can keep cross-cutting logic (audit
 * timestamps, `completed` evaluation, tool tracking) in one place.
 */
export class PastoralSeedService {
    constructor(private readonly repo: IPastoralSeedRepository) {}

    async getBySermonId(sermonId: string): Promise<PastoralSeed | null> {
        return this.repo.findBySermonId(sermonId);
    }

    async getById(seedId: string): Promise<PastoralSeed | null> {
        return this.repo.getById(seedId);
    }

    async listByUserId(userId: string, opts?: { limit?: number }): Promise<PastoralSeed[]> {
        return this.repo.listByUserId(userId, opts);
    }

    /**
     * Returns the existing seed for the sermon or mints + persists a
     * fresh one. Safe to call repeatedly — the underlying `findBySermonId`
     * short-circuits on hit.
     */
    async ensureForSermon(args: {
        sermonId: string;
        userId: string;
        passage: string;
        projectId?: string;
    }): Promise<PastoralSeed> {
        const existing = await this.repo.findBySermonId(args.sermonId);
        if (existing) return existing;
        const empty = createEmptyPastoralSeed({
            id: '', // repo assigns it
            sermonId: args.sermonId,
            userId: args.userId,
            passage: args.passage,
            projectId: args.projectId,
        });
        return this.repo.create(empty);
    }

    /**
     * Persists an arbitrary patch + recomputes `completed` from the
     * full merged state. Callers pass the in-memory seed they already
     * have to avoid a redundant fetch on every autosave tick.
     */
    async savePatch(args: {
        seed: PastoralSeed;
        patch: Partial<PastoralSeed>;
    }): Promise<{ completed: boolean; evaluation: PastoralSeedEvaluation }> {
        const merged: PastoralSeed = { ...args.seed, ...args.patch };
        const evaluation = evaluatePastoralSeed(merged);
        const wasCompletedBefore = args.seed.completed === true;
        const completedAtPatch = !wasCompletedBefore && evaluation.completed
            ? { completedAt: new Date() }
            : {};
        await this.repo.update(args.seed.id, {
            ...args.patch,
            completed: evaluation.completed,
            ...completedAtPatch,
        });
        return { completed: evaluation.completed, evaluation };
    }

    /**
     * Append-only tool usage log. Wizard sub-steps call this when the
     * pastor opens Greek tutor / cross-ref / Faculty histórico from
     * inside the step so the audit panel reflects what was consulted.
     */
    async appendToolUsage(args: {
        seed: PastoralSeed;
        tool: ToolUsage;
    }): Promise<void> {
        const next = [...(args.seed.toolsConsulted ?? []), args.tool];
        await this.repo.update(args.seed.id, { toolsConsulted: next });
    }

    /**
     * Append-only paste event log on InsightStep AI-forbidden fields.
     * Never blocks; the wizard simply logs and renders the disuasoria copy.
     */
    async appendPasteEvent(args: {
        seed: PastoralSeed;
        event: PasteEvent;
    }): Promise<void> {
        const insight = args.seed.insight;
        const next = {
            ...insight,
            pasteEvents: [...(insight.pasteEvents ?? []), args.event],
        };
        await this.repo.update(args.seed.id, { insight: next });
    }

    /**
     * Helper for the morphology step — pushes a word study into the
     * existing array without forcing the UI to handle merge logic.
     */
    async addWordStudy(args: { seed: PastoralSeed; study: WordStudy }): Promise<void> {
        const next = {
            ...args.seed.morphology,
            wordStudies: [...(args.seed.morphology?.wordStudies ?? []), args.study],
        };
        await this.repo.update(args.seed.id, { morphology: next });
    }

    /**
     * Convenience evaluation for code paths that already hold the seed
     * (gate hook, audit panel, prompt builder). Re-exports the pure
     * function from the domain so callers don't need to import both.
     */
    evaluate(seed: PastoralSeed): PastoralSeedEvaluation {
        return evaluatePastoralSeed(seed);
    }

    /** Stable step order — re-exported for breadcrumb consumers. */
    static stepOrder(): readonly PastoralSeedStepKey[] {
        return PASTORAL_SEED_STEP_ORDER;
    }
}

export const pastoralSeedService = new PastoralSeedService(new FirestorePastoralSeedRepository());
