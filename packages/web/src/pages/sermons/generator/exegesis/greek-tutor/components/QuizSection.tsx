import React, { useEffect } from 'react';
import { TrainingUnit } from '@dosfilos/domain';
import { QuizCard } from './QuizCard';
import { ProgressBadge } from './ProgressBadge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';
import { useQuiz } from '../hooks/useQuiz';
import { GenerateQuizUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/GenerateQuizUseCase';
import { SubmitQuizAnswerUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/SubmitQuizAnswerUseCase';

export interface QuizSectionProps {
    unit: TrainingUnit;
    sessionId: string;
    generateQuizUseCase: GenerateQuizUseCase;
    submitQuizAnswerUseCase: SubmitQuizAnswerUseCase;
    fileSearchStoreId?: string;
}

/**
 * Quiz section wrapper component.
 * Manages quiz state and renders QuizCard for each question.
 * Phase 3A: Integrates quiz functionality into content displays.
 */
export const QuizSection: React.FC<QuizSectionProps> = ({
    unit,
    sessionId,
    generateQuizUseCase,
    submitQuizAnswerUseCase,
    fileSearchStoreId
}) => {
    const {
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
    } = useQuiz({
        unit,
        sessionId,
        generateQuizUseCase,
        submitQuizAnswerUseCase,
        fileSearchStoreId
    });

    // Auto-load quiz on mount
    useEffect(() => {
        loadQuiz();
    }, [loadQuiz]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Generando quiz...</span>
            </div>
        );
    }

    if (questions.length === 0) {
        return null;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    return (
        <div className="space-y-4">
            {/* Header with progress */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold">Practica tu comprensión</h3>
                    <p className="text-sm text-muted-foreground">
                        Pregunta {currentQuestionIndex + 1} de {questions.length}
                    </p>
                </div>
                <ProgressBadge masteryLevel={progress.masteryLevel} />
            </div>

            {/* Quiz Card */}
            <QuizCard
                question={currentQuestion}
                onSubmit={submitAnswer}
                onSkip={!isLastQuestion ? skipQuestion : undefined}
                isSubmitted={isSubmitted}
                userAnswer={userAnswer || undefined}
                isCorrect={isCorrect || undefined}
            />

            {/* Next Question Button */}
            {isSubmitted && !isLastQuestion && (
                <Button
                    onClick={nextQuestion}
                    className="w-full"
                >
                    Siguiente Pregunta
                    <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            )}

            {/* Completion Message */}
            {isSubmitted && isLastQuestion && (
                <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/30">
                    <p className="text-center font-semibold">
                        ✨ ¡Quiz completado! Tu nivel es: <ProgressBadge masteryLevel={progress.masteryLevel} size="sm" />
                    </p>
                </div>
            )}
        </div>
    );
};
