import type {
    IUserStyleGuideRepository,
    UserStyleGuide,
} from '@dosfilos/domain';

/**
 * Returns the user's currently active style guide, or null if they
 * haven't uploaded one yet. The orchestrator calls this before generating
 * a step to know what TMS rules to inject into the prompt.
 */
export class GetActiveStyleGuideUseCase {
    constructor(private repository: IUserStyleGuideRepository) { }

    async execute(ownerId: string): Promise<UserStyleGuide | null> {
        if (!ownerId) {
            throw new Error('GetActiveStyleGuideUseCase: ownerId required');
        }
        return this.repository.getActiveGuide(ownerId);
    }
}
