import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useUserProfile } from '@/hooks/admin/useUserProfile';
import { useUserActivitySummary } from '@/hooks/admin/useUserActivitySummary';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlanBadge } from '@/components/admin/PlanBadge';
import { EngagementBadge } from '@/components/admin/EngagementBadge';
import {
    ArrowLeft, Loader2, User as UserIcon, Mail, Calendar,
    LayoutDashboard, Clock, Gauge, CreditCard, ScrollText, Flag,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale, enUS as enLocale } from 'date-fns/locale';
import { OverviewTab } from './tabs/OverviewTab';
import { TimelineTab } from './tabs/TimelineTab';
import { UsageTab } from './tabs/UsageTab';
import { SubscriptionTab } from './tabs/SubscriptionTab';
import { AuditTab } from './tabs/AuditTab';
import { FeatureFlagsTab } from './tabs/FeatureFlagsTab';

const VALID_TABS = ['overview', 'timeline', 'usage', 'subscription', 'audit', 'flags'] as const;
type TabKey = typeof VALID_TABS[number];

export function UserDetailPage() {
    const { uid } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('admin');
    const { isAdmin, loading: authLoading } = useAdminAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const dateLocale = i18n.language.startsWith('es') ? esLocale : enLocale;

    const { user, loading: userLoading } = useUserProfile(uid);
    const { activity, loading: activityLoading } = useUserActivitySummary(uid ?? null);

    const tabRaw = (searchParams.get('tab') as TabKey | null) ?? 'overview';
    const tab: TabKey = (VALID_TABS as readonly string[]).includes(tabRaw) ? tabRaw : 'overview';

    const setTab = (next: string) => {
        const sp = new URLSearchParams(searchParams);
        sp.set('tab', next);
        setSearchParams(sp, { replace: true });
    };

    if (authLoading || !isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (userLoading || !uid) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-6 max-w-3xl mx-auto">
                <Button variant="outline" onClick={() => navigate('/dashboard/admin/users')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('users.detail.backToList')}
                </Button>
                <Card className="p-12 text-center mt-6">
                    <UserIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">{t('users.detail.notFound')}</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[95%] mx-auto">
            {/* Header — back button + avatar + identity + KPI badges */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="outline" onClick={() => navigate('/dashboard/admin/users')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('users.detail.backToList')}
                </Button>
            </div>

            <Card className="p-5 mb-6">
                <div className="flex items-start gap-4 flex-wrap">
                    {user.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName || user.email}
                            className="h-16 w-16 rounded-full"
                        />
                    ) : (
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="h-8 w-8 text-primary" />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-foreground truncate">
                            {user.displayName || t('users.detail.noName')}
                        </h1>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <PlanBadge planId={user.subscription?.planId ?? 'free'} />
                            {activity && <EngagementBadge score={activity.engagementScore} showScore />}
                            {user.status === 'disabled' && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
                                    {t('users.detail.disabled')}
                                </span>
                            )}
                        </div>
                    </div>

                    {activity && (
                        <div className="text-right text-sm text-muted-foreground">
                            <div className="flex items-center gap-1 justify-end">
                                <Calendar className="h-4 w-4" />
                                {t('users.activity.lastLoginRelative', {
                                    when: formatDistanceToNow(new Date(activity.lastLoginAt), {
                                        addSuffix: true,
                                        locale: dateLocale,
                                    }),
                                })}
                            </div>
                            <p className="mt-1 tabular-nums">
                                {t('users.activity.totalLogins', { count: activity.loginCount })}
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Tabs — URL-synced for deep-linkable views */}
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="mb-4 h-auto p-1">
                    <TabsTrigger value="overview" className="gap-1.5">
                        <LayoutDashboard className="h-4 w-4" />
                        {t('users.detail.tabs.overview')}
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="gap-1.5">
                        <Clock className="h-4 w-4" />
                        {t('users.detail.tabs.timeline')}
                    </TabsTrigger>
                    <TabsTrigger value="usage" className="gap-1.5">
                        <Gauge className="h-4 w-4" />
                        {t('users.detail.tabs.usage')}
                    </TabsTrigger>
                    <TabsTrigger value="subscription" className="gap-1.5">
                        <CreditCard className="h-4 w-4" />
                        {t('users.detail.tabs.subscription')}
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="gap-1.5">
                        <ScrollText className="h-4 w-4" />
                        {t('users.detail.tabs.audit')}
                    </TabsTrigger>
                    <TabsTrigger value="flags" className="gap-1.5">
                        <Flag className="h-4 w-4" />
                        {t('users.detail.tabs.flags')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    {activityLoading || !activity ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <OverviewTab activity={activity} />
                    )}
                </TabsContent>

                <TabsContent value="timeline">
                    <TimelineTab userId={user.id} />
                </TabsContent>

                <TabsContent value="usage">
                    <UsageTab user={user} />
                </TabsContent>

                <TabsContent value="subscription">
                    <SubscriptionTab user={user} />
                </TabsContent>

                <TabsContent value="audit">
                    <AuditTab userId={user.id} />
                </TabsContent>

                <TabsContent value="flags">
                    <FeatureFlagsTab user={user} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
