import React, { useState } from 'react';
import { StudySession } from '@dosfilos/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { BookOpen, Clock, PlayCircle, Sparkles, TrendingUp, CheckCircle, Timer, Target, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { calculateSessionProgress, getSessionLastActivity } from '../utils/sessionUtils';
import { getSessionState } from '../utils/sessionStateUtils';
import { estimateTimeRemaining } from '../utils/timeEstimationUtils';
import { countDifficultWords } from '../utils/progressUtils';
import { SessionCardMenu } from './SessionCardMenu';
import { WordListPreview } from './WordListPreview';
import { useTranslation } from '@/i18n';

interface SessionCardProps {
    session: StudySession;
    onResume: (sessionId: string) => void;
    onDelete?: (sessionId: string) => void;
    onDuplicate?: (session: StudySession) => void;
    featured?: boolean; // For highlighting "continue where you left off"
}

/**
 * Enhanced with descriptive states, rich metadata, word list preview, and menu actions
 */
export const SessionCard: React.FC<SessionCardProps> = ({
    session,
    onResume,
    onDelete,
    onDuplicate,
    featured = false
}) => {
    const [showWordList, setShowWordList] = useState(false);
    const { t, i18n } = useTranslation('greekTutor');
    
    // Get date-fns locale based on current language
    const dateLocale = i18n.language.startsWith('en') ? enUS : es;

    // Calculate progress using utility
    const progressPercentage = calculateSessionProgress(session);
    const totalUnits = session.units.length;
    const completedUnits = session.sessionProgress?.unitsCompleted || 0;

    // Get session state
    const state = getSessionState(session, t);

    // Get state icon
    const StateIcon = {
        new: Sparkles,
        progress: TrendingUp,
        complete: CheckCircle,
        paused: Clock
    }[state.type];

    // Time information
    const lastActivity = getSessionLastActivity(session);
    const relativeTime = formatDistanceToNow(lastActivity, { 
        addSuffix: true, 
        locale: dateLocale
    });

    const estimatedTime = estimateTimeRemaining(session);

    // Quiz accuracy if available
    const quizAccuracy = session.sessionProgress?.quizAccuracy;

    // Count difficult words
    const difficultWordsCount = countDifficultWords(session);

    return (
        <Card className={`hover:shadow-lg transition-shadow ${featured ? 'border-2 border-primary shadow-md' : ''}`}>
            <CardHeader>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            {session.passage}
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {relativeTime}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className={`${state.bgColor} ${state.color} border-0`}>
                            <StateIcon className="h-3 w-3 mr-1" />
                            {state.label}
                        </Badge>
                        {(onDuplicate || onDelete) && (
                            <SessionCardMenu
                                session={session}
                                onDuplicate={onDuplicate}
                                onDelete={onDelete}
                            />
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Stats Row */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <Popover open={showWordList} onOpenChange={setShowWordList}>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                                <BookOpen className="h-4 w-4" />
                                <span>{totalUnits} {t(`dashboard.sessionCard.palabra`, { count: totalUnits })}</span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="w-80 p-0">
                            <WordListPreview session={session} />
                        </PopoverContent>
                    </Popover>
                    
                    {estimatedTime && (
                        <div className="flex items-center gap-1.5 text-primary">
                            <Timer className="h-4 w-4" />
                            <span>{estimatedTime}</span>
                        </div>
                    )}

                    {quizAccuracy !== undefined && quizAccuracy > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Target className="h-4 w-4" />
                            <span>{Math.round(quizAccuracy)}% {t('dashboard.sessionCard.precision')}</span>
                        </div>
                    )}

                    {difficultWordsCount > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {difficultWordsCount} {t(`dashboard.sessionCard.dificil`, { count: difficultWordsCount })}
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('dashboard.sessionCard.progress')}</span>
                        <span className="font-medium">{progressPercentage}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                        {t('dashboard.sessionCard.wordsLearned', { completed: completedUnits, total: totalUnits })}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                    <Button
                        onClick={() => onResume(session.id)}
                        className="flex-1"
                        variant={featured || session.status === 'ACTIVE' ? 'default' : 'outline'}
                    >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {session.status === 'ACTIVE' ? t('dashboard.sessionCard.continue') : t('dashboard.sessionCard.viewDetails')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
