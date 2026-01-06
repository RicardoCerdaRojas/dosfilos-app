
import { IGreekTutorService, TrainingUnit, UserResponse, ISessionRepository } from '@dosfilos/domain';

export class EvaluateUserResponseUseCase {
    constructor(
        private greekTutorService: IGreekTutorService,
        private sessionRepository: ISessionRepository
    ) { }

    async execute(
        unit: TrainingUnit,
        userAnswer: string,
        fileSearchStoreId: string,
        language?: string
    ): Promise<UserResponse> {
        const evaluation = await this.greekTutorService.evaluateResponse(unit, userAnswer, fileSearchStoreId, language);

        const response: UserResponse = {
            id: crypto.randomUUID(),
            unitId: unit.id,
            userAnswer,
            feedback: evaluation.feedback,
            isCorrect: evaluation.isCorrect,
            createdAt: new Date()
        };

        // Persist Response
        if (unit.sessionId) {
            const session = await this.sessionRepository.getSession(unit.sessionId);
            if (session) {
                session.responses[response.id] = response;
                await this.sessionRepository.updateSession(session);
            } else {
                console.warn(`Session ${unit.sessionId} not found when saving response`);
            }
        }

        return response;
    }
}
