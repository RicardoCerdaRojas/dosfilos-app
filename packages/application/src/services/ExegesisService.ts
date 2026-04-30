import {
    FirestoreExegeticalPaperRepository,
    FirestoreUserStyleGuideRepository,
    FirebaseLibraryRepository,
    GeminiExegesisOrchestrator,
} from '@dosfilos/infrastructure';
import type { IResourceContentReader } from '@dosfilos/domain';

import {
    CreateExegeticalPaperUseCase,
    ListExegeticalPapersUseCase,
    GetExegeticalPaperUseCase,
    ArchiveExegeticalPaperUseCase,
    UpdatePaperBriefUseCase,
    UpdateStepPlanUseCase,
    UpdateRubricUseCase,
    ResetRubricUseCase,
    ListUserStyleGuidesUseCase,
    GetActiveStyleGuideUseCase,
    CreateUserStyleGuideUseCase,
    SetActiveStyleGuideUseCase,
    DeleteUserStyleGuideUseCase,
    AddProjectSourceUseCase,
    UpdateProjectSourceUseCase,
    RemoveProjectSourceUseCase,
    SeedStepsForPassageUseCase,
    GenerateStepUseCase,
    AcceptStepUseCase,
    SaveStepEditUseCase,
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

    // User style guides
    public listStyleGuides: ListUserStyleGuidesUseCase;
    public getActiveStyleGuide: GetActiveStyleGuideUseCase;
    public createStyleGuide: CreateUserStyleGuideUseCase;
    public setActiveStyleGuide: SetActiveStyleGuideUseCase;
    public deleteStyleGuide: DeleteUserStyleGuideUseCase;

    // Project sources
    public addSource: AddProjectSourceUseCase;
    public updateSource: UpdateProjectSourceUseCase;
    public removeSource: RemoveProjectSourceUseCase;

    // Steps
    public seedSteps: SeedStepsForPassageUseCase;
    public generateStep: GenerateStepUseCase;
    public acceptStep: AcceptStepUseCase;
    public saveStepEdit: SaveStepEditUseCase;

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
        const libraryRepository = new FirebaseLibraryRepository();
        const orchestrator = new GeminiExegesisOrchestrator(apiKey || '', exegesisModelId);

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
        this.createPaper = new CreateExegeticalPaperUseCase(paperRepository);
        this.listPapers = new ListExegeticalPapersUseCase(paperRepository);
        this.getPaper = new GetExegeticalPaperUseCase(paperRepository);
        this.archivePaper = new ArchiveExegeticalPaperUseCase(paperRepository);
        this.updatePaperBrief = new UpdatePaperBriefUseCase(paperRepository);
        this.updateStepPlan = new UpdateStepPlanUseCase(paperRepository);
        this.updateRubric = new UpdateRubricUseCase(paperRepository);
        this.resetRubric = new ResetRubricUseCase(paperRepository);

        // User style guides
        this.listStyleGuides = new ListUserStyleGuidesUseCase(styleGuideRepository);
        this.getActiveStyleGuide = new GetActiveStyleGuideUseCase(styleGuideRepository);
        this.createStyleGuide = new CreateUserStyleGuideUseCase(styleGuideRepository);
        this.setActiveStyleGuide = new SetActiveStyleGuideUseCase(styleGuideRepository);
        this.deleteStyleGuide = new DeleteUserStyleGuideUseCase(styleGuideRepository);

        // Project sources (operate on the paper repo since sources live inline)
        this.addSource = new AddProjectSourceUseCase(paperRepository);
        this.updateSource = new UpdateProjectSourceUseCase(paperRepository);
        this.removeSource = new RemoveProjectSourceUseCase(paperRepository);

        // Steps (D.2: live Gemini generation with style guide + sources injected)
        this.seedSteps = new SeedStepsForPassageUseCase(paperRepository);
        this.generateStep = new GenerateStepUseCase(
            paperRepository,
            styleGuideRepository,
            contentReader,
            orchestrator,
        );
        this.acceptStep = new AcceptStepUseCase(paperRepository);
        this.saveStepEdit = new SaveStepEditUseCase(paperRepository);
    }
}

export const exegesisService = new ExegesisService();
