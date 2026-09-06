import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, BookOpen, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface CelebrationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CelebrationModal({ isOpen, onClose }: CelebrationModalProps) {
    const navigate = useNavigate();
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            // Auto-hide confetti after 3 seconds
            const timer = setTimeout(() => setShowConfetti(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // El tutor ya no genera sermones: entrega al estudio de 8 pasos. El
    // texto del botón sigue a esa promesa — ofrecerle "crear otro sermón"
    // a alguien que acaba de terminar el onboarding era, además, la
    // entrada más temprana del producto a un sermón sin estudio.
    const handleStartNextStudy = () => {
        onClose();
        navigate('/dashboard/sermons/tutor');
    };

    return (
        <>
            {/* Confetti Effect */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: '-10px',
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${2 + Math.random() * 2}s`,
                            }}
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                    backgroundColor: ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'][
                                        Math.floor(Math.random() * 5)
                                    ],
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl text-center justify-center">
                            <Sparkles className="h-6 w-6 text-yellow-500" />
                            ¡Felicitaciones!
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Main Message */}
                        <div className="text-center">
                            <div className="text-6xl mb-4">🎉</div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                Has creado tu primer sermón
                            </h3>
                            <p className="text-slate-600">
                                Este es solo el comienzo de tu jornada con DosFilos.Preach
                            </p>
                        </div>

                        {/* Stats/Achievements */}
                        <div className="grid gap-3">
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                                <div className="text-sm">
                                    <p className="font-medium text-blue-900">Primer Sermón Completado</p>
                                    <p className="text-blue-700">Ahora tienes acceso completo a todas las herramientas</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-purple-600" />
                                <div className="text-sm">
                                    <p className="font-medium text-purple-900">Sigue Creando</p>
                                    <p className="text-purple-700">Los pastores activos crean 3+ sermones por mes</p>
                                </div>
                            </div>
                        </div>

                        {/* Next Steps */}
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm font-medium text-slate-900 mb-2">
                                💡 Próximos pasos sugeridos:
                            </p>
                            <ul className="text-sm text-slate-700 space-y-1 ml-4">
                                <li>• Explora el Greek Tutor para análisis profundo</li>
                                <li>• Organiza sermones en series temáticas</li>
                                <li>• Sube recursos a tu biblioteca personal</li>
                            </ul>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Explorar dashboard
                        </Button>
                        <Button
                            onClick={handleStartNextStudy}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Empezar otro estudio
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <style>{`
                @keyframes confetti {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                .animate-confetti {
                    animation: confetti linear forwards;
                }
            `}</style>
        </>
    );
}
