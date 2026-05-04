import {
    FirestoreExegeticalPaperRepository,
    FirestoreUserRubricRepository,
    FirestoreUserStyleGuideRepository,
    FirebaseLibraryRepository,
    FirebaseSermonRepository,
    GeminiExegesisOrchestrator,
    GeminiPaperRubricExtractor,
    GeminiPaperToSermonTransformer,
    GeminiStyleGuideManifestExtractor,
    DeterministicStyleFormatter,
    RetrieveChunksExcerptExtractor,
    RetrieveChunksResourceRanker,
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
    ExtractStyleGuideManifestUseCase,
    ListUserRubricsUseCase,
    CreateUserRubricUseCase,
    UpdateUserRubricUseCase,
    DeleteUserRubricUseCase,
    SetDefaultUserRubricUseCase,
    ApplyRubricTemplateToPaperUseCase,
    SaveCurrentRubricAsTemplateUseCase,
    CreateUserRubricFromTextUseCase,
    ListUserStyleGuidesUseCase,
    GetActiveStyleGuideUseCase,
    CreateUserStyleGuideUseCase,
    SetActiveStyleGuideUseCase,
    UpdateUserStyleGuideUseCase,
    DeleteUserStyleGuideUseCase,
    AddProjectSourceUseCase,
    UpdateProjectSourceUseCase,
    RemoveProjectSourceUseCase,
    ExtractExcerptsForPaperUseCase,
    RankLibraryResourcesForPaperUseCase,
    SeedStepsForPassageUseCase,
    GenerateStepUseCase,
    AcceptStepUseCase,
    SaveStepEditUseCase,
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
    public extractStyleGuideManifest: ExtractStyleGuideManifestUseCase;

    // User-level rubric templates
    public listUserRubrics: ListUserRubricsUseCase;
    public createUserRubric: CreateUserRubricUseCase;
    public updateUserRubric: UpdateUserRubricUseCase;
    public deleteUserRubric: DeleteUserRubricUseCase;
    public setDefaultUserRubric: SetDefaultUserRubricUseCase;
    public applyRubricTemplateToPaper: ApplyRubricTemplateToPaperUseCase;
    public saveCurrentRubricAsTemplate: SaveCurrentRubricAsTemplateUseCase;
    public createUserRubricFromText: CreateUserRubricFromTextUseCase;

    // User style guides
    public listStyleGuides: ListUserStyleGuidesUseCase;
    public getActiveStyleGuide: GetActiveStyleGuideUseCase;
    public createStyleGuide: CreateUserStyleGuideUseCase;
    public setActiveStyleGuide: SetActiveStyleGuideUseCase;
    public updateStyleGuide: UpdateUserStyleGuideUseCase;
    public deleteStyleGuide: DeleteUserStyleGuideUseCase;

    // Project sources
    public addSource: AddProjectSourceUseCase;
    public updateSource: UpdateProjectSourceUseCase;
    public removeSource: RemoveProjectSourceUseCase;
    public extractExcerpts: ExtractExcerptsForPaperUseCase;
    public rankLibraryForPaper: RankLibraryResourcesForPaperUseCase;

    // Steps
    public seedSteps: SeedStepsForPassageUseCase;
    public generateStep: GenerateStepUseCase;
    public acceptStep: AcceptStepUseCase;
    public saveStepEdit: SaveStepEditUseCase;

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
