import type {
    ExegesisGenerationInput,
    ExegesisPriorStep,
    ExegesisSourceContext,
    ExegeticalPaper,
    ExegeticalStep,
    ExegeticalStepVersion,
    FormatterSourceMetadata,
    GenerateStepInput,
    IExegesisOrchestrator,
    IExegeticalPaperRepository,
    IResourceContentReader,
    IStyleFormatter,
    IUserStyleGuideRepository,
    PriorFootnoteAnchor,
    StyleGuideManifest,
} from '@dosfilos/domain';
import {
    EMPTY_VERIFICATION_SUMMARY,
    formatPassageReference,
    isCitableSourceType,
} from '@dosfilos/domain';

/**
 * Generates content for a single step.
 *
 * D.2: live generation via the injected `IExegesisOrchestrator` (currently
 * the Gemini Pro 2.5 implementation in infrastructure). The use case
 * orchestrates context resolution — fetching style guide text, source
 * extracts, and prior accepted steps — then hands a fully-resolved
 * `ExegesisGenerationInput` to the orchestrator. The orchestrator only
 * does the LLM call.
 *
 * 'assembly' kind is handled here without an LLM call: it concatenates
 * accepted markdown from introduction → verses → conclusion. Saves
 * tokens and keeps assembly deterministic.
 *
 * Failure path: if any step before the orchestrator throws, the step
 * state stays 'generating' (the use case rolls back via setStepState
 * to 'failed'). If the orchestrator throws, same — the version is
 * never appended, so the UI's "Retry" button will just trigger a fresh
 * call.
 */
/**
 * Function that, given the formatted markdown of a previously-
 * accepted step and the citable-source metadata, extracts the
 * footnote anchors so the next step can reason about cross-step
 * ibid sequences. Lives in infrastructure (regex parsing) and is
 * injected here so the use case stays free of regex details.
 */
export type FootnoteAnchorExtractor = (
    markdown: string,
    citableSources: ReadonlyArray<FormatterSourceMetadata>,
) => PriorFootnoteAnchor[];

export class GenerateStepUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private styleGuideRepository: IUserStyleGuideRepository,
        private contentReader: IResourceContentReader,
        private orchestrator: IExegesisOrchestrator,
        // Style formatter is OPTIONAL — generation still works without
        // it (the inline parenthetical citations the LLM emits are
        // already readable). Wiring the formatter is what makes the
        // citation discipline DETERMINISTIC.
        private styleFormatter?: IStyleFormatter,
        private extractFootnoteAnchors?: FootnoteAnchorExtractor,
    ) { }

    async execute(input: GenerateStepInput): Promise<ExegeticalStepVersion> {
        if (!input.ownerId || !input.paperId || !input.stepId) {
            throw new Error('GenerateStepUseCase: ownerId, paperId and stepId required');
        }

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);
        const step = paper.steps.find(s => s.id === input.stepId);
        if (!step) throw new Error(`Step ${input.stepId} not found`);

        // ── Assembly: deterministic, no LLM call ───────────────────────
        if (step.kind === 'assembly') {
            return this.assembleAndSave(paper, step);
        }

        // ── LLM-driven kinds (verse / conclusion / introduction) ───────

        // Mark generating immediately so the UI shows a spinner.
        await this.paperRepository.setStepState(input.ownerId, input.paperId, input.stepId, 'generating');

        try {
            const styleGuideContent = await this.loadStyleGuideContent(input.ownerId, paper.styleGuideId);
            const sources = await this.loadSourceContexts(paper);
            const priorAcceptedSteps = collectPriorAccepted(paper, step);

            // Resolve the per-kind emphasis the student configured (or
            // accepted from the rubric default). Assembly steps don't
            // reach this branch; the three LLM-driven kinds map 1:1.
            const stepEmphasis = paper.stepPlan.defaults[step.kind as 'introduction' | 'verse' | 'conclusion'] ?? null;

            const orchestratorInput: ExegesisGenerationInput = {
                kind: step.kind,
                paperPassage: paper.passage,
                verseRef: step.verseRef,
                language: paper.displayLanguage,
                assignmentBrief: paper.assignmentBrief,
                stepEmphasis,
                styleGuideContent,
                sources,
                priorAcceptedSteps,
                regenerationHint: input.regenerationHint ?? null,
            };

            const result = await this.orchestrator.generateStep(orchestratorInput);

            // Run the deterministic style formatter on the LLM's
            // output if both the formatter and a manifest are
            // available. The formatter rewrites inline citations
            // per the manifest's templates and applies ibid for
            // consecutive same-source mentions. If anything is
            // missing, we save the raw markdown and let downstream
            // surfaces (verifier, export) handle it later.
            const manifest = await this.loadStyleManifest(input.ownerId, paper.styleGuideId);
            const formatted = await this.applyStyleFormatter({
                paper,
                step,
                rawMarkdown: result.markdown,
                manifest,
            });

            const parentVersionId = step.current?.id ?? null;
            return await this.paperRepository.appendStepVersion(
                input.ownerId,
                input.paperId,
                input.stepId,
                {
                    markdown: formatted,
                    origin: 'generated',
                    parentVersionId,
                    modelId: result.modelId,
                    regenerationHint: input.regenerationHint ?? null,
                    tokensUsed: result.tokensUsed,
                    verifications: { ...EMPTY_VERIFICATION_SUMMARY },
                }
            );
        } catch (err) {
            // Roll the state back to 'failed' so the UI shows the retry
            // affordance instead of a permanently-spinning card. We
            // swallow secondary errors from the rollback to surface the
            // ORIGINAL cause.
            try {
                await this.paperRepository.setStepState(input.ownerId, input.paperId, input.stepId, 'failed');
            } catch (rollbackErr) {
                console.error('[GenerateStepUseCase] failed to roll state back to failed:', rollbackErr);
            }
            throw err;
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private async loadStyleGuideContent(ownerId: string, styleGuideId: string | null): Promise<string> {
        if (!styleGuideId) return '';
        const guide = await this.styleGuideRepository.getGuide(ownerId, styleGuideId);
        if (!guide) return '';
        return (await this.contentReader.getTextContent(guide.corpusId)) ?? '';
    }

    private async loadSourceContexts(paper: ExegeticalPaper): Promise<ExegesisSourceContext[]> {
        const sorted = [...paper.sources].sort((a, b) => a.order - b.order);
        const contexts: ExegesisSourceContext[] = [];
        for (const source of sorted) {
            const text = await this.contentReader.getTextContent(source.corpusId);
            contexts.push({
                corpusId: source.corpusId,
                sourceType: source.sourceType,
                displayLabel: source.displayLabel,
                citationKey: source.citationKey,
                textContent: text ?? '',
            });
        }
        return contexts;
    }

    private async loadStyleManifest(
        ownerId: string,
        styleGuideId: string | null,
    ): Promise<StyleGuideManifest | null> {
        if (!styleGuideId) return null;
        const guide = await this.styleGuideRepository.getGuide(ownerId, styleGuideId);
        return guide?.manifest ?? null;
    }

    /**
     * Builds the citable-source metadata list from `paper.sources`,
     * filtering out roles whose citations should never be inlined
     * (style template). The metadata is light-touch in v1 — it pulls
     * citationKey + displayLabel from the ProjectSource and uses the
     * displayLabel as the title fallback. v1.5 will fetch richer
     * library_resource metadata (publisher, city, year, volume) so
     * the templates have more to substitute.
     */
    private buildCitableSourceMetadata(paper: ExegeticalPaper): FormatterSourceMetadata[] {
        return paper.sources
            .filter(s => isCitableSourceType(s.sourceType))
            .map(s => ({
                corpusId: s.corpusId,
                citationKey: s.citationKey ?? deriveCitationKey(s.displayLabel),
                fullAuthor: s.citationKey ?? deriveCitationKey(s.displayLabel),
                authorSurnameFirst: s.citationKey ?? deriveCitationKey(s.displayLabel),
                fullTitle: s.displayLabel,
                shortTitle: s.displayLabel,
                publisher: null,
                city: null,
                year: null,
                volume: null,
            }));
    }

    /**
     * Runs the style formatter on the LLM's raw output, threading in
     * the cross-step ibid context (footnote anchors from already-
     * accepted prior steps).
     *
     * No-op when the formatter, the manifest, or the citable-source
     * list is missing. The raw markdown is saved as-is in those
     * cases — generation should still work, just without the
     * deterministic citation rewrite.
     */
    private async applyStyleFormatter(input: {
        paper: ExegeticalPaper;
        step: ExegeticalStep;
        rawMarkdown: string;
        manifest: StyleGuideManifest | null;
    }): Promise<string> {
        const { paper, step, rawMarkdown, manifest } = input;
        if (!this.styleFormatter || !manifest) return rawMarkdown;

        const citableSources = this.buildCitableSourceMetadata(paper);
        if (citableSources.length === 0) return rawMarkdown;

        const priorAnchors = this.collectPriorFootnoteAnchors(paper, step, citableSources);

        const result = this.styleFormatter.format({
            markdown: rawMarkdown,
            manifest,
            citableSources,
            priorFootnoteAnchors: priorAnchors,
        });

        if (result.warnings.length > 0) {
            console.warn(
                '[GenerateStepUseCase] style formatter warnings:',
                result.warnings,
            );
        }

        return result.markdown;
    }

    /**
     * Walks accepted prior steps in canonical order, runs the
     * footnote-anchor extractor on each one's markdown, and returns
     * a flat list. Used so the formatter can apply ibid sequences
     * that span step boundaries (e.g., the conclusion's first cite
     * of Lane is "subsequent" because verse 3 already cited him).
     *
     * If the extractor isn't injected (paranoia), returns empty;
     * within-step ibid still works because the formatter tracks
     * sequence state during a single pass.
     */
    private collectPriorFootnoteAnchors(
        paper: ExegeticalPaper,
        currentStep: ExegeticalStep,
        citableSources: ReadonlyArray<FormatterSourceMetadata>,
    ): PriorFootnoteAnchor[] {
        if (!this.extractFootnoteAnchors) return [];
        const ordered = [...paper.steps]
            .filter(s => s.id !== currentStep.id && s.accepted !== null)
            .sort((a, b) => a.order - b.order);
        const anchors: PriorFootnoteAnchor[] = [];
        for (const s of ordered) {
            const md = s.accepted!.markdown;
            anchors.push(...this.extractFootnoteAnchors(md, citableSources));
        }
        return anchors;
    }

    /**
     * Mechanically assembles introduction → verses → conclusion into one
     * markdown document. No Gemini call. The result is saved as the
     * `current` and `accepted` version of the assembly step in one go,
     * since assembly is fully deterministic — there's nothing for the
     * user to "regenerate".
     */
    private async assembleAndSave(
        paper: ExegeticalPaper,
        step: ExegeticalStep,
    ): Promise<ExegeticalStepVersion> {
        const accepted = paper.steps.filter(s => s.accepted !== null);
        const intro = accepted.find(s => s.kind === 'introduction');
        const verses = accepted.filter(s => s.kind === 'verse').sort((a, b) => a.order - b.order);
        const conclusion = accepted.find(s => s.kind === 'conclusion');

        const lang = paper.displayLanguage;
        const passage = formatPassageReference(paper.passage, lang);
        const sections: string[] = [
            `# ${paper.title || passage}`,
            '',
        ];
        if (intro?.accepted) {
            sections.push('---', '', intro.accepted.markdown, '');
        }
        for (const v of verses) {
            if (v.accepted) sections.push('---', '', v.accepted.markdown, '');
        }
        if (conclusion?.accepted) {
            sections.push('---', '', conclusion.accepted.markdown, '');
        }
        const markdown = sections.join('\n');

        return await this.paperRepository.appendStepVersion(
            paper.ownerId,
            paper.id,
            step.id,
            {
                markdown,
                origin: 'generated',
                parentVersionId: step.current?.id ?? null,
                modelId: 'mechanical-assembly',
                regenerationHint: null,
                tokensUsed: 0,
                verifications: { ...EMPTY_VERIFICATION_SUMMARY },
            }
        );
    }
}

/**
 * Picks the prior-step context relevant to generating `step`.
 *   - verse:        []  (verses don't reference each other)
 *   - conclusion:   accepted verses, in canonical order
 *   - introduction: accepted verses + accepted conclusion (introduction
 *                   is written LAST and reflects what the body did)
 *   - assembly:     unused (handled before this function is called)
 */
function collectPriorAccepted(paper: ExegeticalPaper, step: ExegeticalStep): ExegesisPriorStep[] {
    if (step.kind === 'verse') return [];
    const all = [...paper.steps].sort((a, b) => a.order - b.order);
    const acceptedVerses = all.filter(s => s.kind === 'verse' && s.accepted);
    if (step.kind === 'conclusion') {
        return acceptedVerses.map(toPriorStep);
    }
    if (step.kind === 'introduction') {
        const acceptedConclusion = all.find(s => s.kind === 'conclusion' && s.accepted);
        const list: ExegesisPriorStep[] = acceptedVerses.map(toPriorStep);
        if (acceptedConclusion?.accepted) list.push(toPriorStep(acceptedConclusion));
        return list;
    }
    return [];
}

function toPriorStep(s: ExegeticalStep): ExegesisPriorStep {
    return {
        kind: s.kind,
        verseRef: s.verseRef,
        markdown: s.accepted!.markdown,
    };
}

/**
 * Derives a citation key from a display label when the user didn't
 * pin one explicitly. Picks the first surname-shaped token (capital
 * letter + lowercase) so "Lane WBC 47a, pp. 1-30" → "Lane".
 *
 * Conservative — falls back to the whole label when nothing matches
 * so the formatter still has SOMETHING to attempt a lookup against.
 */
function deriveCitationKey(displayLabel: string): string {
    const trimmed = displayLabel.trim();
    if (!trimmed) return '';
    // First word that starts with an uppercase letter and continues
    // with lowercase letters (typical surname shape: "Lane", "Bruce").
    const surnameMatch = trimmed.match(/\b[A-Z][a-z]{2,}\b/);
    if (surnameMatch) return surnameMatch[0];
    return trimmed.split(/\s+/)[0] ?? trimmed;
}
