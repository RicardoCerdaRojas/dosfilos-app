import type { IUserStyleGuideRepository } from '@dosfilos/domain';

/**
 * Hard-delete a style guide from the user's collection.
 *
 * v1 caveat: papers that reference the deleted guide will have a dangling
 * `styleGuideId`. The orchestrator detects this when it tries to inject
 * the guide into a prompt and surfaces the error to the user, who can
 * pick a different guide on the affected paper. A future enhancement is
 * to refuse deletion when active papers reference the guide — that
 * requires an inverse-index query that's currently expensive.
 *
 * The library_resources document the guide pointed at is NOT deleted by
 * this use case — the user can also keep / delete it from the library
 * separately. Deleting both atomically is on the roadmap.
 */
export class DeleteUserStyleGuideUseCase {
    constructor(private repository: IUserStyleGuideRepository) { }

    async execute(ownerId: string, guideId: string): Promise<void> {
        if (!ownerId || !guideId) {
            throw new Error('DeleteUserStyleGuideUseCase: ownerId and guideId required');
        }
        return this.repository.deleteGuide(ownerId, guideId);
    }
}
