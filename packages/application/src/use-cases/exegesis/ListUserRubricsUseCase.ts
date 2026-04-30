import type { IUserRubricRepository, UserRubric } from '@dosfilos/domain';

/**
 * Lists the user's rubric templates, sorted by repo (most recently
 * updated first). Surface used by the directory page's "Mis
 * rúbricas" section and by the create-paper picker.
 */
export class ListUserRubricsUseCase {
    constructor(private repository: IUserRubricRepository) { }

    async execute(ownerId: string): Promise<UserRubric[]> {
        if (!ownerId) throw new Error('ListUserRubricsUseCase: ownerId required');
        return this.repository.listRubrics(ownerId);
    }
}
