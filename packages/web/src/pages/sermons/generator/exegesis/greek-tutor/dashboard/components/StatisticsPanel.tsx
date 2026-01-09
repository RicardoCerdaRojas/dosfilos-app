import React from 'react';
import { BarChart3, BookOpen, TrendingUp, Clock, Flame, Info } from 'lucide-react';
import { StudySession } from '@dosfilos/domain';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { calculateSessionProgress, getSessionLastActivity } from '../utils/sessionUtils';
import { calculateStudyStreak } from '../utils/progressUtils';
import { useTranslation } from '@/i18n';
import { Trans } from 'react-i18next';


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
    const { i18n } = useTranslation();
    
    // Get date-fns locale based on current language
    const dateLocale = i18n.language.startsWith('en') ? enUS : es;
    const { t } = useTranslation('greekTutor');
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
    
    // Shorter format: "2h ago" / "hace 2h"
    const lastActivityText = lastActivity
        ? formatDistanceToNow(lastActivity, { addSuffix: true, locale: dateLocale })
            // Spanish replacements
            .replace('alrededor de ', '')
            .replace(' horas', 'h')
            .replace(' hora', 'h')
            .replace(' minutos', 'min')
            .replace(' minuto', 'min')
            .replace(' días', 'd')
            .replace(' día', 'd')
            // English replacements
            .replace(' hours', 'h')
            .replace(' hour', 'h')
            .replace(' minutes', 'min')
            .replace(' minute', 'min')
            .replace(' days', 'd')
            .replace(' day', 'd')
            .replace('about ', '')
        : 'N/A';

    const streak = calculateStudyStreak(sessions);

    const stats = [
        {
            icon: BarChart3,
            label: t('dashboard.statistics.activeSessions'),
            value: activeSessions,
            color: 'text-blue-600'
        },
        {
            icon: BookOpen,
            label: t('dashboard.statistics.wordsStudied'),
            value: totalWords,
            color: 'text-green-600'
        },
        ...(streak > 0 ? [{
            icon: Flame,
            label: t('dashboard.statistics.studyStreak'),
            value: t(`dashboard.statistics.streakDays`, { count: streak }),
            color: 'text-orange-600'
        }] : []),
        {
            icon: TrendingUp,
            label: t('dashboard.statistics.averageProgress'),
            value: `${averageProgress}%`,
            color: 'text-purple-600'
        },
        {
            icon: Clock,
            label: t('dashboard.statistics.lastActivity'),
            value: lastActivityText,
            color: 'text-amber-600'
        }
    ];


    return (
        <div className="bg-card border rounded-lg p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {stats.map((stat, index) => {
                    // Determine if this stat needs a tooltip
                    const needsTooltip = stat.label === t('dashboard.statistics.averageProgress') || stat.label === t('dashboard.statistics.studyStreak');
                    
                    const statContent = (
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                                <stat.icon className={`h-3 w-3 ${stat.color}`} />
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                                {needsTooltip && (
                                    <Info className="h-3 w-3 text-muted-foreground/50 hover:text-primary transition-colors cursor-help" />
                                )}
                            </div>
                            <p className="text-xl font-bold">{stat.value}</p>
                        </div>
                    );

                    if (!needsTooltip) {
                        return <div key={index}>{statContent}</div>;
                    }

                    // Tooltip content based on metric
                    const tooltipContent = stat.label === t('dashboard.statistics.averageProgress') ? (
                        <div className="space-y-2 max-w-xs">
                            <p className="font-semibold text-sm">{t('dashboard.statistics.tooltips.masteryTitle')}</p>
                            <p className="text-sm">
                                <Trans
                                    i18nKey="dashboard.statistics.tooltips.masteryDesc"
                                    t={t}
                                    components={[<span className="font-semibold text-primary" key="0">dominando</span>]}
                                />
                            </p>
                            <div className="text-xs space-y-1 bg-muted/50 p-2 rounded">
                                <p className="font-medium">{t('dashboard.statistics.tooltips.calcTitle')}</p>
                                <p><Trans i18nKey="dashboard.statistics.tooltips.calcMastered" t={t} components={[<span className="text-green-600 font-medium" key="0">dominada</span>]} /></p>
                                <p>{t('dashboard.statistics.tooltips.calcAverage')}</p>
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                                {t('dashboard.statistics.tooltips.masteryTip')}
                            </p>
                        </div>
                    ) : ( // Racha de Estudio
                        <div className="space-y-2 max-w-xs">
                            <p className="font-semibold text-sm">{t('dashboard.statistics.tooltips.streakTitle')}</p>
                            <p className="text-sm">
                                <Trans 
                                    i18nKey="dashboard.statistics.tooltips.streakDesc" 
                                    t={t} 
                                    components={[<span className="font-semibold text-orange-600" key="0">consistencia</span>]} 
                                />
                            </p>
                            <div className="text-xs space-y-1 bg-muted/50 p-2 rounded">
                                <p className="font-medium">{t('dashboard.statistics.tooltips.streakCalcTitle')}</p>
                                <p>{t('dashboard.statistics.tooltips.streakRule1')}</p>
                                <p>{t('dashboard.statistics.tooltips.streakRule2')}</p>
                                <p>{t('dashboard.statistics.tooltips.streakRule3')}</p>
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                                {t('dashboard.statistics.tooltips.streakTip')}
                            </p>
                        </div>
                    );

                    return (
                        <Popover key={index}>
                            <PopoverTrigger asChild>
                                {statContent}
                            </PopoverTrigger>
                            <PopoverContent side="top" className="w-80">
                                {tooltipContent}
                            </PopoverContent>
                        </Popover>
                    );
                })}
            </div>
        </div>
    );
};
