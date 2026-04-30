import type {
    IExegeticalPaperRepository,
    ProjectSource,
    UpdateProjectSourceInput,
} from '@dosfilos/domain';

/**
 * Patches a single source on a paper. Common updates: changing the
 * `sourceType` (e.g. promoting an `other` to `commentary-critical`),
 * correcting the displayLabel, or pinning an explicit `citationKey` to
 * disambiguate authors with the same surname.
 *
 * Pass `citationKey: null` to clear an explicit override and let the
 * orchestrator derive the key from corpus metadata.
 */
export class UpdateProjectSourceUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: UpdateProjectSourceInput & {
        ownerId: string;
        paperId: string;
    }): Promise<ProjectSource> {
        if (!input.ownerId || !input.paperId || !input.sourceId) {
            throw new Error('UpdateProjectSourceUseCase: ownerId, paperId and sourceId required');
        }
        return this.paperRepository.updateSource(
            input.ownerId,
            input.paperId,
            input.sourceId,
            {
                sourceType: input.sourceType,
                displayLabel: input.displayLabel,
                citationKey: input.citationKey,
                order: input.order,
            }
        );
    }
}
