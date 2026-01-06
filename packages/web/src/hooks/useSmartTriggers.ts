import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';
import { toast } from 'sonner';
import { Calendar, BookOpen, GraduationCap } from 'lucide-react';
import React from 'react';

const COOLDOWN_HOURS = 24;
const MAX_SHOWINGS = 3;

interface TriggerConfig {
    id: string;
    condition: (context: TriggerContext) => boolean;
    action: (navigate: any) => void;
    cooldown?: number; // hours
    maxShowings?: number;
}

interface TriggerContext {
    user: any;
    location: any;
    visitsCount: number;
    sermonsCount: number;
    libraryCount: number; // Placeholder for now
}

export function useSmartTriggers() {
    const { user } = useFirebase();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;

        // Load state
        const visitsCount = parseInt(localStorage.getItem('dashboard_visits') || '0');
        const sermonsCount = (user as any).analytics?.sermonsCreated || 0;

        // Context object
        const context: TriggerContext = {
            user,
            location,
            visitsCount,
            sermonsCount,
            libraryCount: 0 // TODO: Connect to actual library count
        };

        // Check triggers
        checkTriggers(context, navigate);

    }, [user, location.pathname]);
}

function checkTriggers(context: TriggerContext, navigate: any) {
    const triggers: TriggerConfig[] = [
        // 1. Weekend Prep (Friday/Saturday)
        {
            id: 'weekend_prep',
            condition: () => {
                const day = new Date().getDay();
                const isWeekendPrep = day === 5 || day === 6; // Friday (5) or Saturday (6)
                return isWeekendPrep;
            },
            action: (nav) => {
                toast("¿Predicas este domingo?", {
                    description: "Prepara tu bosquejo en minutos con nuestra IA.",
                    icon: React.createElement(Calendar, { className: "h-5 w-5 text-blue-500" }),
                    duration: 8000,
                    action: {
                        label: "Crear Bosquejo",
                        onClick: () => nav('/dashboard/generate-sermon')
                    }
                });
            }
        },
        // 2. Helper (Stuck User)
        {
            id: 'stuck_user_helper',
            condition: ({ visitsCount, sermonsCount }) => {
                return visitsCount >= 3 && sermonsCount === 0;
            },
            action: (nav) => {
                toast("¿Necesitas ayuda para empezar?", {
                    description: "Mira cómo crear tu primer sermón paso a paso.",
                    icon: React.createElement(GraduationCap, { className: "h-5 w-5 text-yellow-500" }),
                    duration: 10000,
                    action: {
                        label: "Comenzar",
                        onClick: () => nav('/dashboard/generate-sermon')
                    }
                });
            }
        },
        // 3. Greek Tutor Discovery
        {
            id: 'greek_tutor_discovery',
            condition: ({ sermonsCount }) => {
                return sermonsCount > 0 && Math.random() > 0.7; // Show occasionally for active users
            },
            action: (nav) => {
                toast("Profundiza en el texto original", {
                    description: "Prueba el Tutor de Griego para exégesis avanzada.",
                    icon: React.createElement(BookOpen, { className: "h-5 w-5 text-purple-500" }),
                    duration: 8000,
                    action: {
                        label: "Ir al Tutor",
                        onClick: () => nav('/dashboard/greek-tutor')
                    }
                });
            }
        }
    ];

    for (const trigger of triggers) {
        if (shouldTrigger(trigger, context)) {
            trigger.action(navigate);
            recordTrigger(trigger.id);
            break; // Validar solo un trigger por sesión/navegación para no saturar
        }
    }
}

function shouldTrigger(trigger: TriggerConfig, context: TriggerContext): boolean {
    // 1. Check condition
    if (!trigger.condition(context)) return false;

    // 2. Check limits
    const lastShown = parseInt(localStorage.getItem(`trigger_last_${trigger.id}`) || '0');
    const showCount = parseInt(localStorage.getItem(`trigger_count_${trigger.id}`) || '0');

    // Max showings
    if (showCount >= (trigger.maxShowings || MAX_SHOWINGS)) return false;

    // Cooldown
    const hoursSinceLast = (Date.now() - lastShown) / (1000 * 60 * 60);
    if (hoursSinceLast < (trigger.cooldown || COOLDOWN_HOURS)) return false;

    return true;
}

function recordTrigger(triggerId: string) {
    localStorage.setItem(`trigger_last_${triggerId}`, Date.now().toString());
    const count = parseInt(localStorage.getItem(`trigger_count_${triggerId}`) || '0');
    localStorage.setItem(`trigger_count_${triggerId}`, (count + 1).toString());
}
