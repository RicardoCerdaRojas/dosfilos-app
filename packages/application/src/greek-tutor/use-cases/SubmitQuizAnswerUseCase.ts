import {
    ISessionRepository,
    QuizQuestion,
    QuizAttempt,
    UnitProgress
} from '@dosfilos/domain';

export interface QuizFeedback {
    isCorrect: boolean;
    explanation: string;
    updatedProgress: UnitProgress;
}

/**
 * Use case for submitting quiz answer and updating progress.
 * Follows Single Responsibility - validates answer and updates progress tracking.
 * 
 * Phase 3A: Supports unlimited retries as per requirements.
 */
export class SubmitQuizAnswerUseCase {
    constructor(private sessionRepository: ISessionRepository) { }

    /**
     * Submits a quiz answer, validates it, and updates user progress.
     * 
     * @param sessionId Current study session ID
     * @param unitId Training unit ID
     * @param question The quiz question being answered
     * @param userAnswer User's answer
     * @param currentProgress Current progress state for the unit
     * @returns Feedback with correctness, explanation, and updated progress
     */
    async execute(
        sessionId: string,
        unitId: string,
        question: QuizQuestion,
        userAnswer: string,
        currentProgress: UnitProgress
    ): Promise<QuizFeedback> {
        // Create quiz attempt record
        const attempt: QuizAttempt = {
            id: crypto.randomUUID(),
            unitId,
            questionId: question.id,
            userAnswer,
            isCorrect: this.validateAnswer(userAnswer, question.correctAnswer, question.type),
            attemptedAt: new Date()
        };

        // Update progress with new attempt
        const updatedProgress: UnitProgress = {
            ...currentProgress,
            quizAttempts: [...(currentProgress.quizAttempts || []), attempt],
            masteryLevel: this.calculateMasteryLevel(currentProgress, attempt),
            lastViewedAt: new Date()
        };

        // Persist to Firestore
        try {
            await this.sessionRepository.saveQuizAttempt(sessionId, attempt);
            await this.sessionRepository.updateUnitProgress(sessionId, unitId, updatedProgress);
        } catch (error) {
            console.error('[SubmitQuizAnswerUseCase] Error persisting quiz attempt:', error);
            // Continue execution - local state is still updated
        }

        return {
            isCorrect: attempt.isCorrect,
            explanation: question.explanation,
            updatedProgress
        };
    }

    /**
     * Validates user answer against correct answer.
     * Handles different question types with appropriate comparison logic.
     */
    private validateAnswer(
        userAnswer: string,
        correctAnswer: string,
        type: string
    ): boolean {
        // Normalize for comparison
        const normalize = (str: string) => str.trim().toLowerCase();

        const normalizedUser = normalize(userAnswer);
        const normalizedCorrect = normalize(correctAnswer);

        if (type === 'multiple-choice' || type === 'true-false') {
            // Exact match required
            return normalizedUser === normalizedCorrect;
        }

        if (type === 'fill-blank') {
            // More flexible - allow partial matches
            return normalizedUser.includes(normalizedCorrect) ||
                normalizedCorrect.includes(normalizedUser);
        }

        return false;
    }

    /**
     * Calculates mastery level based on quiz performance.
     * Follows "Tell, Don't Ask" principle - encapsulates calculation logic.
     * 
     * Levels:
     * - 0: Not viewed
     * - 1: Viewed (no quiz attempts)
     * - 2: Practiced (some correct answers)
     * - 3: Mastered (80%+ accuracy with 3+ attempts)
     */
    private calculateMasteryLevel(
        progress: UnitProgress,
        newAttempt: QuizAttempt
    ): 0 | 1 | 2 | 3 {
        const attempts = [...(progress.quizAttempts || []), newAttempt];
        const correctCount = attempts.filter(a => a.isCorrect).length;
        const totalCount = attempts.length;

        if (totalCount === 0) return 1; // Viewed but not practiced

        const accuracy = correctCount / totalCount;

        // Mastered: 80%+ accuracy with at least 3 attempts
        if (accuracy >= 0.8 && totalCount >= 3) return 3;

        // Practiced: 50%+ accuracy
        if (accuracy >= 0.5) return 2;

        // Just viewed/attempted
        return 1;
    }
}
