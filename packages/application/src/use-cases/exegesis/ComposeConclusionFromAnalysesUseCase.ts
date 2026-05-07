import type {
    CanonicalVerseAnalysis,
    ComposeConclusionInput,
    ComposerSourceMetadata,
    ExegeticalPaper,
    ExegeticalStep,
    ExegeticalStepVersion,
    FormatterSourceMetadata,
    IConclusionComposer,
    IExegeticalPaperRepository,
    IResourceContentReader,
    IStyleFormatter,
    IUserStyleGuideRepository,
    StyleGuideManifest,
} from '@dosfilos/domain';
import {
    EMPTY_VERIFICATION_SUMMARY,
    isCitableSourceType,
} from '@dosfilos/domain';
import { ExegesisCreditReservation } from '../../services/ExegesisCreditReservation';

/**
 * Composes the conclusion section from accepted canonical verse
 * analyses and persists it as a new version of the conclusion-kind
 * step.
 *
 * Pipeline:
 *   1. Load paper + locate the conclusion step (kind='conclusion').
 *   2. Validate every verse step has an accepted `canonicalAnalysis`.
 *   3. Resolve the style guide.
 *   4. Build composer + formatter source metadata.
 *   5. Call `IConclusionComposer`.
 *   6. Apply `IStyleFormatter` post-process when manifest available.
 *   7. Append the markdown as a new version of the conclusion step.
 *
 * The new version is NOT auto-accepted — the user reviews it and
 * clicks "Accept" the same way they do for legacy generated steps.
 *
 * Failures: state rolls back to 'failed' on the conclusion step,
 * error re-thrown.
 */
export class ComposeConclusionFromAnalysesUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private styleGuideRepository: IUserStyleGuideRepository,
        private contentReader: IResourceContentReader,
        private composer: IConclusionComposer,
        private styleFormatter?: IStyleFormatter,
    ) { }

    async execute(input: ComposeConclusionFromAnalysesUseCaseInput): Promise<ExegeticalStepVersion> {
        if (!input.ownerId || !input.paperId) {
            throw new Error('ComposeConclusionFromAnalysesUseCase: ownerId and paperId required');
        }

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);

        const conclusionStep = paper.steps.find(s => s.kind === 'conclusion');
        if (!conclusionStep) {
            throw new Error('Paper has no conclusion step. Run seedSteps first.');
        }

        const verseAnalyses = collectAcceptedVerseAnalyses(paper);
        if (verseAnalyses.length === 0) {
            throw new Error(
                'ComposeConclusionFromAnalysesUseCase: paper has no accepted verse analyses. ' +
                'Run AnalyzeVerseCanonicallyUseCase + accept the result for each verse step before composing the conclusion.',
            );
        }

        const reservation = await ExegesisCreditReservation.open(
            input.ownerId,
            'composeConclusionFromAnalyses',
        );

        await this.paperRepository.setStepState(input.ownerId, input.paperId, conclusionStep.id, 'generating');

        try {
            const styleGuideContent = await this.loadStyleGuideContent(input.ownerId, paper.styleGuideId);
            const manifest = await this.loadStyleManifest(input.ownerId, paper.styleGuideId);
            const composerSources = buildComposerSources(paper);
            const citableSources = buildFormatterSources(paper);

            const composerInput: ComposeConclusionInput = {
                paperPassage: paper.passage,
                language: paper.displayLanguage,
                assignmentBrief: paper.assignmentBrief,
                verseAnalyses,
                styleGuideContent,
                styleGuideManifest: manifest,
                sources: composerSources,
                regenerationHint: input.regenerationHint ?? null,
            };

            reservation.markLlmContacted();
            const result = await this.composer.composeConclusion(composerInput);

            const finalMarkdown = await this.applyFormatter(result.markdown, manifest, citableSources);

            const parentVersionId = conclusionStep.current?.id ?? null;
            return await this.paperRepository.appendStepVersion(
                input.ownerId,
                input.paperId,
                conclusionStep.id,
                {
                    markdown: finalMarkdown,
                    origin: 'generated',
                    parentVersionId,
                    modelId: result.modelId,
                    regenerationHint: input.regenerationHint ?? null,
                    tokensUsed: result.tokensUsed,
                    verifications: { ...EMPTY_VERIFICATION_SUMMARY },
                },
            );
        } catch (err) {
            try {
                await this.paperRepository.setStepState(input.ownerId, input.paperId, conclusionStep.id, 'failed');
            } catch (rollbackErr) {
                console.error('[ComposeConclusionFromAnalysesUseCase] roll-back to failed errored:', rollbackErr);
            }
            await reservation.refundIfPreLlm();
            throw err;
        }
    }

    private async loadStyleGuideContent(ownerId: string, styleGuideId: string | null): Promise<string> {
        if (!styleGuideId) return '';
        const guide = await this.styleGuideRepository.getGuide(ownerId, styleGuideId);
        if (!guide) return '';
        return (await this.contentReader.getTextContent(guide.corpusId)) ?? '';
    }

    private async loadStyleManifest(ownerId: string, styleGuideId: string | null): Promise<StyleGuideManifest | null> {
        if (!styleGuideId) return null;
        const guide = await this.styleGuideRepository.getGuide(ownerId, styleGuideId);
        return guide?.manifest ?? null;
    }

    private async applyFormatter(
        rawMarkdown: string,
        manifest: StyleGuideManifest | null,
        citableSources: ReadonlyArray<FormatterSourceMetadata>,
    ): Promise<string> {
        if (!this.styleFormatter || !manifest || citableSources.length === 0) return rawMarkdown;
        try {
            const formatted = this.styleFormatter.format({
                markdown: rawMarkdown,
                manifest,
                citableSources,
                priorFootnoteAnchors: [],
            });
            if (formatted.warnings.length > 0) {
                console.warn('[ComposeConclusionFromAnalysesUseCase] formatter warnings:', formatted.warnings);
            }
            return formatted.markdown;
        } catch (err) {
            console.error('[ComposeConclusionFromAnalysesUseCase] formatter threw, returning raw markdown:', err);
            return rawMarkdown;
        }
    }
}

// ── Shared helpers (mirror ComposeAcademicPaperUseCase) ─────────────────

function collectAcceptedVerseAnalyses(paper: ExegeticalPaper): CanonicalVerseAnalysis[] {
    return paper.steps
        .filter((s: ExegeticalStep) => s.kind === 'verse' && s.accepted?.canonicalAnalysis)
        .sort((a, b) => a.order - b.order)
        .map(s => s.accepted!.canonicalAnalysis!);
}

function buildComposerSources(paper: ExegeticalPaper): ComposerSourceMetadata[] {
    return paper.sources
        .filter(s => isCitableSourceType(s.sourceType))
        .map(s => {
            const key = s.citationKey ?? deriveCitationKey(s.displayLabel);
            return { citationKey: key, author: key, title: s.displayLabel };
        });
}

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

function deriveCitationKey(displayLabel: string): string {
    const trimmed = (displayLabel ?? '').trim();
    if (!trimmed) return 'Source';
    return trimmed.split(/[\s,;:.\-—]+/)[0] || 'Source';
}

export interface ComposeConclusionFromAnalysesUseCaseInput {
    ownerId: string;
    paperId: string;
    regenerationHint?: string | null;
}
