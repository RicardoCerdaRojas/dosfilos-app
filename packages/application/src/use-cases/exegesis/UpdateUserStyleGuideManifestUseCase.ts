import {
    hasManifestValidationErrors,
    validateStyleGuideManifest,
    type IUserStyleGuideRepository,
    type StyleGuideManifest,
    type StyleManifestValidationIssue,
    type UserStyleGuide,
} from '@dosfilos/domain';

export interface UpdateUserStyleGuideManifestInput {
    ownerId: string;
    guideId: string;
    /**
     * The full manifest the user wants persisted. The use case marks
     * `provenance: 'user-edited'` and stamps `extractedAt` (now) so
     * the audit trail reflects the manual edit even though the
     * extraction model id stays put.
     *
     * Pass a complete manifest, not a patch — the editor builds the
     * full object from the dialog state and submits it whole. Keeping
     * the call shape as "set" simplifies merge semantics (no field-
     * level diff math, no race when two browsers edit the same guide).
     */
    manifest: StyleGuideManifest;
}

export class StyleGuideValidationError extends Error {
    readonly issues: ReadonlyArray<StyleManifestValidationIssue>;
    constructor(issues: ReadonlyArray<StyleManifestValidationIssue>) {
        super(`Style guide manifest has ${issues.length} validation issue(s)`);
        this.name = 'StyleGuideValidationError';
        this.issues = issues;
        Object.setPrototypeOf(this, StyleGuideValidationError.prototype);
    }
}

/**
 * v1.7 — User edit of a style guide manifest.
 *
 * Workflow:
 *   1. Validate the proposed manifest via `validateStyleGuideManifest`.
 *      `severity: 'error'` issues throw `StyleGuideValidationError`
 *      (UI surfaces them inline). Warnings pass through — the editor
 *      already surfaced them before save and the user accepted.
 *   2. Stamp `provenance: 'user-edited'` + `extractedAt: new Date()`.
 *      The `extractorModelId` is preserved so the audit trail still
 *      shows what model produced the original extraction.
 *   3. Persist via `repository.setManifest`.
 *
 * Errors:
 *   - `Error('Style guide not found')` when the id doesn't resolve.
 *   - `StyleGuideValidationError` when the patch fails strict checks.
 *   - Repository errors propagate as-is.
 */
export class UpdateUserStyleGuideManifestUseCase {
    constructor(private styleGuideRepository: IUserStyleGuideRepository) { }

    async execute(input: UpdateUserStyleGuideManifestInput): Promise<UserStyleGuide> {
        if (!input.ownerId) throw new Error('UpdateUserStyleGuideManifestUseCase: ownerId required');
        if (!input.guideId) throw new Error('UpdateUserStyleGuideManifestUseCase: guideId required');

        const guide = await this.styleGuideRepository.getGuide(input.ownerId, input.guideId);
        if (!guide) throw new Error(`Style guide ${input.guideId} not found`);

        const issues = validateStyleGuideManifest(input.manifest);
        if (hasManifestValidationErrors(issues)) {
            throw new StyleGuideValidationError(issues);
        }

        const nextManifest: StyleGuideManifest = {
            ...input.manifest,
            provenance: 'user-edited',
            extractedAt: new Date(),
        };

        return this.styleGuideRepository.setManifest(input.ownerId, input.guideId, nextManifest);
    }
}
