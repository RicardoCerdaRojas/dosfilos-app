
import { IGreekTutorService, TrainingUnit, GreekForm, ISessionRepository, StudySession } from '@dosfilos/domain';

export class GenerateTrainingUnitsUseCase {
    constructor(
        private greekTutorService: IGreekTutorService,
        private sessionRepository: ISessionRepository
    ) { }

    /**
     * Orchestrates the generation of training units for a passage.
     * 1. Identifies significant forms.
     * 2. For each form, generates a full training unit.
     * 3. Persists the session and units.
     */
    async execute(
        passage: string,
        fileSearchStoreId: string,
        userId: string,
        config?: { basePrompt?: string; userPrompts?: string[] },
        language?: string,
        /**
         * Optional: when this session is started from a project workspace,
         * the projectId binds the resulting StudySession to that project so
         * it appears inside the project's "Estudio de lenguas" panel.
         */
        projectId?: string
    ): Promise<TrainingUnit[]> {
        // 1. Identify forms
        const formTexts = await this.greekTutorService.identifyForms(passage, fileSearchStoreId, config, language);

        // 2. Generate units in parallel
        const unitPromises = formTexts.map(formText =>
            this.greekTutorService.createTrainingUnit(formText, passage, fileSearchStoreId, config, language)
        );

        const units = await Promise.all(unitPromises);

        // 3. Create and persist session
        const sessionId = crypto.randomUUID();
        const unitsWithSession = units.map(u => ({ ...u, sessionId }));

        const session: StudySession = {
            id: sessionId,
            userId,
            passage,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'ACTIVE',
            units: unitsWithSession,
            responses: {},
            ...(projectId ? { projectId } : {}),
        };

        await this.sessionRepository.createSession(session);

        return unitsWithSession;
    }
}
