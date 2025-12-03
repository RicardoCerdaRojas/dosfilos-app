import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { WorkflowPhase } from '@dosfilos/domain';
import { Brain, CheckCircle2, Loader2 } from 'lucide-react';

interface GenerationProgressProps {
    phase: WorkflowPhase;
}

const STEPS = {
    [WorkflowPhase.EXEGESIS]: [
        "Inicializando experto en exégesis...",
        "Analizando el texto original (Griego/Hebreo)...",
        "Consultando documentos de contexto histórico...",
        "Examinando referencias cruzadas...",
        "Sintetizando proposición exegética...",
        "Redactando reporte final..."
    ],
    [WorkflowPhase.HOMILETICS]: [
        "Inicializando experto en homilética...",
        "Revisando análisis exegético...",
        "Estructurando bosquejo del sermón...",
        "Buscando aplicaciones contemporáneas...",
        "Definiendo proposición homilética...",
        "Finalizando estructura..."
    ],
    [WorkflowPhase.DRAFTING]: [
        "Inicializando redactor experto...",
        "Desarrollando introducción...",
        "Redactando puntos principales...",
        "Añadiendo ilustraciones y ejemplos...",
        "Escribiendo conclusión y llamado...",
        "Revisando tono y estilo..."
    ],
    [WorkflowPhase.COMPLETED]: []
};

export function GenerationProgress({ phase }: GenerationProgressProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const steps = STEPS[phase] || STEPS[WorkflowPhase.EXEGESIS];

    useEffect(() => {
        // Reset state when phase changes
        setCurrentStep(0);
        setProgress(0);
    }, [phase]);

    useEffect(() => {
        const stepDuration = 4000; // 4 seconds per step
        
        const interval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev < steps.length - 1) return prev + 1;
                return prev;
            });
        }, stepDuration);

        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return 95; // Stall at 95% until done
                return prev + (100 / (steps.length * 40)); // Smooth increment
            });
        }, 100);

        return () => {
            clearInterval(interval);
            clearInterval(progressInterval);
        };
    }, [steps.length]);

    return (
        <Card className="p-8 max-w-md mx-auto space-y-6 border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-xl">
            <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                    <div className="relative bg-background p-4 rounded-full border-2 border-primary/20 shadow-lg">
                        <Brain className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg animate-in fade-in slide-in-from-bottom-2">
                        {steps[currentStep]}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        El experto IA está trabajando en tu sermón...
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Procesando</span>
                    <span>{Math.round(progress)}%</span>
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
                {steps.map((step, index) => (
                    <div 
                        key={index}
                        className={`flex items-center gap-3 text-sm transition-all duration-500 ${
                            index === currentStep 
                                ? 'text-primary font-medium scale-105 origin-left' 
                                : index < currentStep 
                                    ? 'text-muted-foreground/50' 
                                    : 'text-muted-foreground/30'
                        }`}
                    >
                        {index < currentStep ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : index === currentStep ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <div className="h-4 w-4 rounded-full border border-current opacity-20" />
                        )}
                        {step}
                    </div>
                ))}
            </div>
        </Card>
    );
}
