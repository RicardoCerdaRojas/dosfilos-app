import type { IUserRubricRepository, UserRubric } from '@dosfilos/domain';

/**
 * Promotes the given template to default. The repo's transaction
 * handles the demotion of the previous default atomically.
 *
 * The default template auto-applies when the student creates a
 * new paper without picking a different one (handled by the
 * create-paper flow, not here — this use case just maintains the
 * flag).
 */
export class SetDefaultUserRubricUseCase {
    constructor(private repository: IUserRubricRepository) { }

    async execute(input: { ownerId: string; rubricId: string }): Promise<UserRubric> {
        if (!input.ownerId) throw new Error('SetDefaultUserRubricUseCase: ownerId required');
        if (!input.rubricId) throw new Error('SetDefaultUserRubricUseCase: rubricId required');
        return this.repository.setDefault(input.ownerId, input.rubricId);
    }
}
