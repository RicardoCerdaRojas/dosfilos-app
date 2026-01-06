import { useState } from 'react';
import { UserActivitySummary } from '@dosfilos/domain';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserActivityCard } from './UserActivityCard';
import { RecentContentList } from './RecentContentList';
import { EngagementBadge } from './EngagementBadge';
import { PlanBadge } from './PlanBadge';
import { Loader2, User, Mail, Calendar } from 'lucide-react';
import { useUserActivitySummary } from '@/hooks/admin/useUserActivitySummary';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
    userId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function UserActivityModal({ userId, isOpen, onClose }: Props) {
    const { activity, loading, error } = useUserActivitySummary(userId);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                className="max-w-7xl max-h-[90vh] overflow-y-auto"
                style={{ width: '90vw', maxWidth: '1400px' }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <User className="h-5 w-5 text-slate-600" />
                        Actividad del Usuario
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="ml-3 text-slate-600">Cargando actividad...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-red-600">Error: {error}</p>
                    </div>
                ) : !activity ? (
                    <div className="text-center py-12">
                        <p className="text-slate-600">No se encontró información del usuario</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* User Info Header */}
                        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                            {activity.userPhotoURL ? (
                                <img
                                    src={activity.userPhotoURL}
                                    alt={activity.userDisplayName || activity.userEmail}
                                    className="h-16 w-16 rounded-full"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                                    <User className="h-8 w-8 text-blue-600" />
                                </div>
                            )}
                            
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-slate-900">
                                    {activity.userDisplayName || 'Sin nombre'}
                                </h3>
                                <div className="flex items-center gap-1 text-sm text-slate-600 mt-1">
                                    <Mail className="h-4 w-4" />
                                    {activity.userEmail}
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <PlanBadge planId={activity.planId} />
                                    <EngagementBadge score={activity.engagementScore} showScore={true} />
                                </div>
                            </div>

                            <div className="text-right text-sm text-slate-600">
                                <div className="flex items-center gap-1 justify-end">
                                    <Calendar className="h-4 w-4" />
                                    Último login: {formatDistanceToNow(new Date(activity.lastLoginAt), {
                                        addSuffix: true,
                                        locale: es
                                    })}
                                </div>
                                <p className="mt-1">
                                    {activity.loginCount} logins totales
                                </p>
                            </div>
                        </div>

                        {/* Activity Metrics */}
                        <UserActivityCard activity={activity} />

                        {/* Recent Content */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <RecentContentList
                                content={activity.contentCreatedToday}
                                title={`Creado Hoy (${activity.contentCreatedToday.length})`}
                            />
                            <RecentContentList
                                content={activity.contentCreatedThisWeek}
                                title={`Esta Semana (${activity.contentCreatedThisWeek.length})`}
                            />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
