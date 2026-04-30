import { FirestoreExegeticalPaperRepository } from '@dosfilos/infrastructure';

import {
    CreateExegeticalPaperUseCase,
    ListExegeticalPapersUseCase,
    GetExegeticalPaperUseCase,
    ArchiveExegeticalPaperUseCase,
} from '../use-cases/exegesis';

/**
 * Composition root for the Exegesis module.
 *
 * Mirrors the pattern of `FacultyService`: exposes use cases as public
 * fields so React Query hooks can invoke them directly without knowing
 * how the dependency graph is wired. The singleton is fine for v1
 * because all dependencies are stateless (the repository holds no
 * connection state — Firestore SDK manages that globally).
 *
 * Use cases tied to step generation, source upload, and style guides
 * land here as we build them; for v1 only paper-list + create + archive
 * are wired since that's all the UI exercises.
 */
class ExegesisService {
    public createPaper: CreateExegeticalPaperUseCase;
    public listPapers: ListExegeticalPapersUseCase;
    public getPaper: GetExegeticalPaperUseCase;
    public archivePaper: ArchiveExegeticalPaperUseCase;

    constructor() {
        const paperRepository = new FirestoreExegeticalPaperRepository();

        this.createPaper = new CreateExegeticalPaperUseCase(paperRepository);
        this.listPapers = new ListExegeticalPapersUseCase(paperRepository);
        this.getPaper = new GetExegeticalPaperUseCase(paperRepository);
        this.archivePaper = new ArchiveExegeticalPaperUseCase(paperRepository);
    }
}

export const exegesisService = new ExegesisService();
