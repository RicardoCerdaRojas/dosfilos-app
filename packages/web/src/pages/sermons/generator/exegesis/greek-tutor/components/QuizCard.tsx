import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuizQuestion } from '@dosfilos/domain';
import { CheckCircle2, XCircle, HelpCircle, SkipForward } from 'lucide-react';

export interface QuizCardProps {
    question: QuizQuestion;
    onSubmit: (answer: string) => void;
    onSkip?: () => void;
    isSubmitted: boolean;
    userAnswer?: string;
    isCorrect?: boolean;
}

/**
 * Quiz card component for interactive question display.
 * Follows Single Responsibility - handles quiz UI rendering only.
 * Phase 3A: Supports unlimited retries and skip functionality.
 */
export const QuizCard: React.FC<QuizCardProps> = ({
    question,
    onSubmit,
    onSkip,
    isSubmitted,
    userAnswer,
    isCorrect
}) => {
    const [selectedAnswer, setSelectedAnswer] = useState<string>('');
    
    const handleSubmit = () => {
        if (selectedAnswer) {
            onSubmit(selectedAnswer);
        }
    };
    
    const getOptionStyle = (option: string) => {
        const baseClass = "w-full p-3 text-left rounded-lg border-2 transition-all text-sm";
        
        if (!isSubmitted) {
            return `${baseClass} ${
                selectedAnswer === option
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-border hover:border-blue-300 cursor-pointer'
            }`;
        }
        
        // After submission - show correct/incorrect
        if (option === question.correctAnswer) {
            return `${baseClass} border-green-500 bg-green-50 dark:bg-green-900/20 cursor-not-allowed`;
        }
        
        if (option === userAnswer && !isCorrect) {
            return `${baseClass} border-red-500 bg-red-50 dark:bg-red-900/20 cursor-not-allowed`;
        }
        
        return `${baseClass} border-border cursor-not-allowed opacity-60`;
    };
    
    return (
        <Card className="p-6 border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-purple-500/5 animate-in fade-in duration-300">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <HelpCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                        Quiz de Comprensión
                    </h4>
                </div>
                
                {/* Question */}
                <p className="text-base font-medium leading-relaxed">{question.question}</p>
                
                {/* Options */}
                {question.type === 'multiple-choice' && question.options && (
                    <div className="space-y-2">
                        {question.options.map((option) => (
                            <button
                                key={option}
                                onClick={() => !isSubmitted && setSelectedAnswer(option)}
                                disabled={isSubmitted}
                                className={getOptionStyle(option)}
                            >
                                <span className="flex items-center justify-between">
                                    <span>{option}</span>
                                    {isSubmitted && option === question.correctAnswer && (
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    )}
                                    {isSubmitted && option === userAnswer && !isCorrect && (
                                        <XCircle className="w-4 h-4 text-red-600" />
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                
                {/* True/False options */}
                {question.type === 'true-false' && (
                    <div className="grid grid-cols-2 gap-3">
                        {['Verdadero', 'Falso'].map((option) => (
                            <button
                                key={option}
                                onClick={() => !isSubmitted && setSelectedAnswer(option)}
                                disabled={isSubmitted}
                                className={getOptionStyle(option)}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <span>{option}</span>
                                    {isSubmitted && option === question.correctAnswer && (
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    )}
                                    {isSubmitted && option === userAnswer && !isCorrect && (
                                        <XCircle className="w-4 h-4 text-red-600" />
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                
                {/* Action Buttons */}
                {!isSubmitted && (
                    <div className="flex gap-2">
                        <Button 
                            onClick={handleSubmit}
                            disabled={!selectedAnswer}
                            className="flex-1"
                        >
                            Verificar Respuesta
                        </Button>
                        {onSkip && (
                            <Button 
                                onClick={onSkip}
                                variant="outline"
                                className="flex items-center gap-1"
                            >
                                <SkipForward className="w-4 h-4" />
                                Saltar
                            </Button>
                        )}
                    </div>
                )}
                
                {/* Feedback */}
                {isSubmitted && (
                    <div className={`
                        p-4 rounded-lg border-2 animate-in slide-in-from-top duration-300
                        ${isCorrect 
                            ? 'border-green-500/30 bg-green-500/10' 
                            : 'border-red-500/30 bg-red-500/10'}
                    `}>
                        <div className="flex items-start gap-2">
                            {isCorrect ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                                <p className="font-semibold text-sm mb-1">
                                    {isCorrect ? '¡Correcto! 🎉' : 'No es correcto'}
                                </p>
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                    {question.explanation}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};
