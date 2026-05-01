import {
    buildDefaultRubric,
    type IUserRubricRepository,
    type PaperRubric,
    type UserRubric,
} from '@dosfilos/domain';

/**
 * Creates a new rubric template at user level.
 *
 * Caller passes the rubric content directly (typically from the
 * setup-page "Save as template" button after the student tweaked
 * the embedded paper rubric, or from a dedicated standalone
 * rubric editor that builds one from scratch).
 *
 * If `rubric` is omitted, the use case seeds with the system
 * default — useful for "Crear rúbrica desde cero" UX where the
 * student wants a blank-but-sensible starting point.
 */
export class CreateUserRubricUseCase {
    constructor(private repository: IUserRubricRepository) { }

    async execute(input: {
        ownerId: string;
        displayName: string;
        rubric?: PaperRubric;
        markAsDefault?: boolean;
    }): Promise<UserRubric> {
        if (!input.ownerId) throw new Error('CreateUserRubricUseCase: ownerId required');
        if (!input.displayName?.trim()) {
            throw new Error('CreateUserRubricUseCase: displayName required');
        }

        // First template the user creates auto-defaults so creating
        // their next paper picks it up automatically. Subsequent
        // templates require explicit opt-in via `markAsDefault`.
        let isDefault = !!input.markAsDefault;
        if (input.markAsDefault === undefined) {
            const existing = await this.repository.listRubrics(input.ownerId);
            isDefault = existing.length === 0;
        }

        return this.repository.createRubric({
            ownerId: input.ownerId,
            displayName: input.displayName.trim(),
            isDefault,
            rubric: input.rubric ?? buildDefaultRubric(),
        });
    }
}
