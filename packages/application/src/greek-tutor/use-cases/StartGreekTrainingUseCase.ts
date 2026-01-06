
import { StudySession } from '@dosfilos/domain';

export class StartGreekTrainingUseCase {
    async execute(userId: string, passage: string): Promise<StudySession> {
        return {
            id: crypto.randomUUID(),
            userId,
            passage,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'ACTIVE',
            units: [],
            responses: {}
        };
    }
}
