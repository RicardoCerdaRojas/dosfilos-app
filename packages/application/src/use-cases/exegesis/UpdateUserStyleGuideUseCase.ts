import type {
    IUserStyleGuideRepository,
    UserStyleGuide,
} from '@dosfilos/domain';

/**
 * Patches a user-level style guide's metadata (currently only
 * `displayName` and `version`). The manifest itself is NOT editable
 * here in v1.6 — that surface ships in v1.7 as a separate use case
 * once the manifest editor UI exists. See memory note
 * `feature_exegesis_v17_rich_style_guide.md`.
 */
export class UpdateUserStyleGuideUseCase {
    constructor(private repository: IUserStyleGuideRepository) { }

    async execute(input: {
        ownerId: string;
        guideId: string;
        displayName?: string;
        version?: string;
    }): Promise<UserStyleGuide> {
        if (!input.ownerId) throw new Error('UpdateUserStyleGuideUseCase: ownerId required');
        if (!input.guideId) throw new Error('UpdateUserStyleGuideUseCase: guideId required');

        const patch: Partial<Pick<UserStyleGuide, 'displayName' | 'version'>> = {};
        const trimmedName = input.displayName?.trim();
        if (trimmedName) patch.displayName = trimmedName;
        const trimmedVersion = input.version?.trim();
        if (trimmedVersion !== undefined) patch.version = trimmedVersion;

        return this.repository.updateGuide(input.ownerId, input.guideId, patch);
    }
}
