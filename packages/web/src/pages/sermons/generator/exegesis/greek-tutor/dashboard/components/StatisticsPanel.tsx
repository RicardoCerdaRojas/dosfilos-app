import React from 'react';
import { BarChart3, BookOpen, TrendingUp, Clock, Flame, Info } from 'lucide-react';
import { StudySession } from '@dosfilos/domain';
import { es, enUS } from 'date-fns/locale';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { calculateSessionProgress, getSessionLastActivity } from '../utils/sessionUtils';
import { calculateStudyStreak } from '../utils/progressUtils';
import { shortRelativeTime } from '../utils/relativeTimeUtils';
import { useTranslation } from '@/i18n';
import { Trans } from 'react-i18next';

interface StatisticsPanelProps {
    sessions: StudySession[];
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ sessions }) => {
    const { i18n } = useTranslation();
    const dateLocale = i18n.language.startsWith('en') ? enUS : es;
    const { t } = useTranslation('greekTutor');

    const activeSessions = sessions.filter(s => s.status === 'ACTIVE').length;
    const totalWords = sessions.reduce((sum, session) => sum + (session.units?.length || 0), 0);
    const averageProgress = sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + calculateSessionProgress(s), 0) / sessions.length)
        : 0;

    const lastActivity = sessions.length > 0
        ? sessions.reduce((latest, session) => {
            const sessionLastActivity = getSessionLastActivity(session);
            return sessionLastActivity > latest ? sessionLastActivity : latest;
        }, getSessionLastActivity(sessions[0]!))
        : null;

    const lastActivityText = lastActivity ? shortRelativeTime(lastActivity, dateLocale) : 'N/A';
    const streak = calculateStudyStreak(sessions);

    const stats = [
        {
            key: 'activity',
            icon: Clock,
            label: t('dashboard.statistics.lastActivity'),
            value: lastActivityText,
            color: 'text-primary',
        },
        {
            key: 'active',
            icon: BarChart3,
            label: t('dashboard.statistics.activeSessions'),
            value: activeSessions,
            color: 'text-info',
        },
        {
            key: 'words',
            icon: BookOpen,
            label: t('dashboard.statistics.wordsStudied'),
            value: totalWords,
            color: 'text-success',
        },
        ...(streak > 0 ? [{
            key: 'streak',
            icon: Flame,
            label: t('dashboard.statistics.studyStreak'),
            value: t(`dashboard.statistics.streakDays`, { count: streak }),
            color: 'text-warning',
        }] : []),
        {
            key: 'progress',
            icon: TrendingUp,
            label: t('dashboard.statistics.averageProgress'),
            value: `${averageProgress}%`,
            color: 'text-primary',
        },
    ];

    return (
        <div className="bg-card border rounded-lg overflow-hidden">
            {/* `divide-x` paints a hairline between cells so the row reads as a structured strip
                rather than free-floating numbers. Vertical dividers collapse on mobile via flex-wrap. */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border">
                {stats.map((stat) => {
                    const needsTooltip = stat.key === 'progress' || stat.key === 'streak';

                    const statContent = (
                        <div className="px-4 py-3 space-y-1">
                            <div className="flex items-center gap-1.5">
                                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                                {needsTooltip && (
                                    <Info className="h-3 w-3 text-muted-foreground/50 hover:text-primary transition-colors cursor-help" />
                                )}
                            </div>
                            <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                        </div>
                    );

                    if (!needsTooltip) {
                        return <div key={stat.key}>{statContent}</div>;
                    }

                    const tooltipContent = stat.key === 'progress' ? (
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
                                <p><Trans i18nKey="dashboard.statistics.tooltips.calcMastered" t={t} components={[<span className="text-success font-medium" key="0">dominada</span>]} /></p>
                                <p>{t('dashboard.statistics.tooltips.calcAverage')}</p>
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                                {t('dashboard.statistics.tooltips.masteryTip')}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-w-xs">
                            <p className="font-semibold text-sm">{t('dashboard.statistics.tooltips.streakTitle')}</p>
                            <p className="text-sm">
                                <Trans
                                    i18nKey="dashboard.statistics.tooltips.streakDesc"
                                    t={t}
                                    components={[<span className="font-semibold text-warning" key="0">consistencia</span>]}
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
                        <Popover key={stat.key}>
                            <PopoverTrigger asChild>
                                <button className="text-left hover:bg-muted/30 transition-colors">
                                    {statContent}
                                </button>
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
