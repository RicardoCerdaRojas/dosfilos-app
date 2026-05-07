import type {
    CitationStatus,
    ExegeticalPaper,
    ExegeticalStep,
    ExegeticalStepVersion,
    ICitationVerifier,
    IExegeticalPaperRepository,
    IResourceContentReader,
    ProjectSource,
    VerifiedCitation,
    VerificationSummary,
    VerifierSource,
    VerifierSourceChunk,
} from '@dosfilos/domain';
import { isCitableSourceType } from '@dosfilos/domain';
import { ExegesisCreditReservation } from '../../services/ExegesisCreditReservation';

export interface VerifyStepCitationsInput {
    ownerId: string;
    paperId: string;
    stepId: string;
    /**
     * Which version of the step to verify. Optional — when omitted the
     * use case picks `accepted ?? current`, matching the version the
     * UI displays.
     */
    versionId?: string;
}

export interface VerifyStepCitationsOutput {
    /** The persisted summary (also written to the version's `verifications`). */
    summary: VerificationSummary;
    /** Per-citation verdicts for the UI dialog. NOT persisted. */
    citations: VerifiedCitation[];
    /** The version that was verified, for the UI to highlight. */
    versionId: string;
}

/**
 * Runs the configured `ICitationVerifier` over a step version's
 * markdown and persists the resulting summary on that version.
 *
 * Per-citation results are returned to the caller (the UI surfaces
 * them in a dialog) but NOT persisted — they're cheap to recompute
 * on next click and would inflate the Firestore doc unnecessarily.
 *
 * Source resolution mirrors `GenerateStepUseCase.loadSourceContexts`:
 *   - `mode: 'extracted-excerpts'` → one chunk per excerpt with the
 *     excerpt's `sourceLocation` as the page hint.
 *   - `mode: 'full-document'`     → one chunk with the whole text and
 *                                   no page hint (page-mismatch
 *                                   detection is skipped for these).
 *
 * Style-template sources (and any other non-citable type) are excluded
 * up front — the formatter never inlines them, and the verifier
 * shouldn't either.
 */
export class VerifyStepCitationsUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private contentReader: IResourceContentReader,
        private verifier: ICitationVerifier,
    ) { }

    async execute(input: VerifyStepCitationsInput): Promise<VerifyStepCitationsOutput> {
        const { ownerId, paperId, stepId } = input;
        if (!ownerId || !paperId || !stepId) {
            throw new Error('VerifyStepCitationsUseCase: ownerId, paperId, stepId required');
        }

        const paper = await this.paperRepository.getPaper(ownerId, paperId);
        if (!paper) throw new Error(`Paper ${paperId} not found`);
        const step = paper.steps.find(s => s.id === stepId);
        if (!step) throw new Error(`Step ${stepId} not found`);

        const target = pickVersion(step, input.versionId);
        if (!target) throw new Error(`No version available to verify on step ${stepId}`);

        const reservation = await ExegesisCreditReservation.open(
            ownerId,
            'verifyStepCitations',
        );

        try {
            const sources = await this.buildVerifierSources(paper);
            reservation.markLlmContacted();
            const { citations } = await this.verifier.verify({
                markdown: target.markdown,
                sources,
                userId: ownerId,
            });

            const summary = buildSummary(citations);
            await this.paperRepository.setStepVersionVerifications(
                ownerId,
                paperId,
                stepId,
                target.id,
                summary,
            );

            return { summary, citations, versionId: target.id };
        } catch (err) {
            await reservation.refundIfPreLlm();
            throw err;
        }
    }

    private async buildVerifierSources(paper: ExegeticalPaper): Promise<VerifierSource[]> {
        const out: VerifierSource[] = [];
        for (const source of paper.sources) {
            if (!isCitableSourceType(source.sourceType)) continue;
            const chunks = await this.buildChunks(source);
            if (chunks.length === 0) continue;
            out.push({
                corpusId: source.corpusId,
                citationKey: source.citationKey,
                fullAuthor: source.citationKey,
                displayLabel: source.displayLabel,
                chunks,
            });
        }
        return out;
    }

    private async buildChunks(source: ProjectSource): Promise<VerifierSourceChunk[]> {
        if (source.mode === 'extracted-excerpts') {
            const excerptChunks = source.excerpts
                .map<VerifierSourceChunk>(excerpt => ({
                    text: excerpt.text,
                    pageHint: excerpt.sourceLocation || null,
                }))
                .filter(c => c.text.trim().length > 0);

            // Fallback chunk: also pull the full library-resource text
            // when available. The user's curated excerpts are the
            // primary evidence (preserving page-mismatch detection),
            // but a citation may reference content elsewhere in the
            // resource — the verifier should not return "not found"
            // just because the cited passage wasn't curated for paper
            // writing. The fallback chunk has no `pageHint` so any
            // match against it doesn't trigger page-mismatch.
            if (source.sourceLibraryResourceId) {
                const fullText = await this.contentReader.getTextContent(
                    source.sourceLibraryResourceId,
                );
                if (fullText && fullText.trim().length > 0) {
                    excerptChunks.push({ text: fullText, pageHint: null });
                }
            }
            return excerptChunks;
        }
        // 'full-document' (or legacy sources without `mode`): pull the
        // whole corpus text. Page-mismatch detection is impossible
        // here — the verifier handles a null `pageHint` gracefully.
        const text = await this.contentReader.getTextContent(source.corpusId);
        if (!text) return [];
        return [{ text, pageHint: null }];
    }
}

function pickVersion(
    step: ExegeticalStep,
    versionId: string | undefined,
): ExegeticalStepVersion | null {
    if (versionId) {
        return step.versions.find(v => v.id === versionId) ?? null;
    }
    return step.accepted ?? step.current;
}

function buildSummary(citations: VerifiedCitation[]): VerificationSummary {
    const counts: Record<CitationStatus, number> = {
        verified: 0,
        'page-mismatch': 0,
        'not-found': 0,
        'fuzzy-low': 0,
        'manual-pending': 0,
    };
    for (const c of citations) counts[c.status]++;
    return {
        lastRunAt: new Date(),
        verifierVersion: 'fuzzy-v1',
        counts: {
            verified: counts.verified,
            pageMismatch: counts['page-mismatch'],
            notFound: counts['not-found'],
            fuzzyLow: counts['fuzzy-low'],
            manualPending: counts['manual-pending'],
        },
        totalCitations: citations.length,
    };
}
