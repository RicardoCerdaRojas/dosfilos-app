import { describe, it, expect, vi } from 'vitest';
import type { IAIChatRepository, IPastoralSeedRepository, PastoralSeed } from '@dosfilos/domain';
import { SubmitGuidedWordStudiesUseCase } from '../SubmitGuidedWordStudiesUseCase';

const seed = { id: 'seed-1', sermonId: 'srm-1', userId: 'u1', passage: 'Juan 1:1', wordStudies: { studies: [], timeSpentSeconds: 0 } } as unknown as PastoralSeed;

function makeRepos() {
    const chatRepo = {
        getSession: vi.fn(async () => ({
            id: 's1',
            guidedSermonSession: { seedId: 'seed-1', currentStep: 'wordStudies', status: 'active', stepAttempts: {}, startedAt: new Date() },
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

const valid = [
    { word: 'logos', reference: 'Juan 1:1', pastorDiscovery: 'a'.repeat(40) },
    { word: 'theos', reference: 'Juan 1:1', pastorDiscovery: 'b'.repeat(40) },
];

describe('SubmitGuidedWordStudiesUseCase', () => {
    it('acepta lista válida: persiste estructurado + avanza + 2 mensajes', async () => {
        const { chatRepo, seedRepo } = makeRepos();
        const uc = new SubmitGuidedWordStudiesUseCase(chatRepo, seedRepo);
        const res = await uc.execute({ userId: 'u1', sessionId: 's1', studies: valid, renderedText: 'x', affirmationText: 'y' });
        expect(res.accepted).toBe(true);
        const updateArg = (seedRepo.update as any).mock.calls[0][1];
        expect(updateArg.wordStudies.studies).toHaveLength(2);
        expect(updateArg.wordStudies.studies[0].pastorDiscovery).toBe(valid[0].pastorDiscovery);
        expect(res.advancedTo).toBe('recognition'); // paso 5
        expect((chatRepo.addMessageToSession as any).mock.calls.length).toBe(2);
    });

    it('rechaza < mínimo o descubrimiento corto: no persiste', async () => {
        const { chatRepo, seedRepo } = makeRepos();
        const uc = new SubmitGuidedWordStudiesUseCase(chatRepo, seedRepo);
        const res = await uc.execute({ userId: 'u1', sessionId: 's1', studies: [{ word: 'logos', reference: 'Juan 1:1', pastorDiscovery: 'corto' }], renderedText: 'x', affirmationText: 'y' });
        expect(res.accepted).toBe(false);
        expect(res.reasons.length).toBeGreaterThan(0);
        expect(seedRepo.update).not.toHaveBeenCalled();
    });
});
