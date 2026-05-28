/**
 * Phase 2.5 PR B (ADR-028) — Step policy registry.
 *
 * Maps a `PastoralSeedStepKey` to its concrete `IStepPolicy`. Adding a new
 * step = register here + write its policy class. The orchestrator
 * (`RunSocraticTurnUseCase`) only ever depends on this registry interface;
 * it never sees concrete policies (DIP).
 *
 * The default export is a fully-populated registry for the 8-step spine.
 * Tests can inject a partial / mocked registry by constructing a new one.
 */

import { PASTORAL_SEED_STEP_ORDER, type PastoralSeedStepKey } from '../entities/PastoralSeed';
import type { IStepPolicy } from './policies/IStepPolicy';
import { ReadingStepPolicy } from './policies/ReadingStepPolicy';
import { ContextGenreStepPolicy } from './policies/ContextGenreStepPolicy';
import { StructuralAnalysisStepPolicy } from './policies/StructuralAnalysisStepPolicy';
import { WordStudiesStepPolicy } from './policies/WordStudiesStepPolicy';
import { RecognitionStepPolicy } from './policies/RecognitionStepPolicy';
import { FunctionStepPolicy } from './policies/FunctionStepPolicy';
import { TimelessPrincipleStepPolicy } from './policies/TimelessPrincipleStepPolicy';
import { InsightStepPolicy } from './policies/InsightStepPolicy';

export interface IStepPolicyRegistry {
    get(stepKey: PastoralSeedStepKey): IStepPolicy;
    /** Throws when the registry does not cover every step in the canonical order. */
    assertComplete(): void;
}

class StepPolicyRegistry implements IStepPolicyRegistry {
    private readonly map = new Map<PastoralSeedStepKey, IStepPolicy>();

    constructor(policies: IStepPolicy[]) {
        for (const p of policies) {
            this.map.set(p.stepKey, p);
        }
    }

    get(stepKey: PastoralSeedStepKey): IStepPolicy {
        const policy = this.map.get(stepKey);
        if (!policy) {
            throw new Error(`No step policy registered for "${stepKey}".`);
        }
        return policy;
    }

    assertComplete(): void {
        const missing = PASTORAL_SEED_STEP_ORDER.filter((k) => !this.map.has(k));
        if (missing.length > 0) {
            throw new Error(`Step policy registry incomplete: missing ${missing.join(', ')}.`);
        }
    }
}

/** Default registry — eight-step spine, fully populated. */
export function createDefaultStepPolicyRegistry(): IStepPolicyRegistry {
    const registry = new StepPolicyRegistry([
        new ReadingStepPolicy(),
        new ContextGenreStepPolicy(),
        new StructuralAnalysisStepPolicy(),
        new WordStudiesStepPolicy(),
        new RecognitionStepPolicy(),
        new FunctionStepPolicy(),
        new TimelessPrincipleStepPolicy(),
        new InsightStepPolicy(),
    ]);
    registry.assertComplete();
    return registry;
}

export const defaultStepPolicyRegistry: IStepPolicyRegistry = createDefaultStepPolicyRegistry();
