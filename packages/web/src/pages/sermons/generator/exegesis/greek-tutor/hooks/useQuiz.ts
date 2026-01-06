import { useState, useCallback } from 'react';
import { QuizQuestion, UnitProgress, TrainingUnit } from '@dosfilos/domain';
import { GenerateQuizUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/GenerateQuizUseCase';
import { SubmitQuizAnswerUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/SubmitQuizAnswerUseCase';
import { useTranslation } from '@/i18n';

export interface UseQuizProps {
    unit: TrainingUnit;
    sessionId: string;
    generateQuizUseCase: GenerateQuizUseCase;
    submitQuizAnswerUseCase: SubmitQuizAnswerUseCase;
    fileSearchStoreId?: string;
}

export interface UseQuizReturn {
    questions: QuizQuestion[];
    currentQuestionIndex: number;
    isLoading: boolean;
    isSubmitted: boolean;
    userAnswer: string | null;
    isCorrect: boolean | null;
    progress: UnitProgress;
    loadQuiz: () => Promise<void>;
    submitAnswer: (answer: string) => Promise<void>;
    skipQuestion: () => void;
    nextQuestion: () => void;
}

/**
 * Custom hook for quiz logic and state management.
 * Follows Single Responsibility - manages quiz state and orchestrates use cases.
 * Phase 3A: Handles quiz generation, submission, and progress tracking.
 */
export const useQuiz = ({
    unit,
    sessionId,
    generateQuizUseCase,
    submitQuizAnswerUseCase,
    fileSearchStoreId
}: UseQuizProps): UseQuizReturn => {
    const { i18n } = useTranslation();
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [userAnswer, setUserAnswer] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [progress, setProgress] = useState<UnitProgress>(
        unit.progress || {
            viewedSections: [],
            quizAttempts: [],
            masteryLevel: 0
        }
    );

    const loadQuiz = useCallback(async () => {
        setIsLoading(true);
        try {
            const quizQuestions = await generateQuizUseCase.execute(unit, {
                count: 3,
                fileSearchStoreId,
                language: i18n.language // Pass current locale to use case
            });
            setQuestions(quizQuestions);
            setCurrentQuestionIndex(0);
            setIsSubmitted(false);
            setUserAnswer(null);
            setIsCorrect(null);
        } catch (error) {
            console.error('[useQuiz] Error loading quiz:', error);
        } finally {
            setIsLoading(false);
        }
    }, [unit, generateQuizUseCase, fileSearchStoreId, i18n.language]);

    const submitAnswer = useCallback(async (answer: string) => {
        if (questions.length === 0 || isSubmitted) return;

        const currentQuestion = questions[currentQuestionIndex];
        setUserAnswer(answer);
        setIsSubmitted(true);

        try {
            const feedback = await submitQuizAnswerUseCase.execute(
                sessionId,
                unit.id,
                currentQuestion,
                answer,
                progress
            );

            setIsCorrect(feedback.isCorrect);
            setProgress(feedback.updatedProgress);
        } catch (error) {
            console.error('[useQuiz] Error submitting answer:', error);
        }
    }, [questions, currentQuestionIndex, isSubmitted, sessionId, unit.id, progress, submitQuizAnswerUseCase]);

    const skipQuestion = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setIsSubmitted(false);
            setUserAnswer(null);
            setIsCorrect(null);
        }
    }, [currentQuestionIndex, questions.length]);

    const nextQuestion = useCallback(() => {
        skipQuestion();
    }, [skipQuestion]);

    return {
        questions,
        currentQuestionIndex,
        isLoading,
        isSubmitted,
        userAnswer,
        isCorrect,
        progress,
        loadQuiz,
        submitAnswer,
        skipQuestion,
        nextQuestion
    };
};
