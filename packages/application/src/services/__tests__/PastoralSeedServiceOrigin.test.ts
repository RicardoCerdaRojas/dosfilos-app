import { describe, it, expect, vi } from 'vitest';
import { PastoralSeedService } from '../PastoralSeedService';
import type { IPastoralSeedRepository, PastoralSeed } from '@dosfilos/domain';

/**
 * Spine A: el estudio que nace del wizard debe declararlo. Hermano del test de
 * `ActivateGuidedSermonUseCase` (Spine B) — entre los dos cubren los ÚNICOS dos
 * sitios del sistema que crean un `PastoralSeed`.
 */
function makeRepo(existing: PastoralSeed | null = null) {
    return {
        findBySermonId: vi.fn(async () => existing),
        create: vi.fn(async (seed: PastoralSeed) => ({ ...seed, id: 'seed-1' })),
    } as unknown as IPastoralSeedRepository & { create: ReturnType<typeof vi.fn> };
}

describe('PastoralSeedService.ensureForSermon — origin', () => {
    it('el estudio nacido del wizard queda marcado como wizard', async () => {
        const repo = makeRepo();
        const seed = await new PastoralSeedService(repo).ensureForSermon({
            sermonId: 'srm1',
            userId: 'u1',
            passage: 'Romanos 8:28',
        });
        expect(seed.origin).toBe('wizard');
        expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('un estudio ya existente se devuelve tal cual — no se le reescribe el origen', async () => {
        const existing = { id: 'seed-9', origin: 'socratic' } as unknown as PastoralSeed;
        const repo = makeRepo(existing);
        const seed = await new PastoralSeedService(repo).ensureForSermon({
            sermonId: 'srm1',
            userId: 'u1',
            passage: 'Romanos 8:28',
        });
        expect(seed.origin).toBe('socratic');
        expect(repo.create).not.toHaveBeenCalled();
    });
});
