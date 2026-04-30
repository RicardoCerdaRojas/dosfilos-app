import type { IExegeticalPaperRepository } from '@dosfilos/domain';

/**
 * Removes a source from a paper. Does NOT delete the underlying
 * library_resource — that lives in the user's library independently and
 * the user manages it from there. Intentional separation: a source can
 * be detached from one paper while remaining attached to others (or
 * useful in the library for general retrieval).
 */
export class RemoveProjectSourceUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: {
        ownerId: string;
        paperId: string;
        sourceId: string;
    }): Promise<void> {
        if (!input.ownerId || !input.paperId || !input.sourceId) {
            throw new Error('RemoveProjectSourceUseCase: ownerId, paperId and sourceId required');
        }
        return this.paperRepository.removeSource(input.ownerId, input.paperId, input.sourceId);
    }
}
