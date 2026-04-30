import type { IUserRubricRepository } from '@dosfilos/domain';

/**
 * Hard-deletes a rubric template. Papers previously created from
 * it KEEP their embedded snapshot — the deletion only removes the
 * template from the user's library, not from the paper history.
 *
 * The UI gates the action with a confirmation dialog because
 * deletion is irreversible.
 */
export class DeleteUserRubricUseCase {
    constructor(private repository: IUserRubricRepository) { }

    async execute(input: { ownerId: string; rubricId: string }): Promise<void> {
        if (!input.ownerId) throw new Error('DeleteUserRubricUseCase: ownerId required');
        if (!input.rubricId) throw new Error('DeleteUserRubricUseCase: rubricId required');
        return this.repository.deleteRubric(input.ownerId, input.rubricId);
    }
}
