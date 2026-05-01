import type { StyleGuideManifest } from '../entities/StyleGuideManifest';

/**
 * Port the style-guide-upload flow uses to convert raw guide text
 * into a structured `StyleGuideManifest`.
 *
 * Runs once at upload time (after LlamaParse has produced the corpus
 * text). The result is stored on `UserStyleGuide.manifest` and reused
 * across every paper that pins this guide. Re-extraction can be
 * triggered by the user from the verification UI (e.g. they noticed
 * the extractor missed something and edited it; later they want to
 * re-run with a newer model and compare).
 *
 * Failures: throw — the upload flow falls back to the system default
 * manifest and surfaces a "could not extract structured rules — using
 * defaults" notice to the student.
 */
export interface IStyleGuideManifestExtractor {
    extract(input: ExtractStyleManifestInput): Promise<ExtractedStyleManifest>;
}

export interface ExtractStyleManifestInput {
    /**
     * Raw text of the style guide. Pulled by the use case from the
     * library content reader. The extractor MAY truncate internally
     * if the guide is enormous — most TMS-style guides fit in
     * comfortably.
     */
    rawText: string;
    /**
     * Output language for `confidence`/`extractionNotes`. The rule
     * fields (templates, examples) are emitted in whatever language
     * the guide itself uses — a Spanish guide produces Spanish
     * examples — so this field controls only the meta commentary.
     */
    language: 'es' | 'en';
}

export interface ExtractedStyleManifest {
    /** The structured manifest, ready to attach to the user's guide. */
    manifest: StyleGuideManifest;
    /** Tokens consumed for cost attribution. Null when unavailable. */
    tokensUsed: number | null;
}
