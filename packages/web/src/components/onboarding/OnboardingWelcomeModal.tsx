import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, BookOpen, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { markWelcomeCompleted } from '@/hooks/useOnboardingState';
import { useFirebase } from '@/context/firebase-context';

interface OnboardingWelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function OnboardingWelcomeModal({ isOpen, onClose }: OnboardingWelcomeModalProps) {
    const navigate = useNavigate();
    const { user } = useFirebase();

    const handleStartSermon = () => {
        if (user) markWelcomeCompleted(user.uid);
        onClose();
        navigate('/dashboard/generate-sermon');
    };

    const handleSkip = () => {
        if (user) markWelcomeCompleted(user.uid);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Sparkles className="h-6 w-6 text-yellow-500" />
                        ¡Bienvenido a DosFilos.Preach!
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        Estás a solo 5 minutos de crear tu primer sermón con asistencia de IA
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Value Propositions */}
                    <div className="grid gap-4">
                        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                            <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-blue-900">Análisis Bíblico Profundo</h3>
                                <p className="text-sm text-blue-700">
                                    Nuestra IA analiza el contexto, la exégesis y la aplicación homilética de tu pasaje
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                            <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-green-900">Ahorra Horas de Preparación</h3>
                                <p className="text-sm text-green-700">
                                    Lo que normalmente te toma horas, ahora lo logras en minutos con calidad profesional
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                            <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-purple-900">Griego Bíblico con IA</h3>
                                <p className="text-sm text-purple-700">
                                    Accede al Greek Tutor para análisis morfológico y sintáctico profundo
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Example */}
                    <div className="border-t pt-4">
                        <p className="text-sm text-slate-600 text-center">
                            💡 <strong>Tip:</strong> Empieza con un pasaje conocido como Juan 3:16 o Salmo 23
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={handleSkip}
                        className="flex-1"
                    >
                        Lo haré después
                    </Button>
                    <Button
                        onClick={handleStartSermon}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Crear mi primer sermón
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
