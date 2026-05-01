import type {
    IUserRubricRepository,
    PaperRubric,
    UserRubric,
} from '@dosfilos/domain';

/**
 * Patches a user-level rubric template (rename or replace its
 * content). Does NOT change `isDefault` — that's a separate
 * `SetDefaultUserRubricUseCase` so the UI's "set as default" can
 * be a one-click affordance distinct from "save edits".
 *
 * Note: editing a template here does NOT retroactively update
 * papers that were created from it. Each paper carries its own
 * embedded `paper.rubric` snapshot — that's a deliberate design
 * choice (see `UserRubric` doc).
 */
export class UpdateUserRubricUseCase {
    constructor(private repository: IUserRubricRepository) { }

    async execute(input: {
        ownerId: string;
        rubricId: string;
        displayName?: string;
        rubric?: PaperRubric;
    }): Promise<UserRubric> {
        if (!input.ownerId) throw new Error('UpdateUserRubricUseCase: ownerId required');
        if (!input.rubricId) throw new Error('UpdateUserRubricUseCase: rubricId required');

        return this.repository.updateRubric(input.ownerId, input.rubricId, {
            displayName: input.displayName?.trim() || undefined,
            rubric: input.rubric,
        });
    }
}
