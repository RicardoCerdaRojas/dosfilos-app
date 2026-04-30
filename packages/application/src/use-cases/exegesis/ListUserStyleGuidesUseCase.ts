import type {
    IUserStyleGuideRepository,
    UserStyleGuide,
} from '@dosfilos/domain';

/**
 * Lists every style guide the user has uploaded, most recent first.
 * The active guide (if any) is identifiable via the `isActive` flag in
 * the result — no need for a separate query.
 */
export class ListUserStyleGuidesUseCase {
    constructor(private repository: IUserStyleGuideRepository) { }

    async execute(ownerId: string): Promise<UserStyleGuide[]> {
        if (!ownerId) {
            throw new Error('ListUserStyleGuidesUseCase: ownerId required');
        }
        return this.repository.listGuides(ownerId);
    }
}
