import React, { useState } from 'react';
import { StudySession, TrainingUnit } from '@dosfilos/domain';
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
    featured?: boolean;
}

const STATE_ICON = {
    new: Sparkles,
    progress: TrendingUp,
    complete: CheckCircle,
    paused: Clock,
} as const;

/**
 * Find the first unit the user hasn't mastered yet so the card can surface
 * "Continúa con: {greekWord}" rather than a generic CTA.
 */
const findNextUnit = (units: TrainingUnit[]): TrainingUnit | undefined =>
    units.find(u => (u.progress?.masteryLevel ?? 0) < 2);

export const SessionCard: React.FC<SessionCardProps> = ({
    session,
    onResume,
    onDelete,
    onDuplicate,
    featured = false,
}) => {
    const [showWordList, setShowWordList] = useState(false);
    const { t, i18n } = useTranslation('greekTutor');
    const dateLocale = i18n.language.startsWith('en') ? enUS : es;

    const progressPercentage = calculateSessionProgress(session);
    const totalUnits = session.units.length;
    const completedUnits = session.sessionProgress?.unitsCompleted || 0;

    const state = getSessionState(session, t);
    const StateIcon = STATE_ICON[state.type];

    const lastActivity = getSessionLastActivity(session);
    const relativeTime = formatDistanceToNow(lastActivity, { addSuffix: true, locale: dateLocale });

    const estimatedTime = estimateTimeRemaining(session);
    const quizAccuracy = session.sessionProgress?.quizAccuracy;
    const difficultWordsCount = countDifficultWords(session);

    // Greek snippet: first 3 unit lemmas/forms shown under the passage title for instant context.
    const greekPreview = session.units.slice(0, 3).map(u => u.greekForm.text).join(' · ');
    const nextUnit = findNextUnit(session.units);

    return (
        <Card className={`hover:shadow-lg transition-shadow ${featured ? 'border-2 border-primary shadow-md' : ''}`}>
            <CardHeader>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary shrink-0" />
                            <span className="truncate">{session.passage}</span>
                        </CardTitle>
                        {greekPreview && (
                            <p className="mt-1.5 text-sm font-serif text-primary/85 truncate" title={greekPreview}>
                                {greekPreview}
                                {session.units.length > 3 && (
                                    <span className="text-muted-foreground/70"> · +{session.units.length - 3}</span>
                                )}
                            </p>
                        )}
                        <CardDescription className="mt-1 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {relativeTime}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${state.color} border-current/40`}>
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
                        <Badge variant="outline" className="text-xs flex items-center gap-1 border-destructive/40 text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            {difficultWordsCount} {t(`dashboard.sessionCard.dificil`, { count: difficultWordsCount })}
                        </Badge>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('dashboard.sessionCard.progress')}</span>
                        <span className="font-medium">{progressPercentage}%</span>
                    </div>
                    {/* `bg-muted` overrides the default `bg-secondary` (amber) track so empty bars
                        don't read as a yellow warning. The indicator stays primary. */}
                    <Progress value={progressPercentage} className="h-2 bg-muted" />
                    <p className="text-xs text-muted-foreground">
                        {t('dashboard.sessionCard.wordsLearned', { completed: completedUnits, total: totalUnits })}
                    </p>
                </div>

                {nextUnit && session.status === 'ACTIVE' && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="text-muted-foreground/70">{t('dashboard.sessionCard.nextWord')}:</span>
                        <span className="font-serif text-primary/90">{nextUnit.greekForm.text}</span>
                    </p>
                )}

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
