import React from 'react';
import { StudySession } from '@dosfilos/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SessionStatusBadge } from './SessionStatusBadge';
import { BookOpen, Clock, PlayCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SessionCardProps {
    session: StudySession;
    onResume: (sessionId: string) => void;
    onDelete?: (sessionId: string) => void;
}

/**
 * Card component displaying session summary with resume/delete actions
 */
export const SessionCard: React.FC<SessionCardProps> = ({
    session,
    onResume,
    onDelete
}) => {
    // Calculate progress
    const totalUnits = session.units.length;
    const completedUnits = session.units.filter(u => 
        u.progress && u.progress.masteryLevel >= 2
    ).length;
    const progressPercentage = totalUnits > 0 ? (completedUnits / totalUnits) * 100 : 0;

    // Calculate total study time
    const totalSeconds = session.sessionProgress?.totalStudyTimeSeconds || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const timeDisplay = hours > 0 
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;

    // Format date
    const dateDisplay = format(new Date(session.updatedAt), "d 'de' MMMM, yyyy", { locale: es });

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            {session.passage}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {dateDisplay}
                        </CardDescription>
                    </div>
                    <SessionStatusBadge status={session.status} />
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4" />
                        <span>{totalUnits} {totalUnits === 1 ? 'palabra' : 'palabras'}</span>
                    </div>
                    {totalSeconds > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span>{timeDisplay}</span>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium">{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                        {completedUnits} de {totalUnits} palabras aprendidas
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                    <Button
                        onClick={() => onResume(session.id)}
                        className="flex-1"
                        variant={session.status === 'ACTIVE' ? 'default' : 'outline'}
                    >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {session.status === 'ACTIVE' ? 'Continuar' : 'Ver Detalles'}
                    </Button>
                    
                    {onDelete && (
                        <Button
                            onClick={() => onDelete(session.id)}
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
