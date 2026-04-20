import {
    FirestoreAIAgentRepository,
    FirestoreAIChatRepository,
    FirestoreAIProjectRepository,
    GeminiMultiAgentService
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
    DeleteChatSessionUseCase,
    GenerateProjectContextUseCase,
    GetUserProjectsUseCase,
    UpdateSessionProjectUseCase,
    RenameChatSessionUseCase,
    DeleteChatMessageUseCase,
    ProcessMicroActionUseCase,
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
    public deleteSession: DeleteChatSessionUseCase;
    public deleteMessage: DeleteChatMessageUseCase;
    public renameSession: RenameChatSessionUseCase;
    public generateProjectContext: GenerateProjectContextUseCase;
    public updateSessionProject: UpdateSessionProjectUseCase;

    constructor() {
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        const modelId = (import.meta as any).env?.VITE_GEMINI_MODEL_ID || 'gemini-2.5-flash';

        if (!apiKey) {
            console.warn('Gemini API key not configured. Faculty AI features will be disabled.');
        }

        const agentRepository = new FirestoreAIAgentRepository();
        const chatRepository = new FirestoreAIChatRepository();
        const projectRepository = new FirestoreAIProjectRepository();
        const generatorService = new GeminiMultiAgentService(apiKey || '', modelId);

        this.createSession = new CreateChatSessionUseCase(agentRepository, chatRepository);
        this.getHistory = new GetChatHistoryUseCase(chatRepository);
        this.getSession = new GetSessionUseCase(chatRepository);
        this.sendMessage = new SendAgentMessageUseCase(agentRepository, chatRepository, generatorService);
        this.orchestratedMessage = new OrchestratedMessageUseCase(agentRepository, chatRepository, generatorService, projectRepository);
        this.extractContent = new ExtractTheologicalContentUseCase(chatRepository, generatorService, projectRepository);
        this.processMicroAction = new ProcessMicroActionUseCase(chatRepository, generatorService);
        this.getAgents = new GetFacultyAgentsUseCase(agentRepository);
        // Projects
        this.getProjects = new GetUserProjectsUseCase(projectRepository);
        this.createProject = new CreateProjectUseCase(projectRepository);
        this.updateProject = new UpdateProjectUseCase(projectRepository);
        this.deleteProject = new DeleteProjectUseCase(projectRepository, chatRepository);
        this.deleteSession = new DeleteChatSessionUseCase(chatRepository);
        this.deleteMessage = new DeleteChatMessageUseCase(chatRepository);
        this.renameSession = new RenameChatSessionUseCase(chatRepository);
        this.generateProjectContext = new GenerateProjectContextUseCase(chatRepository, projectRepository, generatorService);
        this.updateSessionProject = new UpdateSessionProjectUseCase(chatRepository);
    }
}

// Singleton instance
export const facultyService = new FacultyService();
