import {
    FirestoreExegeticalPaperRepository,
    FirestoreUserRubricRepository,
    FirestoreUserStyleGuideRepository,
    FirebaseLibraryRepository,
    FirebaseSermonRepository,
    GeminiAcademicComposer,
    GeminiCanonicalVerseAnalyzer,
    GeminiConclusionComposer,
    GeminiDevotionalComposer,
    GeminiIntroductionComposer,
    GeminiExegesisOrchestrator,
    GeminiSermonComposer,
    GeminiStudyGuideComposer,
    GeminiPaperRubricExtractor,
    GeminiPaperToSermonTransformer,
    GeminiStyleGuideManifestExtractor,
    DeterministicStyleFormatter,
    FuzzyCitationVerifier,
    GeminiCoherenceReviewer,
    GeminiSourceTypeClassifier,
    RetrieveChunksExcerptExtractor,
    RetrieveChunksResourceRanker,
    GeminiStepCorpusPlanner,
    extractFootnoteAnchorsFromFormattedMarkdown,
} from '@dosfilos/infrastructure';
import type {
    IResourceContentReader,
    IResourceIndexProbe,
} from '@dosfilos/domain';
import { LibraryService } from './LibraryService';

import {
    CreateExegeticalPaperUseCase,
    ListExegeticalPapersUseCase,
    GetExegeticalPaperUseCase,
    ArchiveExegeticalPaperUseCase,
    UpdatePaperBriefUseCase,
    UpdateStepPlanUseCase,
    UpdateRubricUseCase,
    ResetRubricUseCase,
    ExtractRubricFromTextUseCase,
    ExtractRubricFromDocumentUseCase,
    ExtractStyleGuideManifestUseCase,
    ListUserRubricsUseCase,
    CreateUserRubricUseCase,
    UpdateUserRubricUseCase,
    DeleteUserRubricUseCase,
    SetDefaultUserRubricUseCase,
    ApplyRubricTemplateToPaperUseCase,
    ApplyStrategyOnlyRubricToPaperUseCase,
    SaveCurrentRubricAsTemplateUseCase,
    CreateUserRubricFromTextUseCase,
    ListUserStyleGuidesUseCase,
    GetActiveStyleGuideUseCase,
    CreateUserStyleGuideUseCase,
    SetActiveStyleGuideUseCase,
    UpdateUserStyleGuideUseCase,
    UpdateUserStyleGuideManifestUseCase,
    DeleteUserStyleGuideUseCase,
    AddProjectSourceUseCase,
    UpdateProjectSourceUseCase,
    RemoveProjectSourceUseCase,
    ExtractExcerptsForPaperUseCase,
    RankLibraryResourcesForPaperUseCase,
    ProposeStepCorpusAllocationsUseCase,
    UpdateStepCorpusAllocationUseCase,
    SeedStepsForPassageUseCase,
    AnalyzeVerseCanonicallyUseCase,
    ComposeAcademicPaperUseCase,
    ComposeConclusionFromAnalysesUseCase,
    ComposeDevotionalFromAnalysesUseCase,
    ComposeIntroductionFromAnalysesUseCase,
    ComposeSermonFromAnalysesUseCase,
    ComposeStudyGuideFromAnalysesUseCase,
    GenerateStepUseCase,
    AcceptStepUseCase,
    SaveStepEditUseCase,
    VerifyStepCitationsUseCase,
    RunCoherencePassUseCase,
    ClassifySourceTypeUseCase,
    GenerateSermonFromPaperUseCase,
} from '../use-cases/exegesis';

/**
 * Composition root for the Exegesis module.
 *
 * Mirrors the pattern of `FacultyService`: exposes use cases as public
 * fields so React Query hooks can invoke them directly without knowing
 * how the dependency graph is wired. The singleton is fine for v1
 * because all dependencies are stateless (the repositories hold no
 * connection state — Firestore SDK manages that globally).
 *
 * Use cases tied to step generation and project sources land here as
 * we build them; v1 currently wires paper CRUD + user-level style guide
 * management.
 */
class ExegesisService {
    // Papers
    public createPaper: CreateExegeticalPaperUseCase;
    public listPapers: ListExegeticalPapersUseCase;
    public getPaper: GetExegeticalPaperUseCase;
    public archivePaper: ArchiveExegeticalPaperUseCase;
    public updatePaperBrief: UpdatePaperBriefUseCase;
    public updateStepPlan: UpdateStepPlanUseCase;
    public updateRubric: UpdateRubricUseCase;
    public resetRubric: ResetRubricUseCase;
    public extractRubricFromText: ExtractRubricFromTextUseCase;
    public extractRubricFromDocument: ExtractRubricFromDocumentUseCase;
    public extractStyleGuideManifest: ExtractStyleGuideManifestUseCase;

    // User-level rubric templates
    public listUserRubrics: ListUserRubricsUseCase;
    public createUserRubric: CreateUserRubricUseCase;
    public updateUserRubric: UpdateUserRubricUseCase;
    public deleteUserRubric: DeleteUserRubricUseCase;
    public setDefaultUserRubric: SetDefaultUserRubricUseCase;
    public applyRubricTemplateToPaper: ApplyRubricTemplateToPaperUseCase;
    public applyStrategyOnlyRubricToPaper: ApplyStrategyOnlyRubricToPaperUseCase;
    public saveCurrentRubricAsTemplate: SaveCurrentRubricAsTemplateUseCase;
    public createUserRubricFromText: CreateUserRubricFromTextUseCase;

    // User style guides
    public listStyleGuides: ListUserStyleGuidesUseCase;
    public getActiveStyleGuide: GetActiveStyleGuideUseCase;
    public createStyleGuide: CreateUserStyleGuideUseCase;
    public setActiveStyleGuide: SetActiveStyleGuideUseCase;
    public updateStyleGuide: UpdateUserStyleGuideUseCase;
    public updateStyleGuideManifest: UpdateUserStyleGuideManifestUseCase;
    public deleteStyleGuide: DeleteUserStyleGuideUseCase;

    // Project sources
    public addSource: AddProjectSourceUseCase;
    public updateSource: UpdateProjectSourceUseCase;
    public removeSource: RemoveProjectSourceUseCase;
    public extractExcerpts: ExtractExcerptsForPaperUseCase;
    public rankLibraryForPaper: RankLibraryResourcesForPaperUseCase;
    public proposeStepCorpusAllocations: ProposeStepCorpusAllocationsUseCase;
    public updateStepCorpusAllocation: UpdateStepCorpusAllocationUseCase;

    // Steps
    public seedSteps: SeedStepsForPassageUseCase;
    public generateStep: GenerateStepUseCase;
    public acceptStep: AcceptStepUseCase;
    public saveStepEdit: SaveStepEditUseCase;
    // Programmatic citation verification (v1.5 differentiator vs
    // NotebookLM). Runs over a step version's accepted markdown,
    // matches cited sources against the paper's project-source list,
    // and persists a per-status summary on the version.
    public verifyStepCitations: VerifyStepCitationsUseCase;
    // Cross-section coherence reviewer — single Gemini pass over the
    // accepted intro + verses + conclusion to surface inconsistencies
    // the per-step prompts cannot see (they only get one step at a time).
    public runCoherencePass: RunCoherencePassUseCase;
    // Source-type auto-classification — pre-fills the SourceType
    // dropdown when the user attaches a corpus item, removing the
    // friction of scrolling 13 categories per upload.
    public classifySourceType: ClassifySourceTypeUseCase;

    // Canonical analysis pipeline (target architecture — see docs/exegesis/METODOLOGIA.md).
    // Coexists with `generateStep` during the migration; produces a
    // structured `CanonicalVerseAnalysis` artifact that downstream
    // composers (academic / sermon / devotional) consume.
    public analyzeVerseCanonically: AnalyzeVerseCanonicallyUseCase;

    // Academic-paper composer over the canonical analyses. Enforces
    // the configured style guide at two layers (prompt + deterministic
    // post-formatter). See `ComposeAcademicPaperUseCase` and
    // `IAcademicComposer` for the contract.
    public composeAcademicPaper: ComposeAcademicPaperUseCase;

    // Granular section composers — written in academic order:
    // conclusion FROM the body's verse analyses, then introduction
    // FROM verse analyses + the accepted conclusion. Both persist
    // their output as new versions of their respective steps so the
    // user reviews + accepts the same way as legacy generation.
    public composeConclusionFromAnalyses: ComposeConclusionFromAnalysesUseCase;
    public composeIntroductionFromAnalyses: ComposeIntroductionFromAnalysesUseCase;

    // Ministry composers (Phase 6) — sermon / devotional / study
    // guide composed from the same `CanonicalVerseAnalysis` artifact.
    // No persistence layer in the use cases themselves: caller
    // surfaces the markdown via copy / download / handoff to the
    // existing sermon module.
    public composeSermonFromAnalyses: ComposeSermonFromAnalysesUseCase;
    public composeDevotionalFromAnalyses: ComposeDevotionalFromAnalysesUseCase;
    public composeStudyGuideFromAnalyses: ComposeStudyGuideFromAnalysesUseCase;

    // Bridge: paper → sermon
    public generateSermonFromPaper: GenerateSermonFromPaperUseCase;

    constructor() {
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        // Reuse the vision model env var — both surfaces want Pro 2.5.
        // A dedicated `VITE_GEMINI_EXEGESIS_MODEL_ID` can split them later
        // if exegesis ends up needing a different tier.
        const exegesisModelId = (import.meta as any).env?.VITE_GEMINI_VISION_MODEL_ID || 'gemini-2.5-pro';

        if (!apiKey) {
            console.warn('Gemini API key not configured. Exegesis generation will be disabled.');
        }

        const paperRepository = new FirestoreExegeticalPaperRepository();
        const styleGuideRepository = new FirestoreUserStyleGuideRepository();
        const userRubricRepository = new FirestoreUserRubricRepository();
        const libraryRepository = new FirebaseLibraryRepository();
        const orchestrator = new GeminiExegesisOrchestrator(apiKey || '', exegesisModelId);
        const rubricExtractor = new GeminiPaperRubricExtractor(apiKey || '', exegesisModelId);
        const manifestExtractor = new GeminiStyleGuideManifestExtractor(apiKey || '', exegesisModelId);
        const styleFormatter = new DeterministicStyleFormatter();

        // Adapt the broader library repository to the narrow content-reader
        // port the use case depends on. Keeps the use case free of any
        // direct knowledge of how resources are stored or extracted.
        const contentReader: IResourceContentReader = {
            async getTextContent(resourceId: string) {
                const resource = await libraryRepository.findById(resourceId);
                return resource?.textContent ?? null;
            },
        };

        // Papers
        this.createPaper = new CreateExegeticalPaperUseCase(paperRepository, userRubricRepository);
        this.listPapers = new ListExegeticalPapersUseCase(paperRepository);
        this.getPaper = new GetExegeticalPaperUseCase(paperRepository);
        this.archivePaper = new ArchiveExegeticalPaperUseCase(paperRepository);
        this.updatePaperBrief = new UpdatePaperBriefUseCase(paperRepository);
        this.updateStepPlan = new UpdateStepPlanUseCase(paperRepository);
        this.updateRubric = new UpdateRubricUseCase(paperRepository);
        this.resetRubric = new ResetRubricUseCase(paperRepository);
        this.extractRubricFromText = new ExtractRubricFromTextUseCase(paperRepository, rubricExtractor);
        this.extractRubricFromDocument = new ExtractRubricFromDocumentUseCase(
            paperRepository,
            contentReader,
            rubricExtractor,
        );
        this.extractStyleGuideManifest = new ExtractStyleGuideManifestUseCase(
            styleGuideRepository,
            contentReader,
            manifestExtractor,
        );

        // User-level rubric templates
        this.listUserRubrics = new ListUserRubricsUseCase(userRubricRepository);
        this.createUserRubric = new CreateUserRubricUseCase(userRubricRepository);
        this.updateUserRubric = new UpdateUserRubricUseCase(userRubricRepository);
        this.deleteUserRubric = new DeleteUserRubricUseCase(userRubricRepository);
        this.setDefaultUserRubric = new SetDefaultUserRubricUseCase(userRubricRepository);
        this.applyRubricTemplateToPaper = new ApplyRubricTemplateToPaperUseCase(
            paperRepository,
            userRubricRepository,
        );
        this.applyStrategyOnlyRubricToPaper = new ApplyStrategyOnlyRubricToPaperUseCase(
            paperRepository,
        );
        this.saveCurrentRubricAsTemplate = new SaveCurrentRubricAsTemplateUseCase(
            paperRepository,
            userRubricRepository,
        );
        this.createUserRubricFromText = new CreateUserRubricFromTextUseCase(
            userRubricRepository,
            rubricExtractor,
        );

        // User style guides
        this.listStyleGuides = new ListUserStyleGuidesUseCase(styleGuideRepository);
        this.getActiveStyleGuide = new GetActiveStyleGuideUseCase(styleGuideRepository);
        this.createStyleGuide = new CreateUserStyleGuideUseCase(styleGuideRepository);
        this.setActiveStyleGuide = new SetActiveStyleGuideUseCase(styleGuideRepository);
        this.updateStyleGuide = new UpdateUserStyleGuideUseCase(styleGuideRepository);
        this.updateStyleGuideManifest = new UpdateUserStyleGuideManifestUseCase(styleGuideRepository);
        this.deleteStyleGuide = new DeleteUserStyleGuideUseCase(styleGuideRepository);

        // Project sources (operate on the paper repo since sources live inline)
        this.addSource = new AddProjectSourceUseCase(paperRepository);
        this.updateSource = new UpdateProjectSourceUseCase(paperRepository);
        this.removeSource = new RemoveProjectSourceUseCase(paperRepository);

        // v1.5: excerpt extraction. Adapt LibraryService's
        // `getResourceIndexStatus` into the narrow `IResourceIndexProbe`
        // port the extractor expects — keeps the extractor unaware of
        // how readiness is computed, and avoids a backward dep from
        // infrastructure → application. Single LibraryService instance
        // here matches the lazy singleton pattern other consumers use.
        const libraryService = new LibraryService();
        const indexProbe: IResourceIndexProbe = {
            async isReady(resourceId: string) {
                const resource = await libraryRepository.findById(resourceId);
                if (!resource) return false;
                return libraryService.getResourceIndexStatus(resource) === 'indexed';
            },
        };
        const excerptExtractor = new RetrieveChunksExcerptExtractor(indexProbe);
        this.extractExcerpts = new ExtractExcerptsForPaperUseCase(paperRepository, excerptExtractor);

        // v1.7 smart-match: ranks the user's library against a paper
        // before they pick what to extract from. Same retrieveChunks
        // pipeline as the extractor, just scoped to userId only.
        const resourceRanker = new RetrieveChunksResourceRanker();
        this.rankLibraryForPaper = new RankLibraryResourcesForPaperUseCase(
            paperRepository,
            resourceRanker,
        );

        // v1.7 corpus-usage planning: LLM proposes which sources go
        // to which generation step, populating
        // `paper.stepPlan.perStep[*].pinnedSources`. The orchestrator
        // then prioritizes those at generation time (flexible mode).
        const stepCorpusPlanner = new GeminiStepCorpusPlanner(apiKey || '', exegesisModelId);
        this.proposeStepCorpusAllocations = new ProposeStepCorpusAllocationsUseCase(
            paperRepository,
            stepCorpusPlanner,
        );
        this.updateStepCorpusAllocation = new UpdateStepCorpusAllocationUseCase(paperRepository);

        // Steps (D.2: live Gemini generation with style guide + sources injected;
        // Phase 3c adds deterministic style formatter + cross-step ibid anchors)
        this.seedSteps = new SeedStepsForPassageUseCase(paperRepository);
        this.generateStep = new GenerateStepUseCase(
            paperRepository,
            styleGuideRepository,
            contentReader,
            orchestrator,
            styleFormatter,
            extractFootnoteAnchorsFromFormattedMarkdown,
        );
        this.acceptStep = new AcceptStepUseCase(paperRepository);
        this.saveStepEdit = new SaveStepEditUseCase(paperRepository);

        // Citation verifier — token-overlap fuzzy match over the
        // paper's project sources. Reuses the same `contentReader`
        // for full-document mode so legacy sources also verify.
        const citationVerifier = new FuzzyCitationVerifier();
        this.verifyStepCitations = new VerifyStepCitationsUseCase(
            paperRepository,
            contentReader,
            citationVerifier,
        );

        // Coherence reviewer — single Gemini call over the entire
        // accepted paper. Adversarial: returns issues, not praise.
        const coherenceReviewer = new GeminiCoherenceReviewer(apiKey || '', exegesisModelId);
        this.runCoherencePass = new RunCoherencePassUseCase(
            paperRepository,
            coherenceReviewer,
        );

        // Source-type classifier — Gemini Pro 2.5 with enum-locked
        // schema. Stateless: caller reads the resource text + metadata
        // upstream and feeds the slice in.
        const sourceTypeClassifier = new GeminiSourceTypeClassifier(apiKey || '', exegesisModelId);
        this.classifySourceType = new ClassifySourceTypeUseCase(sourceTypeClassifier);

        // Canonical analysis pipeline. Wired in parallel to `generateStep`
        // so the legacy markdown path keeps working while the structured
        // pipeline is exercised on opt-in surfaces.
        const canonicalAnalyzer = new GeminiCanonicalVerseAnalyzer(apiKey || '', exegesisModelId);
        this.analyzeVerseCanonically = new AnalyzeVerseCanonicallyUseCase(
            paperRepository,
            styleGuideRepository,
            contentReader,
            canonicalAnalyzer,
        );

        // Academic-paper composer. Reuses the existing
        // `DeterministicStyleFormatter` for the post-process layer so
        // citations get rewritten per the manifest's templates after
        // the LLM composes prose. Style guide enforcement is mandatory
        // when configured; falls back to TMS / Turabian otherwise.
        const academicComposer = new GeminiAcademicComposer(apiKey || '', exegesisModelId);
        this.composeAcademicPaper = new ComposeAcademicPaperUseCase(
            paperRepository,
            styleGuideRepository,
            contentReader,
            academicComposer,
            styleFormatter,
        );

        // Section-level composers. Same style-guide enforcement as
        // `composeAcademicPaper`. Introduction is written LAST per
        // academic methodology — the use case enforces this by
        // requiring an accepted conclusion before composing.
        const conclusionComposer = new GeminiConclusionComposer(apiKey || '', exegesisModelId);
        this.composeConclusionFromAnalyses = new ComposeConclusionFromAnalysesUseCase(
            paperRepository,
            styleGuideRepository,
            contentReader,
            conclusionComposer,
            styleFormatter,
        );
        const introductionComposer = new GeminiIntroductionComposer(apiKey || '', exegesisModelId);
        this.composeIntroductionFromAnalyses = new ComposeIntroductionFromAnalysesUseCase(
            paperRepository,
            styleGuideRepository,
            contentReader,
            introductionComposer,
            styleFormatter,
        );

        // Ministry composers (sermon / devotional / study guide).
        // Each uses the canonical verse analyses + theologicalHooks
        // bridge to produce format-appropriate markdown. No
        // deterministic style formatter — ministry registers diverge
        // from academic citation conventions, and citation post-
        // processing would harm the homiletic feel.
        const sermonComposer = new GeminiSermonComposer(apiKey || '', exegesisModelId);
        this.composeSermonFromAnalyses = new ComposeSermonFromAnalysesUseCase(
            paperRepository,
            styleGuideRepository,
            contentReader,
            sermonComposer,
        );
        const devotionalComposer = new GeminiDevotionalComposer(apiKey || '', exegesisModelId);
        this.composeDevotionalFromAnalyses = new ComposeDevotionalFromAnalysesUseCase(
            paperRepository,
            styleGuideRepository,
            contentReader,
            devotionalComposer,
        );
        const studyGuideComposer = new GeminiStudyGuideComposer(apiKey || '', exegesisModelId);
        this.composeStudyGuideFromAnalyses = new ComposeStudyGuideFromAnalysesUseCase(
            paperRepository,
            styleGuideRepository,
            contentReader,
            studyGuideComposer,
        );

        // Bridge: paper → sermon (Phase 2). Sermon repo is shared with the
        // legacy sermon module; the use case persists a draft with
        // sourcePaperId set so the sermon detail view can deep-link back.
        const sermonRepository = new FirebaseSermonRepository();
        const paperToSermonTransformer = new GeminiPaperToSermonTransformer(
            apiKey || '',
            exegesisModelId,
        );
        this.generateSermonFromPaper = new GenerateSermonFromPaperUseCase(
            paperRepository,
            sermonRepository,
            paperToSermonTransformer,
        );
    }
}

export const exegesisService = new ExegesisService();
