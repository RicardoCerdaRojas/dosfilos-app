import type { SupportedLanguage } from '../types/i18n';

/**
 * Kinds of artifact the sermon repurposer can produce from a published
 * sermon. v1 ships two kinds — devotional + study guide — both mapped
 * onto existing Faculty `ExtractionType` values so the artifacts surface
 * in "Mis Recursos" alongside Faculty-generated content (one library,
 * one source-of-truth per artifact kind).
 *
 * Phase 2 will add SMALL_GROUP_GUIDE, BULLETIN, SOCIAL_CLIPS once the
 * pattern is validated.
 */
export type SermonRepurposeKind = 'devotional' | 'study-guide';

export interface SermonRepurposerInput {
    /** Title of the parent sermon (for prompt grounding). */
    sermonTitle: string;
    /** Reference of the sermon's primary passage. */
    passage: string;
    /** Full markdown body of the published sermon. */
    sermonMarkdown: string;
    /** Locale for the produced artifact. */
    language: SupportedLanguage;
}

export interface SermonRepurposerOutput {
    /** Markdown body of the produced artifact. */
    markdown: string;
    /** Default title proposed by the model — caller may rename. */
    title: string;
    /** Model id used (for telemetry, never surfaced to the user). */
    modelId: string;
    /** Token usage from the model response, when available. */
    tokensUsed: number | null;
}

/**
 * Repurposes a published sermon into a derivative artifact (daily
 * devotional, mid-week study guide, etc.). Implementation lives in
 * `@dosfilos/infrastructure` and wraps the LLM call.
 */
export interface ISermonRepurposer {
    repurpose(kind: SermonRepurposeKind, input: SermonRepurposerInput): Promise<SermonRepurposerOutput>;
}
