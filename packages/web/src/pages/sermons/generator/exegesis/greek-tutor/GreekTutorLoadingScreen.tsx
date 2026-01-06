import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, Sparkles, Heart, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';

interface LoadingStep {
    label: string;
    status: 'pending' | 'active' | 'complete';
}

const ENCOURAGEMENTS = [
    {
        quote: '"Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse, que usa bien la palabra de verdad."',
        ref: '2 Timoteo 2:15'
    },
    {
        quote: '"La suma de tu palabra es verdad, y eterno es todo juicio de tu justicia."',
        ref: 'Salmos 119:160'
    },
    {
        quote: '"Lámpara es a mis pies tu palabra, y lumbrera a mi camino."',
        ref: 'Salmos 119:105'
    },
    {
        quote: '"Escudriñad las Escrituras; porque a vosotros os parece que en ellas tenéis la vida eterna..."',
        ref: 'Juan 5:39'
    },
    {
        quote: '"Toda la Escritura es inspirada por Dios, y útil para enseñar, para redargüir, para corregir, para instruir en justicia."',
        ref: '2 Timoteo 3:16'
    }
];

export const GreekTutorLoadingScreen: React.FC = () => {
    const { t } = useTranslation('greekTutor');
    const [currentStep, setCurrentStep] = useState(0);
    const [encouragementIndex, setEncouragementIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    
    const steps: LoadingStep[] = [
        { label: t('loading.steps.grammar'), status: currentStep > 0 ? 'complete' : 'active' },
        { label: t('loading.steps.forms'), status: currentStep > 1 ? 'complete' : currentStep === 1 ? 'active' : 'pending' },
        { label: t('loading.steps.context'), status: currentStep > 2 ? 'complete' : currentStep === 2 ? 'active' : 'pending' },
        { label: t('loading.steps.units'), status: currentStep === 3 ? 'active' : 'pending' }
    ];

    useEffect(() => {
        // Simulate progress
        const interval = setInterval(() => {
            setCurrentStep(prev => (prev < 3 ? prev + 1 : prev));
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Animate progress bar
        const targetProgress = ((currentStep + 1) / 4) * 100;
        const step = (targetProgress - progress) / 20;
        
        const interval = setInterval(() => {
            setProgress(prev => {
                const next = prev + step;
                return next >= targetProgress ? targetProgress : next;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [currentStep, progress]);

    useEffect(() => {
        // Rotate encouragements
        const interval = setInterval(() => {
            setEncouragementIndex(prev => (prev + 1) % ENCOURAGEMENTS.length);
        }, 6000);

        return () => clearInterval(interval);
    }, []);

    const currentEncouragement = ENCOURAGEMENTS[encouragementIndex];

    return (
        <div className="h-full flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="max-w-6xl w-full relative z-10">
                {/* Two Column Layout */}
                <div className="grid lg:grid-cols-2 gap-6 md:gap-8 items-center">
                    {/* LEFT COLUMN - Progress & Steps */}
                    <div className="space-y-6">
                        {/* Icon & Title */}
                        <div className="flex items-start gap-4">
                            <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-600 rounded-full blur-xl opacity-50 animate-pulse" />
                                <div className="relative inline-flex items-center justify-center w-16 h-16 md:w-18 md:h-18 rounded-full bg-gradient-to-br from-primary to-purple-600 shadow-lg">
                                    <BookOpen className="h-8 w-8 md:h-9 md:w-9 text-white animate-pulse" />
                                </div>
                            </div>
                            <div className="flex-1 pt-1">
                                <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                                    {t('loading.title')}
                                </h2>
                                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                                    {t('loading.subtitle')}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <Card className="p-4 md:p-6 shadow-lg border-2 border-primary/10 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-foreground">{t('loading.progress')}</span>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-xs">{t('loading.estimatedTime')}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Progress value={progress} className="h-2" />
                                    <p className="text-right text-xs font-mono text-muted-foreground">
                                        {Math.round(progress)}%
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Progress Steps */}
                        <Card className="p-4 md:p-6 shadow-lg border-2 border-primary/10 backdrop-blur-sm bg-background/95">
                            <div className="space-y-3">
                                {steps.map((step, idx) => (
                                    <div 
                                        key={idx}
                                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                                            step.status === 'active' 
                                                ? 'bg-primary/10 border border-primary/20 scale-[1.02] shadow-sm' 
                                                : step.status === 'complete'
                                                ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900'
                                                : 'bg-muted/30 border border-transparent opacity-60'
                                        }`}
                                    >
                                        {step.status === 'active' && (
                                            <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                                        )}
                                        {step.status === 'complete' && (
                                            <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 animate-in zoom-in-50 duration-300">
                                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                        {step.status === 'pending' && (
                                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                                        )}
                                        <span className={`text-sm transition-all ${
                                            step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground font-medium'
                                        }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Bottom message */}
                        <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2 px-2">
                            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                            <span>{t('loading.footer')}</span>
                        </p>
                    </div>

                    {/* RIGHT COLUMN - Encouragement */}
                    <div className="hidden lg:flex items-center justify-center">
                        <Card className="p-8 shadow-2xl border-2 border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 w-full backdrop-blur-md relative overflow-hidden">
                            {/* Decorative background */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 dark:bg-amber-700/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-200/20 dark:bg-orange-700/10 rounded-full blur-3xl" />
                            
                            <div className="relative text-center space-y-6 animate-in fade-in slide-in-from-right-4 duration-700" key={encouragementIndex}>
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950/50 dark:to-amber-900/50 border-2 border-amber-300 dark:border-amber-700 shadow-lg">
                                    <Heart className="h-7 w-7 text-amber-600 dark:text-amber-500 animate-pulse" />
                                </div>
                                <div className="space-y-5">
                                    <blockquote className="text-base md:text-lg italic text-foreground/90 leading-relaxed font-serif">
                                        {currentEncouragement?.quote}
                                    </blockquote>
                                    <cite className="text-sm font-bold text-amber-700 dark:text-amber-500 not-italic block">
                                        — {currentEncouragement?.ref}
                                    </cite>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};
