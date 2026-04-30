import {
    FirestoreExegeticalPaperRepository,
    FirestoreUserStyleGuideRepository,
} from '@dosfilos/infrastructure';

import {
    CreateExegeticalPaperUseCase,
    ListExegeticalPapersUseCase,
    GetExegeticalPaperUseCase,
    ArchiveExegeticalPaperUseCase,
    ListUserStyleGuidesUseCase,
    GetActiveStyleGuideUseCase,
    CreateUserStyleGuideUseCase,
    SetActiveStyleGuideUseCase,
    DeleteUserStyleGuideUseCase,
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

    // User style guides
    public listStyleGuides: ListUserStyleGuidesUseCase;
    public getActiveStyleGuide: GetActiveStyleGuideUseCase;
    public createStyleGuide: CreateUserStyleGuideUseCase;
    public setActiveStyleGuide: SetActiveStyleGuideUseCase;
    public deleteStyleGuide: DeleteUserStyleGuideUseCase;

    constructor() {
        const paperRepository = new FirestoreExegeticalPaperRepository();
        const styleGuideRepository = new FirestoreUserStyleGuideRepository();

        // Papers
        this.createPaper = new CreateExegeticalPaperUseCase(paperRepository);
        this.listPapers = new ListExegeticalPapersUseCase(paperRepository);
        this.getPaper = new GetExegeticalPaperUseCase(paperRepository);
        this.archivePaper = new ArchiveExegeticalPaperUseCase(paperRepository);

        // User style guides
        this.listStyleGuides = new ListUserStyleGuidesUseCase(styleGuideRepository);
        this.getActiveStyleGuide = new GetActiveStyleGuideUseCase(styleGuideRepository);
        this.createStyleGuide = new CreateUserStyleGuideUseCase(styleGuideRepository);
        this.setActiveStyleGuide = new SetActiveStyleGuideUseCase(styleGuideRepository);
        this.deleteStyleGuide = new DeleteUserStyleGuideUseCase(styleGuideRepository);
    }
}

export const exegesisService = new ExegesisService();
