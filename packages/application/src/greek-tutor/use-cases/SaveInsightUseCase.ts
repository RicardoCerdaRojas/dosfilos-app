import { ISessionRepository, ExegeticalInsight } from '@dosfilos/domain';

export class SaveInsightUseCase {
    constructor(private sessionRepository: ISessionRepository) { }

    async execute(sessionId: string, unitId: string, content: string, tags: string[] = []): Promise<ExegeticalInsight> {

        const insight: ExegeticalInsight = {
            id: crypto.randomUUID(),
            sessionId,
            unitId,
            content,
            tags,
            createdAt: new Date()
        };

        await this.sessionRepository.saveInsight(insight);

        return insight;
    }
}
