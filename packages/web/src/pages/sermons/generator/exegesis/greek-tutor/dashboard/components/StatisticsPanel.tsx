import React from 'react';
import { BarChart3, BookOpen, TrendingUp, Clock, Flame } from 'lucide-react';
import { StudySession } from '@dosfilos/domain';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculateSessionProgress, getSessionLastActivity } from '../utils/sessionUtils';
import { calculateStudyStreak } from '../utils/progressUtils';

interface StatisticsPanelProps {
    sessions: StudySession[];
}

/**
 * StatisticsPanel - Overview metrics for user's Greek Tutor study sessions
 * 
 * Displays:
 * - Total active sessions
 * - Total words studied
 * - Average progress
 * - Last activity timestamp
 */
export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ sessions }) => {
    // Calculate metrics
    const activeSessions = sessions.filter(s => s.status === 'ACTIVE').length;
    
    const totalWords = sessions.reduce((sum, session) => {
        return sum + (session.units?.length || 0);
    }, 0);
    
    // Calculate average from sessionProgress
    const averageProgress = sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + calculateSessionProgress(s), 0) / sessions.length)
        : 0;
    
    const lastActivity = sessions.length > 0
        ? sessions.reduce((latest, session) => {
            const sessionLastActivity = getSessionLastActivity(session);
            return sessionLastActivity > latest ? sessionLastActivity : latest;
        }, getSessionLastActivity(sessions[0]!))
        : null;
    
    const lastActivityText = lastActivity
        ? formatDistanceToNow(lastActivity, { addSuffix: true, locale: es })
        : 'N/A';

    const streak = calculateStudyStreak(sessions);

    const stats = [
        {
            icon: BarChart3,
            label: 'Sesiones Activas',
            value: activeSessions,
            color: 'text-blue-600'
        },
        {
            icon: BookOpen,
            label: 'Palabras Estudiadas',
            value: totalWords,
            color: 'text-green-600'
        },
        {
            icon: TrendingUp,
            label: 'Progreso Promedio',
            value: `${averageProgress}%`,
            color: 'text-purple-600'
        },
        {
            icon: Clock,
            label: 'Última Actividad',
            value: lastActivityText,
            color: 'text-amber-600'
        },
        ...(streak > 0 ? [{
            icon: Flame,
            label: 'Racha de Estudio',
            value: `${streak} día${streak > 1 ? 's' : ''}`,
            color: 'text-orange-600'
        }] : [])
    ];

    return (
        <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Resumen General
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <div key={index} className="space-y-1">
                        <div className="flex items-center gap-2">
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
