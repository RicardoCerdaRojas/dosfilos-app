import type {
    IUserStyleGuideRepository,
    UserStyleGuide,
} from '@dosfilos/domain';

/**
 * Activates a guide for the user. The repository implementation
 * deactivates any prior active guide atomically so the "at most one
 * active per user" invariant is preserved.
 */
export class SetActiveStyleGuideUseCase {
    constructor(private repository: IUserStyleGuideRepository) { }

    async execute(ownerId: string, guideId: string): Promise<UserStyleGuide> {
        if (!ownerId || !guideId) {
            throw new Error('SetActiveStyleGuideUseCase: ownerId and guideId required');
        }
        return this.repository.setActive(ownerId, guideId);
    }
}
