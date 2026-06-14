import { describe, it, expect, vi } from 'vitest';
import type { IAIChatRepository, IPastoralSeedRepository, PastoralSeed } from '@dosfilos/domain';
import { SubmitGuidedInsightUseCase } from '../SubmitGuidedInsightUseCase';

const LONG = (n: number) => 'a'.repeat(n);

function makeSeed(): PastoralSeed {
    return {
        id: 'seed-1',
        sermonId: 'srm-1',
        userId: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
        passage: 'Juan 1:1',
        reading: { firstImpression: LONG(120), timeSpentSeconds: 0 },
        contextGenre: { genre: 'epistle', genreConfirmed: true, genreImplication: LONG(120), bookLocationNote: '', historicalContextConsulted: true, timeSpentSeconds: 0 },
        structuralAnalysis: { mainClause: { reference: 'Juan 1:1', pastorNote: LONG(120) }, timeSpentSeconds: 0 },
        wordStudies: { studies: [{ word: 'logos', reference: 'Juan 1:1', pastorDiscovery: LONG(60) }], timeSpentSeconds: 0 },
        recognition: { parallels: [{ reference: 'Col 1:16', relevanceNote: LONG(60) }, { reference: 'Heb 1:2', relevanceNote: LONG(60) }], timeSpentSeconds: 0 },
        function: { originalAudienceFunction: LONG(120), timeSpentSeconds: 0 },
        timelessPrinciple: { principle: LONG(120), timeSpentSeconds: 0 },
        insight: { centralIdea: '', observations: [], openQuestion: '', pastoralAnecdote: '', doxologicalApplication: '', pasteEvents: [], timeSpentSeconds: 0 },
        totalTimeSeconds: 0,
        toolsConsulted: [],
        completed: false,
    } as PastoralSeed;
}

function makeRepos(seed: PastoralSeed) {
    const chatRepo = {
        getSession: vi.fn(async () => ({
            id: 's1',
            guidedSermonSession: { seedId: seed.id, currentStep: 'insight', status: 'active', stepAttempts: {}, startedAt: new Date() },
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

const validInsight = {
    centralIdea: LONG(60),
    observations: [LONG(60), LONG(60), LONG(60)],
    openQuestion: LONG(60),
    pastoralAnecdote: LONG(120),
    doxologicalApplication: LONG(120),
};

describe('SubmitGuidedInsightUseCase', () => {
    it('acepta insight válido: persiste estructurado + avanza + 2 mensajes', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed);
        const uc = new SubmitGuidedInsightUseCase(chatRepo, seedRepo);
        const res = await uc.execute({
            userId: 'u1', sessionId: 's1', insight: validInsight,
            renderedInsightText: 'Idea central: ...', affirmationText: 'Recibido.',
        });
        expect(res.accepted).toBe(true);
        // Persistió el insight ESTRUCTURADO (no vacío, sin re-parsear texto).
        const updateArg = (seedRepo.update as any).mock.calls[0][1];
        expect(updateArg.insight.centralIdea).toBe(validInsight.centralIdea);
        expect(updateArg.insight.observations).toEqual(validInsight.observations);
        // `completed` se computa con evaluatePastoralSeed (boolean derivado).
        expect(typeof updateArg.completed).toBe('boolean');
        // Avanzó la sesión + agregó pastor + afirmación.
        expect(chatRepo.updateGuidedSermonSession).toHaveBeenCalled();
        expect((chatRepo.addMessageToSession as any).mock.calls.length).toBe(2);
    });

    it('rechaza insight inválido: no persiste, devuelve reasons', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed);
        const uc = new SubmitGuidedInsightUseCase(chatRepo, seedRepo);
        const res = await uc.execute({
            userId: 'u1', sessionId: 's1',
            insight: { ...validInsight, centralIdea: 'corto' },
            renderedInsightText: 'x', affirmationText: 'y',
        });
        expect(res.accepted).toBe(false);
        expect(res.reasons.length).toBeGreaterThan(0);
        expect(seedRepo.update).not.toHaveBeenCalled();
        expect(chatRepo.updateGuidedSermonSession).not.toHaveBeenCalled();
    });
});
