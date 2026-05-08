import type {
    CanonicalVerseAnalysis,
    ComposeIntroductionInput,
    ComposerSourceMetadata,
    ExegeticalPaper,
    ExegeticalStep,
    ExegeticalStepVersion,
    FormatterSourceMetadata,
    IExegeticalPaperRepository,
    IIntroductionComposer,
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
 * Composes the introduction section LAST in the academic flow —
 * after both verse analyses AND the conclusion are accepted.
 *
 * Pipeline:
 *   1. Load paper + locate intro step (kind='introduction').
 *   2. Validate every verse step has accepted `canonicalAnalysis`.
 *   3. Validate the conclusion step has an accepted markdown
 *      version (the introduction reads it to know the thesis).
 *   4. Resolve style guide.
 *   5. Build composer + formatter source metadata.
 *   6. Call `IIntroductionComposer`.
 *   7. Apply `IStyleFormatter` post-process when manifest available.
 *   8. Append the markdown as a new version of the intro step.
 *
 * Failures: state rolls back on the intro step.
 */
export class ComposeIntroductionFromAnalysesUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private styleGuideRepository: IUserStyleGuideRepository,
        private contentReader: IResourceContentReader,
        private composer: IIntroductionComposer,
        private styleFormatter?: IStyleFormatter,
    ) { }

    async execute(input: ComposeIntroductionFromAnalysesUseCaseInput): Promise<ExegeticalStepVersion> {
        if (!input.ownerId || !input.paperId) {
            throw new Error('ComposeIntroductionFromAnalysesUseCase: ownerId and paperId required');
        }

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);

        const introStep = paper.steps.find(s => s.kind === 'introduction');
        if (!introStep) {
            throw new Error('Paper has no introduction step. Run seedSteps first.');
        }

        const verseAnalyses = collectAcceptedVerseAnalyses(paper);
        if (verseAnalyses.length === 0) {
            throw new Error(
                'ComposeIntroductionFromAnalysesUseCase: paper has no accepted verse analyses. ' +
                'Run AnalyzeVerseCanonicallyUseCase + accept for each verse step before composing the introduction.',
            );
        }

        const conclusionStep = paper.steps.find(s => s.kind === 'conclusion');
        const acceptedConclusion = conclusionStep?.accepted?.markdown ?? '';
        if (!acceptedConclusion.trim()) {
            throw new Error(
                'ComposeIntroductionFromAnalysesUseCase: the introduction is composed LAST. ' +
                'Compose and accept the conclusion before composing the introduction.',
            );
        }

        const reservation = await ExegesisCreditReservation.open(
            input.ownerId,
            'composeIntroductionFromAnalyses',
        );

        await this.paperRepository.setStepState(input.ownerId, input.paperId, introStep.id, 'generating');

        try {
            const styleGuideContent = await this.loadStyleGuideContent(input.ownerId, paper.styleGuideId);
            const manifest = await this.loadStyleManifest(input.ownerId, paper.styleGuideId);

            // Plan-pinned sources for the introduction step. Composer
            // treats them as a contract.
            const pinnedIds = new Set(
                paper.stepPlan.perStep[introStep.id]?.pinnedSources ?? [],
            );
            const pinnedSourceKeys = paper.sources
                .filter(s => pinnedIds.has(s.id) && s.citationKey)
                .map(s => s.citationKey!);

            const composerSources = await buildComposerSourcesWithPinnedContent(
                paper,
                pinnedIds,
                this.contentReader,
            );
            const citableSources = buildFormatterSources(paper);

            const composerInput: ComposeIntroductionInput = {
                paperPassage: paper.passage,
                language: paper.displayLanguage,
                assignmentBrief: paper.assignmentBrief,
                verseAnalyses,
                acceptedConclusionMarkdown: acceptedConclusion,
                styleGuideContent,
                styleGuideManifest: manifest,
                sources: composerSources,
                pinnedSourceKeys,
                regenerationHint: input.regenerationHint ?? null,
            };

            reservation.markLlmContacted();
            let result = await this.composer.composeIntroduction(composerInput);

            // [#126 Approach B] Post-validation retry on missing pinned keys.
            const missing = pinnedSourceKeys.filter(
                key => !result.markdown.toLowerCase().includes(key.toLowerCase()),
            );
            if (missing.length > 0) {
                console.warn('[exegesis][#126] intro composer missed pinned keys, retrying once:', missing);
                const retryHint = paper.displayLanguage === 'en'
                    ? `CRITICAL: your previous output skipped pinned sources [${missing.join(', ')}]. You MUST cite each one at least once in this introduction. Use the source content provided in the registry to ground the citation. Do NOT substitute another source.`
                    : `CRÍTICO: tu salida anterior se saltó las fuentes asignadas [${missing.join(', ')}]. DEBES citar cada una al menos una vez en esta introducción. Usá el contenido de la fuente provisto en el registro para anclar la cita. NO sustituyas por otra fuente.`;
                try {
                    const retryResult = await this.composer.composeIntroduction({
                        ...composerInput,
                        regenerationHint: retryHint,
                    });
                    const stillMissing = pinnedSourceKeys.filter(
                        key => !retryResult.markdown.toLowerCase().includes(key.toLowerCase()),
                    );
                    if (stillMissing.length === 0 || stillMissing.length < missing.length) {
                        result = retryResult;
                    }
                } catch (retryErr) {
                    console.warn('[exegesis][#126] intro retry failed:', retryErr);
                }
            }

            const finalMarkdown = await this.applyFormatter(result.markdown, manifest, citableSources);

            const parentVersionId = introStep.current?.id ?? null;
            return await this.paperRepository.appendStepVersion(
                input.ownerId,
                input.paperId,
                introStep.id,
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
                await this.paperRepository.setStepState(input.ownerId, input.paperId, introStep.id, 'failed');
            } catch (rollbackErr) {
                console.error('[ComposeIntroductionFromAnalysesUseCase] roll-back to failed errored:', rollbackErr);
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
                console.warn('[ComposeIntroductionFromAnalysesUseCase] formatter warnings:', formatted.warnings);
            }
            return formatted.markdown;
        } catch (err) {
            console.error('[ComposeIntroductionFromAnalysesUseCase] formatter threw, returning raw markdown:', err);
            return rawMarkdown;
        }
    }
}

// ── Shared helpers ──────────────────────────────────────────────────────

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

async function buildComposerSourcesWithPinnedContent(
    paper: ExegeticalPaper,
    pinnedIds: ReadonlySet<string>,
    contentReader: IResourceContentReader,
): Promise<ComposerSourceMetadata[]> {
    const citable = paper.sources.filter(s => isCitableSourceType(s.sourceType));
    return Promise.all(citable.map(async s => {
        const key = s.citationKey ?? deriveCitationKey(s.displayLabel);
        const isPinned = pinnedIds.has(s.id);
        const base: ComposerSourceMetadata = {
            citationKey: key,
            author: key,
            title: s.displayLabel,
            isPinned,
        };
        if (!isPinned) return base;
        try {
            const text = await contentReader.getTextContent(s.corpusId);
            return { ...base, textContent: text ?? '' };
        } catch (err) {
            console.warn('[compose] failed to load pinned source textContent:', s.corpusId, err);
            return base;
        }
    }));
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

export interface ComposeIntroductionFromAnalysesUseCaseInput {
    ownerId: string;
    paperId: string;
    regenerationHint?: string | null;
}
