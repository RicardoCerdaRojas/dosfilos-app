import { Button } from '@/components/ui/button';
import { X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function ActivationBanner() {
    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className="mb-8 relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                </svg>
            </div>

            <div className="relative flex flex-col md:flex-row items-center justify-between p-6 gap-6">
                <div className="flex items-center gap-5 flex-1 text-center md:text-left">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shrink-0 border border-white/20 shadow-inner">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-white tracking-tight">
                            ¡Comienza tu primer sermón hoy!
                        </h3>
                        <p className="text-blue-100 text-sm md:text-base max-w-xl leading-relaxed">
                            Estamos listos para ayudarte con el estudio exegético y la creación de la estructura homilética. Estudia profundo, ora en dependencia del Espíritu Santo y predica con fidelidad.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button
                        size="lg"
                        onClick={() => navigate('/dashboard/generate-sermon')}
                        className="bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-semibold shadow-md whitespace-nowrap w-full md:w-auto border-0"
                    >
                        Crear mi primer sermón
                        <Sparkles className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDismissed(true)}
                        className="text-blue-100 hover:text-white hover:bg-white/20 shrink-0"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
