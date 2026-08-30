import type {
    AnalyzeVerseInput,
    CanonicalVerseAnalysis,
    ExegeticalPaper,
    ExegeticalStep,
    ExegeticalStepVersion,
    ExegesisSourceContext,
    ICanonicalVerseAnalyzer,
    ICuratedCorpusRetriever,
    CuratedCorpusResult,
    IExegeticalPaperRepository,
    IOriginalLanguageBibleProvider,
    IResourceContentReader,
    IUserStyleGuideRepository,
    PassageReference,
    SourceCitation,
} from '@dosfilos/domain';
import {
    EMPTY_VERIFICATION_SUMMARY,
    computeRubricCompliance,
    formatPassageReference,
} from '@dosfilos/domain';
import { ExegesisCreditReservation } from '../../services/ExegesisCreditReservation';

/**
 * Generates a `CanonicalVerseAnalysis` for one verse step — the
 * analysis stage of the two-stage architecture.
 *
 * Coexists with `GenerateStepUseCase` during the migration:
 *   - `GenerateStepUseCase` produces markdown (legacy / interim path
 *     the current UI consumes).
 *   - `AnalyzeVerseCanonicallyUseCase` produces structured `CanonicalVerseAnalysis`
 *     (target path; composers downstream emit format-specific
 *     markdown from it).
 *
 * Both append to the same `ExegeticalStep.versions` history. New
 * analysis versions carry both `markdown` (initially empty until the
 * composer runs) and `canonicalAnalysis` (the structured payload).
 *
 * Sanitization: the LLM may hallucinate source keys that don't exist
 * in the configured corpus. This use case scrubs every `sourceKey`
 * reference in the structured payload against the actual sources on
 * the paper, dropping any unmatched references rather than
 * propagating fabricated citations.
 *
 * Errors:
 *   - Missing paper / step → throws.
 *   - Step kind not 'verse' → throws (this use case is verse-specific
 *     by design; intro and conclusion compose from accepted verse
 *     analyses, handled by composer use cases).
 *   - Analyzer throws → state rolls back to 'failed', error
 *     re-thrown so the UI's retry affordance kicks in.
 */
export class AnalyzeVerseCanonicallyUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private styleGuideRepository: IUserStyleGuideRepository,
        private contentReader: IResourceContentReader,
        private analyzer: ICanonicalVerseAnalyzer,
        // Optional: when wired, the use case loads the verse's
        // original-language text (Greek for NT via SBL GNT, Hebrew for
        // OT via WLC) and threads it into the analyzer prompt so the
        // model isn't guessing the base text from training memory.
        private originalLanguageProvider?: IOriginalLanguageBibleProvider,
        /**
         * Cuando está cableado, las fuentes con receta dejan de inlinear su
         * corpus entero y piden solo el material que habla de ESTE versículo.
         * Sin él, el caso de uso se comporta como antes — que es lo que hace
         * falta para los papers viejos, cuyas fuentes no tienen receta.
         */
        private corpusRetriever?: ICuratedCorpusRetriever,
    ) { }

    async execute(input: AnalyzeVerseCanonicallyUseCaseInput): Promise<ExegeticalStepVersion> {
        if (!input.ownerId || !input.paperId || !input.stepId) {
            throw new Error('AnalyzeVerseCanonicallyUseCase: ownerId, paperId, stepId required');
        }

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);
        const step = paper.steps.find(s => s.id === input.stepId);
        if (!step) throw new Error(`Step ${input.stepId} not found`);
        if (step.kind !== 'verse') {
            throw new Error(
                `AnalyzeVerseCanonicallyUseCase only handles 'verse' kind. Got '${step.kind}'. ` +
                `Introduction and conclusion are produced by composer use cases over accepted verse analyses.`,
            );
        }
        if (!step.verseRef) {
            throw new Error(`Verse step ${input.stepId} has no verseRef`);
        }

        // Reserve exégesis credits BEFORE any state mutation so
        // InsufficientExegesisCreditsError aborts cleanly without
        // leaving the step stuck in 'generating'.
        const reservation = await ExegesisCreditReservation.open(
            input.ownerId,
            'analyzeVerseCanonically',
        );

        await this.paperRepository.setStepState(input.ownerId, input.paperId, input.stepId, 'generating');

        try {
            const styleGuideContent = await this.loadStyleGuideContent(input.ownerId, paper.styleGuideId);
            const sources = await this.loadSourceContexts(paper, step.id, step.verseRef!);
            const priorAcceptedAnalyses = collectPriorAcceptedAnalyses(paper, step);
            const stepEmphasis = paper.stepPlan.defaults.verse ?? null;

            const missingSourceTypes = paper.rubric
                ? computeRubricCompliance(
                    paper.sources.map(s => s.sourceType),
                    paper.rubric,
                ).requirements.filter(r => !r.satisfied && r.required > 0).map(r => ({
                    sourceType: r.sourceType,
                    minimum: r.required,
                    have: r.have,
                }))
                : [];

            const originalLanguageText = await this.loadOriginalLanguageText(step.verseRef);

            const analyzerInput: AnalyzeVerseInput = {
                paperPassage: paper.passage,
                verseRef: step.verseRef,
                originalLanguageText,
                language: paper.displayLanguage,
                assignmentBrief: paper.assignmentBrief,
                stepEmphasis,
                styleGuideContent,
                sources,
                priorAcceptedAnalyses,
                regenerationHint: input.regenerationHint ?? null,
                missingSourceTypes,
            };

            reservation.markLlmContacted();
            const result = await this.analyzer.analyzeVerse(analyzerInput);

            // Sanitize hallucinated source keys against the actual
            // configured corpus. Any unmatched key gets dropped from
            // its containing reference; entries whose only source
            // references were dropped get filtered out wholesale to
            // avoid leaving broken citations downstream.
            const validKeys = new Set(
                paper.sources
                    .map(s => s.citationKey)
                    .filter((k): k is string => Boolean(k && k.trim())),
            );
            const sanitizedAnalysis = sanitizeSourceReferences(result.analysis, validKeys);

            const parentVersionId = step.current?.id ?? null;
            return await this.paperRepository.appendStepVersion(
                input.ownerId,
                input.paperId,
                input.stepId,
                {
                    // Markdown stays empty for now — composers fill it
                    // in a separate step. Existing UI surfaces that
                    // expect markdown will need to either (a) consume
                    // the structured analysis directly via study mode
                    // or (b) trigger a composer to render markdown
                    // for paper view.
                    markdown: '',
                    origin: 'generated',
                    parentVersionId,
                    modelId: result.modelId,
                    regenerationHint: input.regenerationHint ?? null,
                    tokensUsed: result.tokensUsed,
                    verifications: { ...EMPTY_VERIFICATION_SUMMARY },
                    canonicalAnalysis: sanitizedAnalysis,
                },
            );
        } catch (err) {
            try {
                await this.paperRepository.setStepState(input.ownerId, input.paperId, input.stepId, 'failed');
            } catch (rollbackErr) {
                console.error('[AnalyzeVerseCanonicallyUseCase] failed to roll state back to failed:', rollbackErr);
            }
            // Refund the reservation when the failure happened BEFORE
            // the LLM was contacted. Post-LLM failures (Gemini error,
            // parse failure, persist hiccup) keep the charge — the
            // tokens were spent for real.
            await reservation.refundIfPreLlm();
            throw err;
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /**
     * Loads the original-language text for the verse range and returns
     * it as a single string. Returns null when no provider is wired,
     * the provider doesn't support the book, or the fetch fails — the
     * analyzer falls back to whatever it knows from training.
     */
    /**
     * Le pide al corpus el material de este versículo.
     *
     * Solo participan las fuentes con receta: son las que declaran qué hojas
     * admitió el trabajo, y sin ese recorte la consulta traería páginas que el
     * usuario dejó afuera.
     *
     * Un fallo devuelve `null` y el caso de uso cae al camino anterior. Un paso
     * con el corpus viejo es peor que uno con el material justo; un paso que no
     * se genera es peor que los dos.
     */
    private async retrieveCurated(
        paper: ExegeticalPaper,
        verseRef: PassageReference,
    ): Promise<CuratedCorpusResult | null> {
        if (!this.corpusRetriever) return null;
        const scopes = paper.sources
            .filter(s => (s.excerptRecipe?.sheetRanges.length ?? 0) > 0)
            .map(s => ({
                resourceId: s.sourceLibraryResourceId ?? s.corpusId,
                sheetRanges: s.excerptRecipe!.sheetRanges,
                pinnedRanges: s.excerptRecipe!.pinnedRanges,
            }));
        if (scopes.length === 0) return null;

        const label = formatPassageReference(verseRef, paper.displayLanguage);
        const brief = paper.assignmentBrief?.trim().slice(0, 500) ?? '';
        try {
            return await this.corpusRetriever.retrieve({
                userId: paper.ownerId,
                query: brief ? `${label} — ${brief}` : label,
                sources: scopes,
                budgetChars: CORPUS_BUDGET_CHARS,
            });
        } catch (err) {
            console.warn('[AnalyzeVerseCanonically] el corpus no respondió; se usa lo guardado', {
                error: (err as Error).message,
            });
            return null;
        }
    }

    private async loadOriginalLanguageText(verseRef: PassageReference): Promise<string | null> {
        if (!this.originalLanguageProvider) return null;
        const provider = this.originalLanguageProvider;
        if (!provider.supports(verseRef.bookId)) return null;
        try {
            const verses = await provider.getChapterContent(verseRef.bookId, verseRef.chapterStart);
            const start = (verseRef.verseStart ?? 1) - 1;
            const end = verseRef.verseEnd ?? verseRef.verseStart ?? verses.length;
            const slice = verses.slice(start, end);
            if (slice.length === 0) return null;
            const numbered = slice.map((text, i) => {
                const v = (verseRef.verseStart ?? 1) + i;
                return `${verseRef.chapterStart}:${v} ${text}`;
            });
            return numbered.join(' ');
        } catch (err) {
            console.warn('[AnalyzeVerseCanonicallyUseCase] original-language load failed:', err);
            return null;
        }
    }

    private async loadStyleGuideContent(ownerId: string, styleGuideId: string | null): Promise<string> {
        if (!styleGuideId) return '';
        const guide = await this.styleGuideRepository.getGuide(ownerId, styleGuideId);
        if (!guide) return '';
        return (await this.contentReader.getTextContent(guide.corpusId)) ?? '';
    }

    /**
     * El material que este paso le manda al modelo.
     *
     * Dos regímenes conviviendo a propósito. Las fuentes con receta consultan
     * el corpus y traen lo que habla del versículo; las que no la tienen —papers
     * anteriores al selector— siguen inlineando lo que siempre inlinearon.
     * Migrar por uso y no por lote es lo que deja publicar esto sin tocar
     * trabajos a medio hacer.
     */
    private async loadSourceContexts(
        paper: ExegeticalPaper,
        stepId: string,
        verseRef: PassageReference,
    ): Promise<ExegesisSourceContext[]> {
        const curated = await this.retrieveCurated(paper, verseRef);
        // Mirrors GenerateStepUseCase.loadSourceContexts: pin-aware,
        // primary-first ordering, and async content fetch via the
        // injected `IResourceContentReader` for full-document sources.
        // Curated-excerpt sources concatenate their pre-reviewed
        // chunks inline with anchor separators so the analyzer can
        // cite using the exact anchors the user accepted.
        const pinnedIds = new Set(paper.stepPlan.perStep[stepId]?.pinnedSources ?? []);
        const sorted = [...paper.sources].sort((a, b) => a.order - b.order);

        const contexts: ExegesisSourceContext[] = [];
        for (const source of sorted) {
            const priority: 'primary' | 'secondary' = pinnedIds.has(source.id) ? 'primary' : 'secondary';
            const retrieved = curated?.byResource[source.sourceLibraryResourceId ?? source.corpusId];
            if (retrieved) {
                // Mismos separadores con ancla que el camino anterior: el
                // prompt y el verificador de citas no tienen por qué notar de
                // dónde salió el fragmento.
                const textContent = retrieved
                    .map(c => `--- ${anchorFor(c)} ---\n${c.text}`)
                    .join('\n\n');
                contexts.push({
                    corpusId: source.corpusId,
                    sourceType: source.sourceType,
                    displayLabel: source.displayLabel,
                    citationKey: source.citationKey,
                    textContent,
                    excerptAnchors: retrieved.map(anchorFor),
                    priority,
                });
                continue;
            }
            if (source.mode === 'extracted-excerpts') {
                const textContent = source.excerpts
                    .map(e => `--- ${e.sourceLocation} ---\n${e.text}`)
                    .join('\n\n');
                const excerptAnchors = source.excerpts.map(e => e.sourceLocation);
                contexts.push({
                    corpusId: source.corpusId,
                    sourceType: source.sourceType,
                    displayLabel: source.displayLabel,
                    citationKey: source.citationKey,
                    textContent,
                    excerptAnchors,
                    priority,
                });
            } else {
                // 'full-document' (or legacy without `mode`): pull the
                // full extracted text via the content reader.
                const text = await this.contentReader.getTextContent(source.corpusId);
                contexts.push({
                    corpusId: source.corpusId,
                    sourceType: source.sourceType,
                    displayLabel: source.displayLabel,
                    citationKey: source.citationKey,
                    textContent: text ?? '',
                    priority,
                });
            }
        }

        // Primary first — same convention as GenerateStepUseCase so
        // the analyzer's prompt sees pinned sources before the rest.
        contexts.sort((a, b) => {
            const aPrimary = a.priority === 'primary' ? 0 : 1;
            const bPrimary = b.priority === 'primary' ? 0 : 1;
            return aPrimary - bPrimary;
        });
        return contexts;
    }
}

/**
 * Walks every `sourceKey` field in the analysis and drops references
 * to keys not present in the configured corpus. Same hallucination
 * salvaguarda used in v1.5 for excerpt extraction — applied here at
 * the citation graph of the structured analysis.
 *
 * Pure: returns a new analysis; never mutates the input.
 */
function sanitizeSourceReferences(
    analysis: CanonicalVerseAnalysis,
    validKeys: Set<string>,
): CanonicalVerseAnalysis {
    const cleanCitations = (citations: ReadonlyArray<SourceCitation>): SourceCitation[] =>
        citations.filter(c => validKeys.has(c.sourceKey));

    return {
        ...analysis,
        lexicalAnalyses: analysis.lexicalAnalyses.map(la => ({
            ...la,
            generalSemanticRange: {
                ...la.generalSemanticRange,
                sources: cleanCitations(la.generalSemanticRange.sources),
            },
            loadingSources: cleanCitations(la.loadingSources),
        })),
        historicalContext: analysis.historicalContext.map(hc => ({
            ...hc,
            sources: cleanCitations(hc.sources),
        })),
        oldTestamentLinks: analysis.oldTestamentLinks.map(otl => ({
            ...otl,
            sources: cleanCitations(otl.sources),
        })),
        // Drop commentator engagements whose sourceKey doesn't match
        // a configured source — those would render as unverifiable
        // citations downstream.
        commentatorEngagement: analysis.commentatorEngagement.filter(ce => validKeys.has(ce.sourceKey)),
        // Translation cruxes can keep entries even if some commentator
        // positions reference invalid keys (we just drop those
        // positions). The crux itself remains usable.
        translationCruxes: analysis.translationCruxes.map(tc => ({
            ...tc,
            commentatorPositions: tc.commentatorPositions.filter(cp => validKeys.has(cp.sourceKey)),
        })),
        footnoteExtensions: analysis.footnoteExtensions.map(fe => ({
            ...fe,
            sources: cleanCitations(fe.sources),
        })),
    };
}

/**
 * Collects prior accepted analyses from earlier verse steps for
 * inter-verse continuity. Skips intro/conclusion (those are not
 * verse analyses) and skips steps without an accepted version that
 * carries `canonicalAnalysis`.
 */
function collectPriorAcceptedAnalyses(
    paper: ExegeticalPaper,
    currentStep: ExegeticalStep,
): CanonicalVerseAnalysis[] {
    return paper.steps
        .filter(s => s.order < currentStep.order && s.kind === 'verse' && s.accepted?.canonicalAnalysis)
        .map(s => s.accepted!.canonicalAnalysis!);
}

export interface AnalyzeVerseCanonicallyUseCaseInput {
    ownerId: string;
    paperId: string;
    stepId: string;
    /** Optional hint when the user re-triggers analysis. */
    regenerationHint?: string | null;
}

/**
 * Cuánto del prompt puede ocupar el corpus de un paso.
 *
 * Es un presupuesto para el CORPUS, no para el prompt: las instrucciones
 * metodológicas, la guía de estilo, el texto base y los análisis previos
 * ocupan el resto, y `fitPromptToCap` recorta después si algo se desmadra.
 * Dejar la mitad del tope para el corpus da margen para todo lo demás sin que
 * el recorte final tenga que morder material que el paso sí necesitaba.
 */
const CORPUS_BUDGET_CHARS = 100_000;

/** Ancla de citación de un fragmento, en la convención del resto del corpus. */
function anchorFor(chunk: { sheet: number | null; section: string | null }): string {
    if (chunk.sheet && chunk.section) return `p. ${chunk.sheet}, § ${chunk.section}`;
    if (chunk.sheet) return `p. ${chunk.sheet}`;
    if (chunk.section) return `§ ${chunk.section}`;
    return '';
}
