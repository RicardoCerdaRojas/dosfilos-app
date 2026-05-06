import type {
    CanonicalVerseAnalysis,
    ComposeAcademicPaperInput,
    ComposeAcademicPaperOutput,
    ComposerSourceMetadata,
    ExegeticalPaper,
    FormatterSourceMetadata,
    IAcademicComposer,
    IExegeticalPaperRepository,
    IResourceContentReader,
    IStyleFormatter,
    IUserStyleGuideRepository,
    StyleGuideManifest,
} from '@dosfilos/domain';
import { isCitableSourceType } from '@dosfilos/domain';

/**
 * Composes a TMS-style academic paper from a paper's accepted verse
 * analyses.
 *
 * Pipeline:
 *   1. Load paper, collect accepted `CanonicalVerseAnalysis` from
 *      verse steps in canonical order.
 *   2. Resolve the style guide (content + structured manifest) for
 *      mandatory style adherence at the prompt layer.
 *   3. Build the composer source registry + the formatter citable-
 *      source metadata (two representations of the same paper.sources
 *      data, one for each downstream consumer).
 *   4. Call `IAcademicComposer.composeAcademicPaper` to produce the
 *      raw markdown.
 *   5. When a manifest is available, run the existing
 *      `IStyleFormatter` post-process to rewrite citations per the
 *      style guide's templates (ibid handling, full vs short, page
 *      formats). Idempotent — safe to run on already-formatted output.
 *   6. Return the final markdown plus formatter status (applied /
 *      skipped / error).
 *
 * Failure semantics:
 *   - Paper not found → throw.
 *   - Paper has no accepted verse analyses → throw with explicit
 *     message ("paper not ready for composition").
 *   - Composer throws → bubbles up; caller decides retry policy.
 *   - Formatter throws → swallowed; we return the composer's raw
 *     markdown with `formatterStatus: 'error'` and log the failure.
 *     Rationale: a formatting hiccup should not block the user from
 *     getting the substantive composition.
 *
 * Style-guide enforcement:
 *   - Always attempts both layers when a guide is configured.
 *   - When NO guide is configured, the composer's prompt declares the
 *     fallback explicitly (TMS / Turabian) and the formatter is
 *     bypassed. Logged as a warning so the user is aware.
 */
export class ComposeAcademicPaperUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private styleGuideRepository: IUserStyleGuideRepository,
        private contentReader: IResourceContentReader,
        private composer: IAcademicComposer,
        // Optional. When omitted (or when no manifest is attached),
        // the deterministic post-format step is skipped and the
        // composer's raw output is returned.
        private styleFormatter?: IStyleFormatter,
    ) { }

    async execute(input: ComposeAcademicPaperUseCaseInput): Promise<ComposeAcademicPaperOutput> {
        if (!input.ownerId || !input.paperId) {
            throw new Error('ComposeAcademicPaperUseCase: ownerId and paperId required');
        }

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);

        // ── Collect accepted analyses ────────────────────────────────
        const verseAnalyses = collectAcceptedVerseAnalyses(paper);
        if (verseAnalyses.length === 0) {
            throw new Error(
                'ComposeAcademicPaperUseCase: paper has no accepted verse analyses. ' +
                'Run AnalyzeVerseCanonicallyUseCase + accept the result for each verse step before composing.',
            );
        }

        // ── Resolve style guide (content + manifest) ─────────────────
        const styleGuideContent = await this.loadStyleGuideContent(input.ownerId, paper.styleGuideId);
        const manifest = await this.loadStyleManifest(input.ownerId, paper.styleGuideId);

        if (!paper.styleGuideId) {
            console.warn(
                `[ComposeAcademicPaperUseCase] Paper ${paper.id} has no style guide attached. ` +
                'Falling back to TMS / Turabian conventions in prompt; deterministic formatter bypassed.',
            );
        } else if (!manifest) {
            console.warn(
                `[ComposeAcademicPaperUseCase] Paper ${paper.id} has style guide ${paper.styleGuideId} ` +
                'but no extracted manifest. Prompt layer active; deterministic formatter bypassed.',
            );
        }

        // ── Build the source registry for the composer ───────────────
        // Composer needs author/title/series/etc for bibliography.
        // We populate from `paper.sources` directly — when richer
        // library_resource metadata becomes wired (publisher, city,
        // year, volume), this method is the single place to extend.
        const composerSources = buildComposerSources(paper);

        // ── Build citable sources for the deterministic formatter ───
        const citableSources = buildFormatterSources(paper);

        // ── Compose ──────────────────────────────────────────────────
        const composerInput: ComposeAcademicPaperInput = {
            paperPassage: paper.passage,
            paperTitle: paper.title ?? null,
            language: paper.displayLanguage,
            assignmentBrief: paper.assignmentBrief,
            verseAnalyses,
            styleGuideContent,
            styleGuideManifest: manifest,
            sources: composerSources,
        };
        const raw = await this.composer.composeAcademicPaper(composerInput);

        // ── Apply the deterministic post-formatter when possible ─────
        let finalOutput: ComposeAcademicPaperOutput;
        if (this.styleFormatter && manifest && citableSources.length > 0) {
            try {
                const formatted = this.styleFormatter.format({
                    markdown: raw.markdown,
                    manifest,
                    citableSources,
                    // Composition is single-shot over the whole paper
                    // — no cross-step prior anchors. Each citation is
                    // either a first occurrence or a subsequent
                    // occurrence within the same composition, decided
                    // by sequence within the markdown.
                    priorFootnoteAnchors: [],
                });
                if (formatted.warnings.length > 0) {
                    console.warn('[ComposeAcademicPaperUseCase] formatter warnings:', formatted.warnings);
                }
                finalOutput = {
                    ...raw,
                    markdown: formatted.markdown,
                    formatterStatus: 'applied',
                };
            } catch (err) {
                console.error('[ComposeAcademicPaperUseCase] formatter threw, returning raw markdown:', err);
                finalOutput = { ...raw, formatterStatus: 'error' };
            }
        } else {
            finalOutput = { ...raw, formatterStatus: 'skipped' };
        }

        // ── Optional persistence ────────────────────────────────────
        // Persist the composed markdown on `paper.assembledMarkdown`
        // when the caller opted in. This is the canonical "save the
        // assembled paper" surface — overwrites prior assembly.
        // Composition output is large; persisting on every run would
        // bloat history without proportional benefit. The caller (UI)
        // exposes a dedicated "Save to paper" CTA so the user
        // explicitly chooses when a composition is the canonical one.
        if (input.persist) {
            try {
                await this.paperRepository.updatePaper(input.ownerId, input.paperId, {
                    assembledMarkdown: finalOutput.markdown,
                });
            } catch (err) {
                console.error('[ComposeAcademicPaperUseCase] persist failed:', err);
                // Persistence failure must not lose the composition.
                // Return the markdown so the user can still copy /
                // download / retry. The caller surfaces the persist
                // failure as a warning, not as a hard error.
                throw new ComposeAcademicPaperPersistError(
                    'Composition completed but could not be saved to the paper. The markdown is in the error payload — copy or download before retrying.',
                    finalOutput,
                );
            }
        }

        return finalOutput;
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private async loadStyleGuideContent(ownerId: string, styleGuideId: string | null): Promise<string> {
        if (!styleGuideId) return '';
        const guide = await this.styleGuideRepository.getGuide(ownerId, styleGuideId);
        if (!guide) return '';
        return (await this.contentReader.getTextContent(guide.corpusId)) ?? '';
    }

    private async loadStyleManifest(
        ownerId: string,
        styleGuideId: string | null,
    ): Promise<StyleGuideManifest | null> {
        if (!styleGuideId) return null;
        const guide = await this.styleGuideRepository.getGuide(ownerId, styleGuideId);
        return guide?.manifest ?? null;
    }
}

/**
 * Collects accepted `CanonicalVerseAnalysis` from verse-kind steps,
 * sorted by step order. Filters out:
 *   - non-verse steps (intro, conclusion, assembly)
 *   - steps without an accepted version
 *   - steps whose accepted version is from the legacy markdown path
 *     (no `canonicalAnalysis` populated)
 */
function collectAcceptedVerseAnalyses(paper: ExegeticalPaper): CanonicalVerseAnalysis[] {
    return paper.steps
        .filter(s => s.kind === 'verse' && s.accepted?.canonicalAnalysis)
        .sort((a, b) => a.order - b.order)
        .map(s => s.accepted!.canonicalAnalysis!);
}

/**
 * Builds the composer's source registry from the paper's project
 * sources. v1 populates the fields we have on `ProjectSource`;
 * publisher/city/year/edition stay undefined until library_resource
 * metadata gets surfaced through the source.
 */
function buildComposerSources(paper: ExegeticalPaper): ComposerSourceMetadata[] {
    return paper.sources
        .filter(s => isCitableSourceType(s.sourceType))
        .map(s => {
            const key = s.citationKey ?? deriveCitationKey(s.displayLabel);
            return {
                citationKey: key,
                author: key,
                title: s.displayLabel,
            };
        });
}

/**
 * Builds the deterministic formatter's citable-source metadata from
 * the same project sources. Mirrors `GenerateStepUseCase.buildCitableSourceMetadata`
 * for behavioral parity.
 */
function buildFormatterSources(paper: ExegeticalPaper): FormatterSourceMetadata[] {
    return paper.sources
        .filter(s => isCitableSourceType(s.sourceType))
        .map(s => {
            const key = s.citationKey ?? deriveCitationKey(s.displayLabel);
            return {
                corpusId: s.corpusId,
                citationKey: key,
                fullAuthor: key,
                authorSurnameFirst: key,
                fullTitle: s.displayLabel,
                shortTitle: s.displayLabel,
                publisher: null,
                city: null,
                year: null,
                volume: null,
            };
        });
}

/**
 * Derives a stable short citation key from a display label when the
 * student didn't set one. Mirrors the heuristic used in
 * GenerateStepUseCase: take the first significant word.
 */
function deriveCitationKey(displayLabel: string): string {
    const trimmed = (displayLabel ?? '').trim();
    if (!trimmed) return 'Source';
    return trimmed.split(/[\s,;:.\-—]+/)[0] || 'Source';
}

export interface ComposeAcademicPaperUseCaseInput {
    ownerId: string;
    paperId: string;
    /**
     * When true, the composed markdown is persisted on
     * `paper.assembledMarkdown`. Default false — caller's surface
     * (copy / download dialog) usually doesn't auto-save; users
     * explicitly opt in via a "Save to paper" CTA.
     */
    persist?: boolean;
}

/**
 * Thrown when the composition succeeded but persisting it on the
 * paper failed. The caller still has the markdown via `output` so
 * the work isn't lost — they can copy or download from the dialog
 * even though the paper.assembledMarkdown didn't update.
 */
export class ComposeAcademicPaperPersistError extends Error {
    readonly output: ComposeAcademicPaperOutput;
    readonly isPersistError = true as const;
    constructor(message: string, output: ComposeAcademicPaperOutput) {
        super(message);
        this.name = 'ComposeAcademicPaperPersistError';
        this.output = output;
    }
}
