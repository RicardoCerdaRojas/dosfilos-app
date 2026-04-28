import type { UserActivitySummary } from '@dosfilos/domain';
import { UserActivityCard } from '@/components/admin/UserActivityCard';
import { RecentContentList } from '@/components/admin/RecentContentList';
import { useTranslation } from '@/i18n';

interface Props {
    activity: UserActivitySummary;
}

export function OverviewTab({ activity }: Props) {
    const { t } = useTranslation('admin');

    return (
        <div className="space-y-6">
            <UserActivityCard activity={activity} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RecentContentList
                    content={activity.contentCreatedToday}
                    title={t('users.activity.createdToday', { count: activity.contentCreatedToday.length })}
                />
                <RecentContentList
                    content={activity.contentCreatedThisWeek}
                    title={t('users.activity.createdThisWeek', { count: activity.contentCreatedThisWeek.length })}
                />
            </div>
        </div>
    );
}
