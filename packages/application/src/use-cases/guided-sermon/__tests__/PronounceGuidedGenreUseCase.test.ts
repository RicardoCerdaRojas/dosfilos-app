import { describe, it, expect, vi } from 'vitest';
import { PronounceGuidedGenreUseCase } from '../PronounceGuidedGenreUseCase';
import type { IPastoralSeedRepository, PastoralSeed } from '@dosfilos/domain';

/**
 * Redacción v2 0b-B (§4.4) — el acto del pastor sobre el género en el paso 2
 * guiado. Lo que importa: qué se ESCRIBE en el seed y cuándo NO se escribe nada.
 */

const seed = {
    id: 'seed_1',
    contextGenre: {
        genre: 'epistle',
        genreConfirmed: true,
        genreProvenance: 'aiProposed',
        genreImplication: 'texto previo del pastor',
        bookLocationNote: '',
        historicalContextConsulted: false,
        timeSpentSeconds: 42,
    },
} as unknown as PastoralSeed;

function makeRepo(found: PastoralSeed | null = seed) {
    return {
        getById: vi.fn().mockResolvedValue(found),
        update: vi.fn().mockResolvedValue(undefined),
    } as unknown as IPastoralSeedRepository & { getById: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
}

describe('PronounceGuidedGenreUseCase', () => {
    it('elegir la propuesta → userConfirmed persistido', async () => {
        const repo = makeRepo();
        const result = await new PronounceGuidedGenreUseCase(repo).execute({
            seedId: 'seed_1',
            proposedGenre: 'epistle',
            chosenGenre: 'epistle',
        });
        expect(result).toEqual({ accepted: true, provenance: 'userConfirmed' });
        expect(repo.update).toHaveBeenCalledWith(
            'seed_1',
            expect.objectContaining({
                contextGenre: expect.objectContaining({
                    genre: 'epistle',
                    genreConfirmed: true,
                    genreProvenance: 'userConfirmed',
                }),
            }),
        );
    });

    it('elegir otro → userOverride, y el trabajo previo del paso se preserva', async () => {
        const repo = makeRepo();
        const result = await new PronounceGuidedGenreUseCase(repo).execute({
            seedId: 'seed_1',
            proposedGenre: 'epistle',
            chosenGenre: 'poetry',
        });
        expect(result.provenance).toBe('userOverride');
        const patch = repo.update.mock.calls[0][1];
        expect(patch.contextGenre.genreOverrideTarget).toBe('poetry');
        // No pisa lo que el pastor ya había escrito ni el tiempo del paso.
        expect(patch.contextGenre.genreImplication).toBe('texto previo del pastor');
        expect(patch.contextGenre.timeSpentSeconds).toBe(42);
    });

    it('FAIL-CLOSED: un centinela no es elección válida y NO escribe nada', async () => {
        const repo = makeRepo();
        const result = await new PronounceGuidedGenreUseCase(repo).execute({
            seedId: 'seed_1',
            proposedGenre: 'epistle',
            chosenGenre: 'gospel',
        });
        expect(result.accepted).toBe(false);
        expect(repo.update).not.toHaveBeenCalled();
        expect(repo.getById).not.toHaveBeenCalled();
    });

    it('seed inexistente → rechazo sin escritura', async () => {
        const repo = makeRepo(null);
        const result = await new PronounceGuidedGenreUseCase(repo).execute({
            seedId: 'nope',
            proposedGenre: 'epistle',
            chosenGenre: 'poetry',
        });
        expect(result.accepted).toBe(false);
        expect(repo.update).not.toHaveBeenCalled();
    });
});
