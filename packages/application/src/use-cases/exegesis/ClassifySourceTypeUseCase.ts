import type {
    ClassifySourceTypeOutput,
    ISourceTypeClassifier,
    SourceType,
} from '@dosfilos/domain';

export interface ClassifySourceTypeInput {
    /**
     * Pre-fetched extracted text. The web hook reads this from the
     * library resource it just uploaded — no need to thread a content
     * reader through the use case for a single read the caller
     * already did.
     */
    rawText: string;
    /** Optional metadata that strongly disambiguates close categories. */
    title?: string | null;
    author?: string | null;
    /** Output language for the classifier's `reasoning`. */
    language?: 'es' | 'en';
    /**
     * How many characters of `rawText` to forward to the classifier.
     * Defaults to 5000 — title page + preface + first content pages
     * usually establish the source type unambiguously, and a tighter
     * window cuts cost / latency on long documents.
     */
    maxChars?: number;
}

export interface ClassifySourceTypeUseCaseOutput extends ClassifySourceTypeOutput {
    /**
     * The text slice that was actually sent to the classifier. Useful
     * for debugging / telemetry. Not displayed in the UI.
     */
    inspectedExcerpt: string;
}

/**
 * Stateless wrapper around `ISourceTypeClassifier` that the web layer
 * calls after upload to pre-fill the SourceType dropdown in the
 * corpus-attach UI.
 *
 * Stateless on purpose:
 *   - No persistence — the classification is advisory; the user
 *     accepts (or overrides) it as they fill the form.
 *   - No ownership check — the caller already authenticated when it
 *     fetched the resource (Firestore rules), and the classifier
 *     never mutates anything.
 *
 * Why a use case at all (instead of calling the classifier directly):
 *   - Centralizes the slice + language defaults so the web layer
 *     doesn't have to remember "5000 chars, default 'es'".
 *   - Gives a stable application-layer surface to wire into
 *     `ExegesisService` — same pattern as every other LLM-backed
 *     operation in the module.
 */
export class ClassifySourceTypeUseCase {
    constructor(private classifier: ISourceTypeClassifier) { }

    // TODO(billing): wire ExegesisCreditReservation. Skipped for now —
    // input shape lacks `ownerId` (caller is the upload hook, not the
    // user-scoped paper editor) and threading a userId through every
    // call site would touch many surfaces. Catalog cost is $0.001 so
    // skipping is negligible until the call site is refactored.
    async execute(input: ClassifySourceTypeInput): Promise<ClassifySourceTypeUseCaseOutput> {
        const trimmed = (input.rawText ?? '').trim();
        if (trimmed.length === 0) {
            // Empty input → mirror the classifier's "low-confidence other"
            // verdict so the UI surfaces the same fallback path without a
            // separate code branch. We DO NOT call the LLM in this case.
            const fallback: SourceType = 'other';
            return {
                sourceType: fallback,
                confidence: 'low',
                reasoning: '',
                tokensUsed: 0,
                modelId: 'short-circuit',
                inspectedExcerpt: '',
            };
        }
        const maxChars = input.maxChars ?? 5000;
        const slice = trimmed.slice(0, maxChars);

        const result = await this.classifier.classify({
            rawText: slice,
            title: input.title ?? null,
            author: input.author ?? null,
            language: input.language ?? 'es',
        });

        return {
            ...result,
            inspectedExcerpt: slice,
        };
    }
}
