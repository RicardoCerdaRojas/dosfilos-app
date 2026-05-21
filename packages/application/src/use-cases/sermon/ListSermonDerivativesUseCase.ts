import type { Extraction, IExtractionRepository } from '@dosfilos/domain';

export interface ListSermonDerivativesInput {
    actorUserId: string;
    sermonId: string;
}

/**
 * Lists every Extraction whose `externalRef` points to the given
 * sermon — i.e. every derivative produced by `RepurposeSermonUseCase`
 * (devotionals, study guides, future kinds) plus the sermon's own
 * canonical mirror (type === 'SERMON'), if one exists.
 *
 * Callers typically filter out `type === 'SERMON'` so the "Reaplicar
 * como" panel shows only derivatives — but exposing both lets the panel
 * also surface the canonical mirror when relevant (e.g. for a
 * "sermón original" badge / link).
 */
export class ListSermonDerivativesUseCase {
    constructor(private readonly extractionRepository: IExtractionRepository) { }

    async execute(input: ListSermonDerivativesInput): Promise<Extraction[]> {
        return this.extractionRepository.listByExternalRef(
            input.actorUserId,
            'sermons',
            input.sermonId,
        );
    }
}
