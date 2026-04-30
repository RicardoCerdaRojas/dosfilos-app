import type {
    IUserStyleGuideRepository,
    UploadStyleGuideInput,
    UserStyleGuide,
} from '@dosfilos/domain';

/**
 * Records a UserStyleGuide pointing at an already-uploaded library_resource.
 *
 * The upload itself (Firebase Storage write + Firestore `library_resources`
 * doc + LlamaParse extraction trigger) happens upstream via `libraryService
 * .uploadResource(...)` — that flow has its own progress UI and consent gate.
 * This use case only adds the relationship: "this resource is the user's
 * style guide named X, currently active or not".
 *
 * If `setActive` is true OR the user has no other guides yet, the new guide
 * is created with `isActive: true` and the repository's transactional
 * `setActive` invariant is enforced (any prior active guide gets toggled
 * off).
 */
export class CreateUserStyleGuideUseCase {
    constructor(private repository: IUserStyleGuideRepository) { }

    async execute(input: UploadStyleGuideInput): Promise<UserStyleGuide> {
        if (!input.ownerId) throw new Error('CreateUserStyleGuideUseCase: ownerId required');
        if (!input.displayName) throw new Error('CreateUserStyleGuideUseCase: displayName required');
        if (!input.corpusId) throw new Error('CreateUserStyleGuideUseCase: corpusId required');

        // Default-active: if the user has no guide yet, the first upload
        // should auto-activate so the wizard has something to inject. The
        // explicit `setActive` flag in the input wins over this default
        // when it's specified.
        let shouldActivate = input.setActive ?? false;
        if (input.setActive === undefined) {
            const existing = await this.repository.listGuides(input.ownerId);
            shouldActivate = existing.length === 0;
        }

        return this.repository.createGuide({
            ownerId: input.ownerId,
            displayName: input.displayName,
            corpusId: input.corpusId,
            // Manifest extraction runs as a separate post-upload step
            // (Phase 3 wires the extractor to fire once LlamaParse
            // finishes). We persist the guide with `manifest: null` so
            // the verification UI can immediately render the
            // "extracting rules" placeholder.
            manifest: null,
            version: input.version ?? null,
            isActive: shouldActivate,
        });
    }
}
