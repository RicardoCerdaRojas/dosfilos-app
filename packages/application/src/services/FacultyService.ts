import {
    FirestoreAIAgentRepository,
    FirestoreAIChatRepository,
    FirestoreAIProjectRepository,
    FirestoreExtractionRepository,
    FirestoreExegeticalPaperRepository,
    FirebaseSeriesRepository,
    GeminiMultiAgentService,
} from '@dosfilos/infrastructure';

// Use Cases
import {
    CreateChatSessionUseCase,
    GetChatHistoryUseCase,
    SendAgentMessageUseCase,
    OrchestratedMessageUseCase,
    ExtractTheologicalContentUseCase,
    GetFacultyAgentsUseCase,
    GetSessionUseCase,
    // Projects
    CreateProjectUseCase,
    UpdateProjectUseCase,
    DeleteProjectUseCase,
    SetProjectArchivedUseCase,
    SetProjectDeletedUseCase,
    DeleteChatSessionUseCase,
    GenerateProjectContextUseCase,
    GetUserProjectsUseCase,
    UpdateSessionProjectUseCase,
    RenameChatSessionUseCase,
    DeleteChatMessageUseCase,
    ProcessMicroActionUseCase,
    ListProjectOutputsUseCase,
    CreateProjectOutputUseCase,
    UpdateProjectOutputUseCase,
    DeleteProjectOutputUseCase,
    // Extractions
    GenerateAndSaveExtractionUseCase,
    ListSessionExtractionsUseCase,
    ListProjectExtractionsUseCase,
    ListUserExtractionsUseCase,
    GetExtractionUseCase,
    UpdateExtractionMarkdownUseCase,
    RenameExtractionUseCase,
    DeleteExtractionUseCase,
    AddExtractionToProjectUseCase,
    RemoveExtractionFromProjectUseCase,
} from '../use-cases/faculty';

class FacultyService {
    public createSession: CreateChatSessionUseCase;
    public getHistory: GetChatHistoryUseCase;
    public getSession: GetSessionUseCase;
    public sendMessage: SendAgentMessageUseCase;
    public orchestratedMessage: OrchestratedMessageUseCase;
    public extractContent: ExtractTheologicalContentUseCase;
    public processMicroAction: ProcessMicroActionUseCase;
    public getAgents: GetFacultyAgentsUseCase;
    // Projects
    public getProjects: GetUserProjectsUseCase;
    public createProject: CreateProjectUseCase;
    public updateProject: UpdateProjectUseCase;
    public deleteProject: DeleteProjectUseCase;
    public setProjectArchived: SetProjectArchivedUseCase;
    public setProjectDeleted: SetProjectDeletedUseCase;
    public deleteSession: DeleteChatSessionUseCase;
    public deleteMessage: DeleteChatMessageUseCase;
    public renameSession: RenameChatSessionUseCase;
    public generateProjectContext: GenerateProjectContextUseCase;
    public updateSessionProject: UpdateSessionProjectUseCase;
    // Project outputs
    public listOutputs: ListProjectOutputsUseCase;
    public createOutput: CreateProjectOutputUseCase;
    public updateOutput: UpdateProjectOutputUseCase;
    public deleteOutput: DeleteProjectOutputUseCase;
    // Persisted extractions
    public generateAndSaveExtraction: GenerateAndSaveExtractionUseCase;
    public listSessionExtractions: ListSessionExtractionsUseCase;
    public listProjectExtractions: ListProjectExtractionsUseCase;
    public listUserExtractions: ListUserExtractionsUseCase;
    public getExtraction: GetExtractionUseCase;
    public updateExtractionMarkdown: UpdateExtractionMarkdownUseCase;
    public renameExtraction: RenameExtractionUseCase;
    public deleteExtraction: DeleteExtractionUseCase;
    public addExtractionToProject: AddExtractionToProjectUseCase;
    public removeExtractionFromProject: RemoveExtractionFromProjectUseCase;

    constructor() {
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        const modelId = (import.meta as any).env?.VITE_GEMINI_MODEL_ID || 'gemini-2.5-flash';
        const visionModelId = (import.meta as any).env?.VITE_GEMINI_VISION_MODEL_ID || 'gemini-2.5-pro';

        if (!apiKey) {
            console.warn('Gemini API key not configured. Faculty AI features will be disabled.');
        }

        const agentRepository = new FirestoreAIAgentRepository();
        const chatRepository = new FirestoreAIChatRepository();
        const projectRepository = new FirestoreAIProjectRepository();
        const extractionRepository = new FirestoreExtractionRepository();
        // Phase 4 enrichment refs — wired here so chat sessions
        // launched from a paper / series / pericope can show the
        // model the right anchor without the UI having to thread it.
        const paperRepository = new FirestoreExegeticalPaperRepository();
        const seriesRepository = new FirebaseSeriesRepository();
        const generatorService = new GeminiMultiAgentService(apiKey || '', modelId, visionModelId);

        this.createSession = new CreateChatSessionUseCase(agentRepository, chatRepository);
        this.getHistory = new GetChatHistoryUseCase(chatRepository);
        this.getSession = new GetSessionUseCase(chatRepository);
        this.sendMessage = new SendAgentMessageUseCase(agentRepository, chatRepository, generatorService);
        this.orchestratedMessage = new OrchestratedMessageUseCase(
            agentRepository,
            chatRepository,
            generatorService,
            projectRepository,
            paperRepository,
            seriesRepository,
        );
        this.extractContent = new ExtractTheologicalContentUseCase(chatRepository, generatorService, projectRepository);
        this.generateAndSaveExtraction = new GenerateAndSaveExtractionUseCase(
            this.extractContent,
            chatRepository,
            extractionRepository,
        );
        this.listSessionExtractions = new ListSessionExtractionsUseCase(extractionRepository);
        this.listProjectExtractions = new ListProjectExtractionsUseCase(extractionRepository);
        this.listUserExtractions = new ListUserExtractionsUseCase(extractionRepository);
        this.getExtraction = new GetExtractionUseCase(extractionRepository);
        this.updateExtractionMarkdown = new UpdateExtractionMarkdownUseCase(extractionRepository);
        this.renameExtraction = new RenameExtractionUseCase(extractionRepository);
        this.deleteExtraction = new DeleteExtractionUseCase(extractionRepository);
        this.addExtractionToProject = new AddExtractionToProjectUseCase(extractionRepository);
        this.removeExtractionFromProject = new RemoveExtractionFromProjectUseCase(extractionRepository);
        this.processMicroAction = new ProcessMicroActionUseCase(chatRepository, generatorService);
        this.getAgents = new GetFacultyAgentsUseCase(agentRepository);
        // Projects
        this.getProjects = new GetUserProjectsUseCase(projectRepository);
        this.createProject = new CreateProjectUseCase(projectRepository);
        this.updateProject = new UpdateProjectUseCase(projectRepository);
        this.deleteProject = new DeleteProjectUseCase(projectRepository, chatRepository, extractionRepository);
        this.setProjectArchived = new SetProjectArchivedUseCase(projectRepository);
        this.setProjectDeleted = new SetProjectDeletedUseCase(projectRepository);
        this.deleteSession = new DeleteChatSessionUseCase(chatRepository, extractionRepository);
        this.deleteMessage = new DeleteChatMessageUseCase(chatRepository);
        this.renameSession = new RenameChatSessionUseCase(chatRepository);
        this.generateProjectContext = new GenerateProjectContextUseCase(chatRepository, projectRepository, generatorService);
        this.updateSessionProject = new UpdateSessionProjectUseCase(chatRepository);
        this.listOutputs = new ListProjectOutputsUseCase(projectRepository);
        this.createOutput = new CreateProjectOutputUseCase(projectRepository);
        this.updateOutput = new UpdateProjectOutputUseCase(projectRepository);
        this.deleteOutput = new DeleteProjectOutputUseCase(projectRepository);
    }
}

// Singleton instance
export const facultyService = new FacultyService();
