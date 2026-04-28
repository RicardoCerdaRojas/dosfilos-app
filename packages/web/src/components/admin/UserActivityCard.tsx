import { UserActivitySummary } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import {
    FileText,
    Check,
    BookOpen,
    Upload,
    CalendarDays,
    Languages,
    MessageSquare,
    FolderKanban,
    Layers,
} from 'lucide-react';
import { useTranslation } from '@/i18n';

interface Props {
    activity: UserActivitySummary;
}

interface MetricItemProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    color?: string;
}

function MetricItem({ label, value, icon, color = 'blue' }: MetricItemProps) {
    const colorClasses = {
        blue:    'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/40',
        green:   'text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-950/40',
        purple:  'text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-950/40',
        orange:  'text-orange-600 bg-orange-50 dark:text-orange-300 dark:bg-orange-950/40',
        indigo:  'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/40',
        pink:    'text-pink-600 bg-pink-50 dark:text-pink-300 dark:bg-pink-950/40',
        teal:    'text-teal-600 bg-teal-50 dark:text-teal-300 dark:bg-teal-950/40',
        amber:   'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40',
        rose:    'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40',
    };

    const selectedColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

    return (
        <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
            <div className={`p-2 rounded-lg ${selectedColor}`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">{label}</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{value.toLocaleString()}</p>
            </div>
        </div>
    );
}

export function UserActivityCard({ activity }: Props) {
    const { t } = useTranslation('admin');

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
                {t('users.activity.summary.title')}
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <MetricItem
                    label={t('users.activity.summary.sermons')}
                    value={activity.totalSermonsCreated}
                    icon={<FileText className="h-5 w-5" />}
                    color="blue"
                />
                <MetricItem
                    label={t('users.activity.summary.published')}
                    value={activity.totalSermonsPublished}
                    icon={<Check className="h-5 w-5" />}
                    color="green"
                />
                <MetricItem
                    label={t('users.activity.summary.series')}
                    value={activity.totalSeriesCreated}
                    icon={<Layers className="h-5 w-5" />}
                    color="indigo"
                />
                <MetricItem
                    label={t('users.activity.summary.plans')}
                    value={activity.totalPreachingPlans}
                    icon={<CalendarDays className="h-5 w-5" />}
                    color="pink"
                />
                <MetricItem
                    label={t('users.activity.summary.greekTutor')}
                    value={activity.totalGreekSessions}
                    icon={<BookOpen className="h-5 w-5" />}
                    color="purple"
                />
                <MetricItem
                    label={t('users.activity.summary.hebrewTutor')}
                    value={activity.totalHebrewSessions}
                    icon={<Languages className="h-5 w-5" />}
                    color="amber"
                />
                <MetricItem
                    label={t('users.activity.summary.faculty')}
                    value={activity.totalFacultySessions}
                    icon={<MessageSquare className="h-5 w-5" />}
                    color="teal"
                />
                <MetricItem
                    label={t('users.activity.summary.projects')}
                    value={activity.totalProjectsCreated}
                    icon={<FolderKanban className="h-5 w-5" />}
                    color="rose"
                />
                <MetricItem
                    label={t('users.activity.summary.library')}
                    value={activity.totalLibraryUploads}
                    icon={<Upload className="h-5 w-5" />}
                    color="orange"
                />
            </div>
        </Card>
    );
}
