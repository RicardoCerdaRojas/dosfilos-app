import { describe, it, expect, vi } from 'vitest';
import { SaveAssembledPaperUseCase } from '../SaveAssembledPaperUseCase';

function build() {
    const updatePaper = vi.fn().mockResolvedValue({ id: 'paper-1' });
    return { updatePaper, useCase: new SaveAssembledPaperUseCase({ updatePaper } as never) };
}

describe('SaveAssembledPaperUseCase', () => {
    it('guarda el markdown recibido sin componer nada', async () => {
        const { updatePaper, useCase } = build();

        await useCase.execute({ ownerId: 'o', paperId: 'p', markdown: '# El paper revisado' });

        // Lo que se archiva es EXACTAMENTE lo que el usuario aprobó.
        // Recomponer para guardar costaba una segunda llamada y podía
        // archivar un texto distinto del revisado.
        expect(updatePaper).toHaveBeenCalledWith('o', 'p', {
            assembledMarkdown: '# El paper revisado',
        });
    });

    it('se niega a guardar una composición vacía', async () => {
        const { updatePaper, useCase } = build();

        await expect(useCase.execute({ ownerId: 'o', paperId: 'p', markdown: '   ' }))
            .rejects.toThrow(/empty composition/);
        expect(updatePaper).not.toHaveBeenCalled();
    });

    it('exige propietario y trabajo', async () => {
        const { useCase } = build();

        await expect(useCase.execute({ ownerId: '', paperId: 'p', markdown: 'x' }))
            .rejects.toThrow(/required/);
    });
});
