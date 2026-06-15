/**
 * Paso 4 (Estudio de Palabras) ESTRUCTURADO — submit directo de la lista de
 * estudios desde el formulario, sin texto + re-parseo. El pastor arma la lista
 * {palabra, referencia, descubrimiento} (con la ayuda léxica del helper) y la
 * envía completa. Validamos DETERMINISTAMENTE (`validateWordStudies`) y, si
 * pasa, persistimos estructurado + avanzamos al paso 5.
 *
 * NO es el último paso (insight lo es) → al avanzar la sesión sigue 'active'.
 * Reusa la fuente única de verdad: `completed` con `evaluatePastoralSeed`.
 */

import {
    advance,
    evaluatePastoralSeed,
    validateWordStudies,
    type AIChatMessage,
    type IAIChatRepository,
    type IPastoralSeedRepository,
    type WordStudy,
} from '@dosfilos/domain';

function genId(prefix: string): string {
    try {
        return `${prefix}_${crypto.randomUUID()}`;
    } catch {
        return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    }
}

export interface SubmitGuidedWordStudiesInput {
    userId: string;
    sessionId: string;
    /** Estudios estructurados que el pastor armó en el formulario. */
    studies: Array<{ word: string; reference: string; pastorDiscovery: string }>;
    renderedText: string;
    affirmationText: string;
}

export interface SubmitGuidedWordStudiesResult {
    accepted: boolean;
    reasons: string[];
    advancedTo: string | null;
}

export class SubmitGuidedWordStudiesUseCase {
    constructor(
        private readonly chatRepo: IAIChatRepository,
        private readonly seedRepo: IPastoralSeedRepository,
    ) {}

    async execute(input: SubmitGuidedWordStudiesInput): Promise<SubmitGuidedWordStudiesResult> {
        const session = await this.chatRepo.getSession(input.userId, input.sessionId);
        const gss = session?.guidedSermonSession;
        if (!gss) throw new Error('No hay sesión de sermón guiado activa.');
        if (gss.currentStep !== 'wordStudies') {
            throw new Error(`El paso actual no es Estudio de Palabras (es "${gss.currentStep}").`);
        }
        const seed = await this.seedRepo.getById(gss.seedId);
        if (!seed) throw new Error('Semilla no encontrada.');

        const studies: WordStudy[] = input.studies
            .map((s) => ({
                word: s.word.trim(),
                reference: s.reference.trim(),
                pastorDiscovery: s.pastorDiscovery.trim(),
            }))
            .filter((s) => s.word || s.reference || s.pastorDiscovery);

        const validation = validateWordStudies({ studies, timeSpentSeconds: 0 });
        if (!validation.valid) {
            return { accepted: false, reasons: validation.reasons, advancedTo: null };
        }

        const merged = { ...seed, wordStudies: { ...seed.wordStudies, studies } };
        const completed = evaluatePastoralSeed(merged).completed;
        const now = new Date();
        await this.seedRepo.update(seed.id, {
            wordStudies: { ...seed.wordStudies, studies, completedAt: now },
            completed,
            ...(completed ? { completedAt: now } : {}),
        });

        const nextState = advance(gss);
        await this.chatRepo.updateGuidedSermonSession(input.userId, input.sessionId, nextState);

        const pastorMessage: AIChatMessage = {
            id: genId('msg'),
            role: 'user',
            content: input.renderedText,
            timestamp: now,
        };
        await this.chatRepo.addMessageToSession(input.userId, input.sessionId, pastorMessage);
        const agentMessage: AIChatMessage = {
            id: genId('msg'),
            role: 'model',
            content: input.affirmationText,
            timestamp: new Date(),
        };
        await this.chatRepo.addMessageToSession(input.userId, input.sessionId, agentMessage);

        await this.seedRepo.appendAiAssistLog(seed.id, {
            userId: input.userId,
            stepKey: 'wordStudies',
            assistType: 'socraticGuidance',
            outputWasEditedByUser: false,
        });

        return { accepted: true, reasons: [], advancedTo: nextState.currentStep };
    }
}
