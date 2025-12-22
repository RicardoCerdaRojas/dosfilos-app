import { IGreekTutorService, TrainingUnit } from '@dosfilos/domain';

/**
 * Use case for answering free-form questions about a Greek word/unit.
 * Follows Single Responsibility Principle - only handles question answering logic.
 */
export class AskFreeQuestionUseCase {
    constructor(
        private greekTutorService: IGreekTutorService
    ) { }

    async execute(
        question: string,
        unit: TrainingUnit,
        passage: string,
        storeId: string,
        language: string
    ): Promise<string> {
        // Validate input
        if (!question || !question.trim()) {
            throw new Error('Question cannot be empty');
        }

        if (!unit) {
            throw new Error('Training unit is required');
        }

        // Build context from current unit
        const context = {
            greekWord: unit.greekForm.text,
            transliteration: unit.greekForm.transliteration,
            gloss: unit.greekForm.gloss,
            identification: unit.identification,
            functionInContext: unit.functionInContext,
            significance: unit.significance,
            passage: passage
        };

        // Call service with full context
        const answer = await this.greekTutorService.answerFreeQuestion(
            question,
            context,
            storeId,
            language
        );

        return answer;
    }
}
