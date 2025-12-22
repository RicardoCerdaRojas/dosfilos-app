
import React, { useState } from 'react';
import { TrainingUnit, UserResponse, MorphologyBreakdown } from '@dosfilos/domain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MorphologyBreakdownCard } from './MorphologyBreakdownCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TrainingUnitCardProps {
    unit: TrainingUnit;
    onSubmitResponse: (answer: string) => Promise<void>;
    response?: UserResponse;
    isSubmitting: boolean;
    // Morphology breakdown support
    morphologyBreakdown?: MorphologyBreakdown | null;
    isMorphologyLoading?: boolean;
    onRequestMorphology?: () => void;
}

export const TrainingUnitCard: React.FC<TrainingUnitCardProps> = ({ 
    unit, 
    onSubmitResponse, 
    response, 
    isSubmitting,
    morphologyBreakdown,
    isMorphologyLoading = false,
    onRequestMorphology
}) => {
    const [answer, setAnswer] = useState('');
    const [showGuidance, setShowGuidance] = useState(false);

    const handleSubmit = () => {
        if (answer.trim()) {
            onSubmitResponse(answer);
        }
    };

    return (
        <Card className="w-full max-w-full mx-auto shadow-lg border-2 border-primary/10">
            <CardHeader className="bg-muted/30 pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl font-serif text-primary">
                            {unit.greekForm.text}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground italic">
                            {unit.greekForm.transliteration} • {unit.greekForm.gloss}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            {unit.identification}
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
                {/* Recognition Guidance (Optional & Collapsible) */}
                {unit.recognitionGuidance && (
                    <div className="border rounded-md p-3 bg-card">
                        <button 
                            onClick={() => setShowGuidance(!showGuidance)}
                            className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors w-full"
                        >
                            {showGuidance ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                            {showGuidance ? "Ocultar ayuda de reconocimiento" : "Cómo reconocer esta forma..."}
                        </button>
                        {showGuidance && (
                            <p className="mt-2 text-sm text-foreground/80 pl-6 border-l-2 border-primary/20">
                                {unit.recognitionGuidance}
                            </p>
                        )}
                    </div>
                )}

                {/* Morphology Breakdown */}
                {onRequestMorphology && (
                    <MorphologyBreakdownCard
                        word={unit.greekForm.text}
                        breakdown={morphologyBreakdown || null}
                        isLoading={isMorphologyLoading}
                        onRequestBreakdown={onRequestMorphology}
                    />
                )}

                {/* Function & Context */}
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Función en Contexto
                    </h4>
                    <p className="text-sm leading-relaxed">{unit.functionInContext}</p>
                </div>

                {/* Significance (Hidden until answered? Pedagogical choice. Shown here for clarity) */}
                <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Significado Teológico
                    </h4>
                    <div className="text-sm italic border-l-4 border-accent pl-3 py-1 bg-accent/5 prose prose-sm prose-slate dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {unit.significance}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Reflective Question & Input */}
                <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-3">{unit.reflectiveQuestion}</h3>
                    
                    {!response ? (
                        <div className="space-y-3">
                            <Textarea 
                                placeholder="Escribe tu reflexión aquí..." 
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                className="min-h-[100px] resize-none"
                            />
                            <Button 
                                onClick={handleSubmit} 
                                disabled={!answer.trim() || isSubmitting}
                                className="w-full"
                            >
                                {isSubmitting ? "Analizando respuesta..." : "Enviar Respuesta"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="p-4 bg-muted rounded-md text-sm">
                                <p className="font-semibold text-xs uppercase text-muted-foreground mb-1">Tu respuesta:</p>
                                "{response.userAnswer}"
                            </div>

                            <Alert variant={response.isCorrect ? "default" : "destructive"} className={response.isCorrect ? "border-green-500/50 bg-green-500/10" : "border-amber-500/50 bg-amber-500/10"}>
                                {response.isCorrect ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                                <AlertTitle className={response.isCorrect ? "text-green-700" : "text-amber-700"}>
                                    Feedback del Tutor
                                </AlertTitle>
                                <AlertDescription className="mt-2 text-foreground prose prose-sm prose-slate dark:prose-invert max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {response.feedback}
                                    </ReactMarkdown>
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
