import type {
    ExegesisGenerationInput,
    ExegesisPriorStep,
    ExegesisSourceContext,
    ExegeticalPaper,
    ExegeticalStep,
    ExegeticalStepVersion,
    GenerateStepInput,
    IExegesisOrchestrator,
    IExegeticalPaperRepository,
    IResourceContentReader,
    IUserStyleGuideRepository,
} from '@dosfilos/domain';
import {
    EMPTY_VERIFICATION_SUMMARY,
    formatPassageReference,
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
export class GenerateStepUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private styleGuideRepository: IUserStyleGuideRepository,
        private contentReader: IResourceContentReader,
        private orchestrator: IExegesisOrchestrator,
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

            const parentVersionId = step.current?.id ?? null;
            return await this.paperRepository.appendStepVersion(
                input.ownerId,
                input.paperId,
                input.stepId,
                {
                    markdown: result.markdown,
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
