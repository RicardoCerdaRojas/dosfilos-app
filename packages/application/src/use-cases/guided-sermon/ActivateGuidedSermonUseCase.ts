/**
 * Phase 2.5 PR B (ADR-028) — Activate the Faculty Socratic Sermon Agent
 * on an existing chat session.
 *
 * Creates a fresh `pastoralSeed` for the passage, attaches a
 * `GuidedSermonSession` (status: 'active') to the chat session, and
 * appends a templated welcome message that asks for step 1 (Lectura).
 *
 * No LLM call here — the welcome is fully scripted (it's the agent's
 * question, not generated content). LLM calls start on the FIRST pastor
 * reply (handled by `RunSocraticTurnUseCase`).
 */

import {
    createEmptyPastoralSeed,
    createGuidedSermonSession,
    PASTORAL_SEED_STEP_ORDER,
    PASTORAL_SEED_THRESHOLDS,
    type AIChatMessage,
    type GuidedSermonSession,
    type IAIChatRepository,
    type IPastoralSeedRepository,
    type PastoralSeed,
} from '@dosfilos/domain';

export interface ActivateGuidedSermonInput {
    userId: string;
    sessionId: string;
    /** Bible passage the agent will work on (mirrors what the wizard would use). */
    passage: string;
}

export interface ActivateGuidedSermonOutput {
    seed: PastoralSeed;
    guidedSermonSession: GuidedSermonSession;
    welcomeMessage: AIChatMessage;
}

/** Generates an id when the repo expects the caller to provide one. */
function generateId(prefix: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export class ActivateGuidedSermonUseCase {
    constructor(
        private readonly chatRepo: IAIChatRepository,
        private readonly seedRepo: IPastoralSeedRepository,
    ) {}

    async execute(input: ActivateGuidedSermonInput): Promise<ActivateGuidedSermonOutput> {
        if (!input.passage?.trim()) {
            throw new Error('Guided sermon activation requires a passage.');
        }
        const session = await this.chatRepo.getSession(input.userId, input.sessionId);
        if (!session) {
            throw new Error(`Chat session ${input.sessionId} not found for user ${input.userId}.`);
        }
        if (session.guidedSermonSession && session.guidedSermonSession.status === 'active') {
            throw new Error('Guided sermon is already active on this session.');
        }

        // Mint the seed with a placeholder sermonId — when the seed completes
        // the wizard mints the real sermon doc with the same id (one-to-one).
        const sermonId = generateId('srm');
        const empty = createEmptyPastoralSeed({
            id: '', // repo assigns the doc id
            sermonId,
            userId: input.userId,
            passage: input.passage.trim(),
        });
        const seed = await this.seedRepo.create(empty);

        const guidedSermonSession = createGuidedSermonSession({
            seedId: seed.id,
            passage: input.passage.trim(),
        });

        await this.chatRepo.updateGuidedSermonSession(
            input.userId,
            input.sessionId,
            guidedSermonSession,
        );

        const firstStep = PASTORAL_SEED_STEP_ORDER[0]; // 'reading'
        const minChars = PASTORAL_SEED_THRESHOLDS.reading.firstImpressionMinChars;
        const welcomeMessage: AIChatMessage = {
            id: generateId('msg'),
            role: 'model',
            content: `Vamos a construir tu sermón sobre **${input.passage.trim()}** paso a paso. Yo te oriento; tú escribís cada parte con tus palabras.

**Paso 1 de 8 — Lectura.**
Lee el pasaje completo y compartime tu primera impresión: ¿qué te llamó la atención, qué sentiste, qué preguntas surgen? Mínimo ${minChars} caracteres, con tus propias palabras.`,
            timestamp: new Date(),
        };
        await this.chatRepo.addMessageToSession(input.userId, input.sessionId, welcomeMessage);

        // Audit: activation itself is a step-orientation moment (the agent
        // opens with data + ask for the first step). Logged so the "% tuyo"
        // metric in Phase 4 can account for the initial guidance.
        await this.seedRepo.appendAiAssistLog(seed.id, {
            userId: input.userId,
            stepKey: firstStep,
            assistType: 'stepOrientation',
            outputWasEditedByUser: false,
        });

        return { seed, guidedSermonSession, welcomeMessage };
    }
}
