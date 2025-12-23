import React, { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface SyntaxOnboardingProps {
    /** Whether to run the tour */
    run: boolean;
    /** Callback when tour completes or is skipped */
    onComplete: () => void;
}

const STORAGE_KEY = 'greek-tutor-syntax-onboarding-seen';

/**
 * SyntaxOnboarding - Interactive tour for first-time users
 * 
 * Uses react-joyride to guide users through the key features
 * of the syntax analysis interface.
 * 
 * Features:
 * - Highlights key UI elements
 * - Step-by-step explanations
 * - Skippable
 * - Only shows once (uses localStorage)
 */
export function SyntaxOnboarding({ run, onComplete }: SyntaxOnboardingProps) {
    const [runTour, setRunTour] = useState(false);

    useEffect(() => {
        if (run) {
            setRunTour(true);
        }
    }, [run]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRunTour(false);
            onComplete();
        }
    };

    const steps: Step[] = [
        {
            target: 'body',
            content: (
                <div className="space-y-2 text-left">
                    <h2 className="text-lg font-bold text-gray-900">
                        👋 ¡Bienvenido al Análisis Sintáctico!
                    </h2>
                    <p className="text-sm text-gray-700">
                        Esta herramienta te ayuda a entender <strong>la estructura</strong> del texto griego 
                        antes de estudiar palabras individuales.
                    </p>
                    <p className="text-sm text-gray-700">
                        Te mostraré los elementos clave en 5 pasos rápidos.
                    </p>
                    <div className="mt-3 p-2 bg-blue-50 rounded-md">
                        <p className="text-xs text-blue-800">
                            💡 Puedes saltar este tutorial en cualquier momento
                        </p>
                    </div>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '.syntax-description',
            content: (
                <div className="space-y-2">
                    <h3 className="text-base font-semibold text-gray-900">
                        📖 Descripción General
                    </h3>
                    <p className="text-sm text-gray-700">
                        Lee esta caja azul <strong>primero</strong>. Te da el panorama completo 
                        del argumento del pasaje.
                    </p>
                    <p className="text-xs text-gray-600 italic">
                        Pregunta: "¿Cuál es la idea principal?"
                    </p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '.syntax-main-clause',
            content: (
                <div className="space-y-2">
                    <h3 className="text-base font-semibold text-gray-900">
                        🔵 Cláusula Principal
                    </h3>
                    <p className="text-sm text-gray-700">
                        Las cláusulas con fondo <strong>azul</strong> son las <strong>principales</strong> - 
                        la espina dorsal del texto.
                    </p>
                    <p className="text-sm text-gray-700">
                        Identifica el <strong>verbo principal</strong> (posición indicada abajo) 
                        y el sujeto.
                    </p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '.syntax-subordinate',
            content: (
                <div className="space-y-2">
                    <h3 className="text-base font-semibold text-gray-900">
                        ↪️ Cláusulas Subordinadas
                    </h3>
                    <p className="text-sm text-gray-700">
                        Las cláusulas <strong>indentadas</strong> dependen de la principal.
                    </p>
                    <p className="text-sm text-gray-700">
                        El <strong>color</strong> te dice su función: verde (propósito), 
                        naranja (causa), etc.
                    </p>
                    <p className="text-xs text-gray-600 italic">
                        Pregunta: "¿Cómo modifica esta cláusula la principal?"
                    </p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '.syntax-controls',
            content: (
                <div className="space-y-2">
                    <h3 className="text-base font-semibold text-gray-900">
                        🎯 Controles de Vista
                    </h3>
                    <p className="text-sm text-gray-700">
                        Usa estos botones para controlar qué ves:
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• <strong>Colapsar Todo</strong>: Solo principales (para panorama)</li>
                        <li>• <strong>Expandir Todo</strong>: Ver toda la estructura</li>
                    </ul>
                    <p className="text-xs text-gray-600 mt-2 italic">
                        💡 Empieza colapsado para no abrumarte
                    </p>
                </div>
            ),
            placement: 'left',
        },
        {
            target: '.syntax-legend',
            content: (
                <div className="space-y-2">
                    <h3 className="text-base font-semibold text-gray-900">
                        🎨 Leyenda de Colores
                    </h3>
                    <p className="text-sm text-gray-700">
                        Cada color representa un tipo de cláusula con una función específica.
                    </p>
                    <p className="text-sm text-gray-700">
                        Por ejemplo: <strong>Verde</strong> = Propósito ("para que..."), 
                        <strong>Naranja</strong> = Causa ("porque...")
                    </p>
                    <div className="mt-3 p-2 bg-green-50 rounded-md">
                        <p className="text-xs text-green-800">
                            ✅ ¡Listo! Ahora sabes cómo usar el análisis sintáctico.
                        </p>
                    </div>
                </div>
            ),
            placement: 'top',
        },
    ];

    return (
        <Joyride
            steps={steps}
            run={runTour}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#3b82f6', // Blue 500
                    textColor: '#1f2937', // Gray 800
                    backgroundColor: '#ffffff',
                    overlayColor: 'rgba(0, 0, 0, 0.4)',
                    arrowColor: '#ffffff',
                    zIndex: 10000,
                },
                tooltip: {
                    borderRadius: 8,
                    fontSize: 14,
                },
                tooltipContainer: {
                    textAlign: 'left',
                },
                buttonNext: {
                    backgroundColor: '#3b82f6',
                    fontSize: 14,
                    padding: '8px 16px',
                    borderRadius: 6,
                },
                buttonBack: {
                    color: '#6b7280',
                    marginRight: 10,
                },
                buttonSkip: {
                    color: '#6b7280',
                },
            }}
            locale={{
                back: 'Atrás',
                close: 'Cerrar',
                last: 'Finalizar',
                next: 'Siguiente',
                skip: 'Saltar',
            }}
        />
    );
}

/**
 * Hook to check if user has seen the onboarding
 */
export function useHasSeenOnboarding(): [boolean, () => void] {
    const [hasSeen, setHasSeen] = useState(() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem(STORAGE_KEY) === 'true';
    });

    const markAsSeen = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, 'true');
            setHasSeen(true);
        }
    };

    return [hasSeen, markAsSeen];
}
