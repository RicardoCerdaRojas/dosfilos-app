/**
 * Phase 2.5 PR B (ADR-028) — Step policy interface.
 *
 * Strategy pattern: each of the 8 steps of the pastoralSeed spine has its
 * own policy class implementing this interface. The orchestrator
 * (`RunSocraticTurnUseCase`) is closed for modification — adding a new
 * step means writing a new policy + registering it; the orchestrator
 * never special-cases by step.
 *
 * Pure interface. No LLM/Firestore deps.
 */

import type { PastoralSeed, PastoralSeedStepKey } from '../../entities/PastoralSeed';
import type {
    MethodErrorReport,
    SocraticTurnOutput,
    StepValidationResult,
    TurnContext,
} from '../SocraticTurn';

export interface IStepPolicy {
    /** Canonical identifier (e.g. `'reading'`). */
    readonly stepKey: PastoralSeedStepKey;

    /**
     * True for steps where the AGENT must NEVER generate content that goes
     * into the seed (`reading`, `timelessPrinciple`, `insight`). For those
     * steps the policy validates structure/length only; the persisted text
     * comes verbatim from the pastor's message.
     */
    readonly isAiGenerationForbidden: boolean;

    /**
     * System prompt for the LLM call. Encodes the step's contract:
     * - what the agent is allowed to do this turn (orient vs confront vs accept)
     * - the validator's thresholds (min chars, min items)
     * - the AI-forbidden rules (no writing the answer, etc.)
     * - the expected JSON output shape
     *
     * Pure (string in / string out) — no I/O.
     */
    buildSystemPrompt(ctx: TurnContext): string;

    /**
     * Parse the LLM's raw JSON reply into a typed `SocraticTurnOutput`.
     * Throws when the reply is malformed.
     *
     * For AI-forbidden steps, the policy MUST ignore any `pastorTextToPersist`
     * the LLM may try to inject — the pastor's message is the source.
     */
    parseLlmReply(raw: string, pastorMessage: string): SocraticTurnOutput;

    /**
     * Pre-LLM validation: does the pastor's raw message meet the step's
     * minimum requirements (length / count / structure)? Reuses the pure
     * validators from `entities/PastoralSeed`.
     *
     * When `valid === false` the orchestrator may still call the LLM for
     * orientation, but never accept.
     */
    validatePastorInput(pastorMessage: string, ctx: TurnContext): StepValidationResult;

    /**
     * Detect a method error in the pastor's message — wrong literary genre
     * for the step, structural misread, exegetical leap. Returns `null`
     * when nothing is detected. Cheap heuristic for short-circuit; the LLM
     * still confronts via the prompt if the heuristic misses.
     */
    detectMethodError(pastorMessage: string, ctx: TurnContext): MethodErrorReport | null;

    /**
     * Build the seed patch that persists this step's value. For AI-forbidden
     * steps the value is the pastor's verbatim message; for assistive steps
     * the policy may shape the data (e.g. parse word studies into the array).
     */
    persistTo(seed: PastoralSeed, pastorMessage: string): Partial<PastoralSeed>;
}
