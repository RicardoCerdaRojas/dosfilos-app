import { describe, it, expect, vi } from 'vitest';
import {
    createDefaultStepPolicyRegistry,
    type IAIChatRepository,
    type ILlmClient,
    type IPastoralSeedRepository,
    type PastoralSeed,
} from '@dosfilos/domain';
import { RunSocraticTurnUseCase } from '../RunSocraticTurnUseCase';

/**
 * Contrato de la heurística de error de método (decisión del fundador,
 * 2026-08-21): OBSERVA, NO BLOQUEA — en las dos superficies.
 *
 * Estos tests existen porque el cambio que los motivó no rompió NI UNO de los
 * tests que había: la heurística trababa el turno y nadie lo cubría. El
 * comportamiento anterior podía cambiarse sin que CI dijera nada.
 */

const LONG = (n: number) => 'a'.repeat(n);

function makeSeed(): PastoralSeed {
    return {
        id: 'seed-1',
        sermonId: 'srm-1',
        userId: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
        passage: 'Romanos 8:1-4',
        reading: { firstImpression: LONG(120), timeSpentSeconds: 0 },
        contextGenre: { genre: 'epistle', genreConfirmed: true, genreProvenance: 'aiProposed', genreImplication: LONG(120), bookLocationNote: '', historicalContextConsulted: true, timeSpentSeconds: 0 },
        structuralAnalysis: { mainClause: { reference: '', pastorNote: '' }, timeSpentSeconds: 0 },
        wordStudies: { studies: [], timeSpentSeconds: 0 },
        recognition: { parallels: [], timeSpentSeconds: 0 },
        function: { originalAudienceFunction: '', timeSpentSeconds: 0 },
        timelessPrinciple: { principle: '', timeSpentSeconds: 0 },
        insight: { centralIdea: '', observations: [], openQuestion: '', pastoralAnecdote: '', doxologicalApplication: '', pasteEvents: [], timeSpentSeconds: 0 },
        totalTimeSeconds: 0,
        toolsConsulted: [],
        completed: false,
    } as PastoralSeed;
}

function makeRepos(seed: PastoralSeed, currentStep: string) {
    const chatRepo = {
        getSession: vi.fn(async () => ({
            id: 's1',
            guidedSermonSession: { seedId: seed.id, currentStep, status: 'active', stepAttempts: {}, startedAt: new Date() },
            messages: [],
        })),
        addMessageToSession: vi.fn(async () => {}),
        updateGuidedSermonSession: vi.fn(async () => {}),
    } as unknown as IAIChatRepository;
    const seedRepo = {
        getById: vi.fn(async () => seed),
        update: vi.fn(async () => {}),
        appendAiAssistLog: vi.fn(async () => {}),
    } as unknown as IPastoralSeedRepository;
    return { chatRepo, seedRepo };
}

/** El LLM acepta: así se ve si la heurística impide avanzar o no. */
const acceptLlm: ILlmClient = {
    generate: async () =>
        JSON.stringify({ kind: 'accepted', agentReply: 'Buen trabajo.', pastorTextToPersist: LONG(120) }),
};

const registry = createDefaultStepPolicyRegistry();
const baseInput = { userId: 'u1', sessionId: 's1' };

describe('heurística de error de método — observa, no bloquea', () => {
    it('paso 3 con léxico de morfología: acepta igual y adjunta la observación', async () => {
        // "genitivo" es léxico/morfología (paso 4), no estructura. Antes esto
        // trababa el turno con un `confront`.
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, 'structuralAnalysis');
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, acceptLlm, registry);
        const res = await uc.execute({
            ...baseInput,
            pastorMessage: `Romanos 8:1 — la cláusula principal usa un genitivo aquí. ${LONG(80)}`,
        });
        expect(res.output.kind).toBe('accepted');
        expect(res.output.agentReply).toMatch(/observación de método/i);
        expect(res.output.agentReply).toMatch(/genitivo/);
        expect(res.output.agentReply).toMatch(/Tú decides/);
    });

    it('paso 6 con salto a aplicación moderna: acepta igual y adjunta la observación', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, 'function');
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, acceptLlm, registry);
        const res = await uc.execute({
            ...baseInput,
            pastorMessage: `Esto me dice a mí que confíe. ${LONG(120)}`,
        });
        expect(res.output.kind).toBe('accepted');
        expect(res.output.agentReply).toMatch(/aplicación moderna/i);
    });

    it('sin error de método, la respuesta queda limpia (no se cuela la nota)', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, 'structuralAnalysis');
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, acceptLlm, registry);
        const res = await uc.execute({
            ...baseInput,
            pastorMessage: `Romanos 8:1 — la cláusula principal gobierna el resto del argumento. ${LONG(80)}`,
        });
        expect(res.output.kind).toBe('accepted');
        expect(res.output.agentReply).not.toMatch(/observación de método/i);
    });

    it('lo determinista SÍ sigue bloqueando: mensaje corto no avanza aunque el LLM acepte', async () => {
        // La red de seguridad del validador es lo que traba, y no se tocó.
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, 'function');
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, acceptLlm, registry);
        const res = await uc.execute({ ...baseInput, pastorMessage: 'corto' });
        expect(res.output.kind).toBe('orient');
        expect(res.nextStep).toBe('function');
    });
});
