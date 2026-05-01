import type { SyntacticUnit } from '../../entities/SermonSeries';

/**
 * Port for the pericope-detection assistant.
 *
 * Goal: given the original-language text of a biblical book (or a
 * range), return a list of syntactically-justified pericopes — units
 * the model has reason to believe the original author intended as
 * coherent argumentative blocks. Boundaries follow original-language
 * markers (Greek participial chains, μέν/δέ pairs, asyndeton, Hebrew
 * waw-consecutive shifts, וַיְהִי introducers, structural inclusio)
 * NOT modern chapter/verse numbering.
 *
 * Implementations live in infrastructure (Gemini Pro 2.5 + thinking
 * for v1). The detector is pure: the callsite (the assistant wizard)
 * loads the original-language text from the `bible/` module and hands
 * it in as `originalText`. The detector never fetches text on its
 * own — that keeps it testable, infrastructure-portable, and free of
 * any direct dependency on the bible repository.
 *
 * Idempotency contract: callers pass the same `originalText` and
 * `language` and may reuse the prior result by comparing
 * `outputVersion`. The detector itself does NOT cache; the caller is
 * expected to memo via `series.metadata.expository.pericopeAssistantVersion`.
 */
export interface IPericopeDetector {
    detect(input: PericopeDetectionInput): Promise<PericopeDetectionOutput>;
}

export interface PericopeDetectionInput {
    /**
     * Display name of the book (e.g. "2 Pedro", "Romanos") in the
     * caller's preferred language. Used in prompts and as the `book`
     * field on each returned `SyntacticUnit`. Detector does not do
     * canonical name resolution — caller passes whatever the UI shows.
     */
    book: string;
    /** Original-language text of the requested range. Verse-tagged. */
    originalText: PericopeVerseInput[];
    /** Which original language the text is in. Drives prompt selection. */
    originalLanguage: 'greek' | 'hebrew';
    /** Display language for the justifications the LLM emits. */
    displayLanguage: 'es' | 'en';
    /**
     * Optional caller-side hint about target pericope size — useful
     * when the user wants a series with roughly N sermons and the
     * LLM should bias toward that count. Soft constraint; the LLM is
     * encouraged to follow syntax over arithmetic.
     */
    targetPericopeCount?: number;
}

/**
 * One verse worth of original-language text. The wizard pulls these
 * from the bible module's interlinear/SBLGNT/WLC sources and forwards
 * them verbatim — no normalization. The detector reads the verse
 * coordinates from `chapter`/`verse` so it can emit pericope ranges
 * without having to re-parse the text.
 */
export interface PericopeVerseInput {
    chapter: number;
    verse: number;
    /** Verse text in the original language. */
    text: string;
}

export interface PericopeDetectionOutput {
    pericopes: DetectedPericope[];
    /**
     * Stable signature of the model + prompt + input that produced
     * `pericopes`. The caller stores this on
     * `series.metadata.expository.pericopeAssistantVersion` so a
     * subsequent run with the same inputs can skip the LLM call.
     * Format: `${modelId}@${promptVersion}#${inputHash.slice(0,12)}`.
     */
    outputVersion: string;
    /** Identifier of the model that produced this. Stored for audit. */
    modelId: string;
    /** Total tokens consumed (prompt + completion). Null if unreported. */
    tokensUsed: number | null;
}

/**
 * Detector output shape. Mirrors `SyntacticUnit` (which is what gets
 * persisted on `PlannedSermon`) but adds presentation hints used only
 * by the wizard (suggested title, suggested order). The wizard maps
 * these into `SyntacticUnit` plus the surrounding `PlannedSermon`
 * fields when the user accepts the proposal.
 */
export interface DetectedPericope {
    unit: SyntacticUnit;
    /** Suggested human-readable title for the pericope (e.g. "Llamados firmes"). */
    suggestedTitle: string;
    /** Stable order in the book; preserved when the user reorders. */
    order: number;
}
