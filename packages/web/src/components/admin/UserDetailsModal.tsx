import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    User, 
    Mail, 
    Calendar, 
    CreditCard, 
    Activity,
    BookOpen,
    LogIn,
    Award
} from 'lucide-react';
import { formatDateLong, formatRelativeTime, formatCurrency } from '@/utils/formatters';
import { calculateEngagementScore, getEngagementLevel } from '@/utils/engagementScore';

interface UserDetailsModalProps {
    user: any | null;
    isOpen: boolean;
    onClose: () => void;
    onChangePlan?: (userId: string) => void;
}

/**
 * Helper to safely convert Firestore Timestamp or Date to Date object
 */
function toDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value.toDate && typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'string') return new Date(value);
    return null;
}

export function UserDetailsModal({ user, isOpen, onClose, onChangePlan }: UserDetailsModalProps) {
    if (!user) return null;

    const engagementScore = calculateEngagementScore(user.analytics);
    const engagementLevel = getEngagementLevel(engagementScore);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <User className="h-6 w-6" />
                        User Details
                    </DialogTitle>
                    <DialogDescription>
                        Complete information for {user.displayName || user.email}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Basic Info */}
                    <Card className="p-4">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Basic Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-600">Name</p>
                                <p className="font-medium">{user.displayName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">Email</p>
                                <p className="font-medium flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    {user.email}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">User ID</p>
                                <p className="font-mono text-xs">{user.id}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">Created</p>
                                <p className="font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {toDate(user.createdAt) ? formatDateLong(toDate(user.createdAt)!) : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Subscription Info */}
                    <Card className="p-4">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Subscription
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-600">Plan</p>
                                <Badge 
                                    className="mt-1"
                                    variant={user.subscription?.planId === 'free' ? 'secondary' : 'default'}
                                >
                                    {user.subscription?.planId || 'free'}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">Status</p>
                                <Badge 
                                    className="mt-1"
                                    variant={user.subscription?.status === 'active' ? 'default' : 'secondary'}
                                >
                                    {user.subscription?.status || 'none'}
                                </Badge>
                            </div>
                            {user.subscription?.startDate && (
                                <div>
                                    <p className="text-sm text-slate-600">Start Date</p>
                                    <p className="font-medium">
                                        {formatDateLong(toDate(user.subscription.startDate)!)}
                                    </p>
                                </div>
                            )}
                            {user.subscription?.currentPeriodEnd && (
                                <div>
                                    <p className="text-sm text-slate-600">Next Billing</p>
                                    <p className="font-medium">
                                        {formatDateLong(toDate(user.subscription.currentPeriodEnd)!)}
                                    </p>
                                </div>
                            )}
                            {user.stripeCustomerId && (
                                <div className="col-span-2">
                                    <p className="text-sm text-slate-600">Stripe Customer ID</p>
                                    <p className="font-mono text-xs">{user.stripeCustomerId}</p>
                                </div>
                            )}
                        </div>
                        
                        {onChangePlan && user.subscription?.planId !== 'team' && (
                            <Button 
                                className="mt-4 w-full"
                                variant="outline"
                                onClick={() => onChangePlan(user.id)}
                            >
                                Change Plan
                            </Button>
                        )}
                    </Card>

                    {/* Analytics & Engagement */}
                    <Card className="p-4">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Activity & Engagement
                        </h3>
                        
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600">Engagement Score</span>
                                <Badge 
                                    variant={
                                        engagementLevel === 'high' ? 'default' : 
                                        engagementLevel === 'medium' ? 'secondary' : 
                                        'outline'
                                    }
                                >
                                    {engagementScore} / 100 - {engagementLevel}
                                </Badge>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                                <div 
                                    className={`h-2 rounded-full ${
                                        engagementLevel === 'high' ? 'bg-green-500' :
                                        engagementLevel === 'medium' ? 'bg-yellow-500' :
                                        'bg-orange-500'
                                    }`}
                                    style={{ width: `${engagementScore}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-600 flex items-center gap-2">
                                    <LogIn className="h-4 w-4" />
                                    Total Logins
                                </p>
                                <p className="text-2xl font-bold">
                                    {user.analytics?.loginCount || 0}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    Sermons Created
                                </p>
                                <p className="text-2xl font-bold">
                                    {user.analytics?.sermonsCreated || 0}
                                </p>
                            </div>
                            {user.analytics?.lastLoginAt && (
                                <div>
                                    <p className="text-sm text-slate-600">Last Login</p>
                                    <p className="font-medium">
                                        {formatRelativeTime(toDate(user.analytics.lastLoginAt)!)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {formatDateLong(toDate(user.analytics.lastLoginAt)!)}
                                    </p>
                                </div>
                            )}
                            {user.analytics?.lastActivityAt && (
                                <div>
                                    <p className="text-sm text-slate-600">Last Activity</p>
                                    <p className="font-medium">
                                        {formatRelativeTime(toDate(user.analytics.lastActivityAt)!)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Revenue Info (for paid users) */}
                    {user.analytics?.totalRevenue && user.analytics.totalRevenue > 0 && (
                        <Card className="p-4">
                            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                <Award className="h-5 w-5" />
                                Revenue
                            </h3>
                            <div>
                                <p className="text-sm text-slate-600">Total Revenue</p>
                                <p className="text-3xl font-bold text-green-600">
                                    {formatCurrency(user.analytics.totalRevenue)}
                                </p>
                            </div>
                        </Card>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
