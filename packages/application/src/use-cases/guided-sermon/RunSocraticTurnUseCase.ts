/**
 * Phase 2.5 PR B (ADR-028) — Run one Socratic turn of the guided sermon
 * agent. Thin orchestrator: every step-specific decision lives in its
 * `IStepPolicy`. The use case only coordinates load → detect → call LLM
 * → parse → validate → persist → advance state → log → reply.
 *
 * NO `switch(stepKey)` here. OCP guarantee — adding a step never touches
 * this file.
 */

import {
    advance,
    assertAiAssistAllowed,
    isLastStep,
    PASTORAL_SEED_STEP_ORDER,
    retry,
    type AIChatMessage,
    type AiAssistType,
    type GuidedSermonSession,
    type IAIChatRepository,
    type ILlmClient,
    type IPastoralSeedRepository,
    type IStepPolicyRegistry,
    type PastoralSeed,
    type PastoralSeedStepKey,
    type SocraticTurnOutput,
    type SocraticTurnResult,
    type TurnContext,
} from '@dosfilos/domain';

export interface RunSocraticTurnInput {
    userId: string;
    sessionId: string;
    pastorMessage: string;
}

/** Heuristic confidence threshold for short-circuiting to a confrontation. */
const METHOD_ERROR_CONFIDENCE_THRESHOLD = 0.65;

function generateId(prefix: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Compact summary of completed steps' text for cross-step grounding. */
function buildPriorSteps(seed: PastoralSeed): Partial<Record<PastoralSeedStepKey, string>> {
    return {
        reading: seed.reading?.firstImpression,
        contextGenre: seed.contextGenre?.genreImplication,
        structuralAnalysis: seed.structuralAnalysis?.mainClause?.pastorNote,
        wordStudies: (seed.wordStudies?.studies ?? [])
            .map((s) => `${s.word}: ${s.pastorDiscovery}`)
            .join(' | '),
        recognition: (seed.recognition?.parallels ?? [])
            .map((p) => `${p.reference}: ${p.relevanceNote}`)
            .join(' | '),
        function: seed.function?.originalAudienceFunction,
        timelessPrinciple: seed.timelessPrinciple?.principle,
    };
}

/** Builds a confrontation output directly from a heuristic method-error hit. */
function buildLocalConfrontOutput(
    label: string,
    description: string,
): SocraticTurnOutput {
    return {
        kind: 'confront',
        errorLabel: label,
        agentReply: `Revisemos tu método antes de seguir. ${description}`,
        data: [description],
        questions: [
            '¿Cómo cambia tu lectura cuando aplicas la regla correcta para este paso?',
            '¿Qué del trabajo previo te ayudaría a reformular esta respuesta?',
        ],
    };
}

export class RunSocraticTurnUseCase {
    constructor(
        private readonly chatRepo: IAIChatRepository,
        private readonly seedRepo: IPastoralSeedRepository,
        private readonly llmClient: ILlmClient,
        private readonly registry: IStepPolicyRegistry,
    ) {}

    async execute(input: RunSocraticTurnInput): Promise<SocraticTurnResult> {
        if (!input.pastorMessage?.trim()) {
            throw new Error('Empty pastor message cannot be a Socratic turn.');
        }
        const session = await this.chatRepo.getSession(input.userId, input.sessionId);
        if (!session) throw new Error(`Session ${input.sessionId} not found.`);

        const gss = session.guidedSermonSession;
        if (!gss || gss.status !== 'active') {
            throw new Error('Guided sermon mode is not active on this session.');
        }
        const seed = await this.seedRepo.getById(gss.seedId);
        if (!seed) throw new Error(`Pastoral seed ${gss.seedId} not found.`);

        const policy = this.registry.get(gss.currentStep);
        const ctx: TurnContext = {
            passage: gss.passage,
            currentStep: gss.currentStep,
            pastorDraft: input.pastorMessage,
            attemptIndex: gss.stepAttempts[gss.currentStep] ?? 0,
            genre: seed.contextGenre?.genre || undefined,
            priorSteps: buildPriorSteps(seed),
        };

        // Persist the pastor's user message FIRST so it always appears in chat
        // history regardless of downstream outcome.
        await this.chatRepo.addMessageToSession(input.userId, input.sessionId, {
            id: generateId('msg'),
            role: 'user',
            content: input.pastorMessage,
            timestamp: new Date(),
        });

        // 1. Heuristic method-error short-circuit. Cheap, no LLM call.
        let output: SocraticTurnOutput;
        const heuristicError = policy.detectMethodError(input.pastorMessage, ctx);
        if (heuristicError && heuristicError.confidence >= METHOD_ERROR_CONFIDENCE_THRESHOLD) {
            output = buildLocalConfrontOutput(heuristicError.label, heuristicError.description);
        } else {
            // 2. LLM call — the policy's system prompt encodes the full contract.
            const rawJson = await this.llmClient.generate({
                system: policy.buildSystemPrompt(ctx),
                prompt: input.pastorMessage,
                temperature: 0.3,
                responseMimeType: 'application/json',
            });
            output = policy.parseLlmReply(rawJson, input.pastorMessage);

            // 3. Safety net: domain validator has the final word on acceptance.
            // If the LLM said "accepted" but the validator disagrees, downgrade.
            if (output.kind === 'accepted') {
                const v = policy.validatePastorInput(input.pastorMessage, ctx);
                if (!v.valid) {
                    output = {
                        kind: 'orient',
                        reason: 'validator-disagrees-with-llm',
                        agentReply: 'Antes de avanzar revisemos lo que escribiste — todavía falta para satisfacer este paso.',
                        data: v.reasons,
                        questions: ['¿Qué te falta agregar para cumplir el mínimo del paso?'],
                    };
                }
            }
        }

        // 4. Dispatch on output kind. Single `if` per branch — no switch on stepKey.
        let nextState: GuidedSermonSession;
        let sermonReady = false;
        let assistType: AiAssistType;
        let pastorTextPersisted: string | null = null;

        if (output.kind === 'accepted') {
            const patch = policy.persistTo(seed, output.pastorTextToPersist);
            await this.seedRepo.update(seed.id, patch);
            nextState = advance(gss);
            sermonReady = nextState.status === 'completed';
            assistType = 'socraticGuidance';
            pastorTextPersisted = output.pastorTextToPersist;
        } else if (output.kind === 'confront') {
            nextState = retry(gss);
            assistType = 'socraticConfrontation';
        } else {
            nextState = retry(gss);
            assistType = 'stepOrientation';
        }

        await this.chatRepo.updateGuidedSermonSession(
            input.userId,
            input.sessionId,
            nextState,
        );

        // 5. Append the agent's reply. For accepted turns we add a brief
        // transition prompt for the next step (or the completion CTA).
        const agentMessage: AIChatMessage = {
            id: generateId('msg'),
            role: 'model',
            content: this.composeAgentReply(output, nextState, sermonReady),
            timestamp: new Date(),
        };
        await this.chatRepo.addMessageToSession(input.userId, input.sessionId, agentMessage);

        // 6. Audit. Validation-tier assists are allowed on every step
        // (including reading + insight) by ADR-028.
        assertAiAssistAllowed(gss.currentStep, assistType);
        await this.seedRepo.appendAiAssistLog(seed.id, {
            userId: input.userId,
            stepKey: gss.currentStep,
            assistType,
            // Accepted = pastor wrote the persisted content (never edited by
            // the LLM); orient/confront = no persist. Either way the pastor's
            // voice stayed intact → `outputWasEditedByUser` semantics are N/A
            // for these tiers; we record `false` as the conservative default.
            outputWasEditedByUser: false,
        });

        // 7. Suppress unused warning while reserving the variable for Phase 4
        // ("% tuyo" needs a denominator of persisted-by-pastor text).
        void pastorTextPersisted;

        return {
            output,
            nextStep: nextState.currentStep,
            sermonReady,
            stepAttempts: nextState.stepAttempts,
        };
    }

    /**
     * Composes the agent's chat reply message. For `accepted`, adds a
     * transition to the next step (or a completion CTA on the last). For
     * `orient`/`confront`, just surfaces the LLM's pastoral reply + data +
     * questions in a compact block.
     */
    private composeAgentReply(
        output: SocraticTurnOutput,
        nextState: GuidedSermonSession,
        sermonReady: boolean,
    ): string {
        if (output.kind === 'accepted') {
            if (sermonReady) {
                return `${output.agentReply}\n\n¡Tu sermón está listo! Has completado los 8 pasos del estudio. Hacé click en **"Pasar al sermón"** para abrir el wizard y comenzar la homilética.`;
            }
            const nextIdx = PASTORAL_SEED_STEP_ORDER.indexOf(nextState.currentStep) + 1;
            return `${output.agentReply}\n\n**Paso ${nextIdx} de 8 — ${stepDisplayName(nextState.currentStep)}.**\nContinuemos.`;
        }
        // orient / confront — render data + questions
        const dataBlock = output.data.length > 0
            ? `\n\nDatos para considerar:\n${output.data.map((d) => `- ${d}`).join('\n')}`
            : '';
        const questionsBlock = output.questions.length > 0
            ? `\n\nPreguntas para pensar:\n${output.questions.map((q) => `- ${q}`).join('\n')}`
            : '';
        return `${output.agentReply}${dataBlock}${questionsBlock}`;
    }
}

const STEP_NAMES: Record<PastoralSeedStepKey, string> = {
    reading: 'Lectura',
    contextGenre: 'Contexto y Género',
    structuralAnalysis: 'Análisis Estructural',
    wordStudies: 'Estudio de Palabras',
    recognition: 'Reconocimiento canónico',
    function: 'Función para la audiencia original',
    timelessPrinciple: 'Principio Atemporal',
    insight: 'Insight',
};

function stepDisplayName(key: PastoralSeedStepKey): string {
    return STEP_NAMES[key];
}

// Re-export `isLastStep` if needed by callers (kept here as an explicit
// import to make the SRP boundary visible — this use case checks it
// internally via `advance` setting `status: 'completed'`).
void isLastStep;
