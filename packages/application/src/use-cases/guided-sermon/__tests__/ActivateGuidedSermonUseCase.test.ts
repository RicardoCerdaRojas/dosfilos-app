import { describe, it, expect, vi } from 'vitest';
import type { IAIChatRepository, IPastoralSeedRepository, PastoralSeed } from '@dosfilos/domain';
import {
    ActivateGuidedSermonUseCase,
    GUIDED_SERMON_INVALID_PASSAGE,
} from '../ActivateGuidedSermonUseCase';

function makeRepos() {
    const chatRepo = {
        getSession: vi.fn(async () => ({ id: 's1', messages: [] })),
        addMessageToSession: vi.fn(async () => {}),
        updateGuidedSermonSession: vi.fn(async () => {}),
        renameSession: vi.fn(async () => {}),
    } as unknown as IAIChatRepository;
    const seedRepo = {
        // Echo the created seed back with an assigned id.
        create: vi.fn(async (seed: PastoralSeed) => ({ ...seed, id: 'seed-1' })),
        appendAiAssistLog: vi.fn(async () => {}),
    } as unknown as IPastoralSeedRepository;
    return { chatRepo, seedRepo };
}

describe('ActivateGuidedSermonUseCase — passage validation (D)', () => {
    it('rejects an unrecognized book (typo) with the stable invalid-passage code', async () => {
        const { chatRepo, seedRepo } = makeRepos();
        const uc = new ActivateGuidedSermonUseCase(chatRepo, seedRepo);
        await expect(
            uc.execute({ userId: 'u1', sessionId: 's1', passage: '1 Cotintios 7:29-31' }),
        ).rejects.toThrow(GUIDED_SERMON_INVALID_PASSAGE);
        // No seed should be minted for a bad passage.
        expect(seedRepo.create).not.toHaveBeenCalled();
    });

    it('infers the genre for a recognized passage and seeds it', async () => {
        const { chatRepo, seedRepo } = makeRepos();
        const uc = new ActivateGuidedSermonUseCase(chatRepo, seedRepo);
        const out = await uc.execute({ userId: 'u1', sessionId: 's1', passage: '1 Corintios 7:29-31' });
        expect(out.seed.contextGenre?.genre).toBe('epistle');
        expect(seedRepo.create).toHaveBeenCalledTimes(1);
    });
});

/**
 * Superficie de creación: los dos spines escriben la misma colección, así que
 * cada creador debe declarar por dónde entró el pastor. Sin esto la medición
 * vuelve a los proxies — y el proxy ya mintió una vez (cohorte de agosto: "0
 * estudios por el wizard" cuando el wizard sí se usaba).
 */
describe('ActivateGuidedSermonUseCase — origin', () => {
    it('el estudio nacido del chat guiado queda marcado como socrático', async () => {
        const { chatRepo, seedRepo } = makeRepos();
        const uc = new ActivateGuidedSermonUseCase(chatRepo, seedRepo);
        const out = await uc.execute({ userId: 'u1', sessionId: 's1', passage: '1 Corintios 7:29-31' });
        expect(out.seed.origin).toBe('socratic');
    });
});
