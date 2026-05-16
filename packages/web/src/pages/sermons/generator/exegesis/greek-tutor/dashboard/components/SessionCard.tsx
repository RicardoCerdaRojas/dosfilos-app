import React, { useState } from 'react';
import { StudySession, TrainingUnit } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { BookOpen, Clock, PlayCircle, Sparkles, TrendingUp, CheckCircle, Timer, Target, AlertTriangle, ArrowRight } from 'lucide-react';
import { es, enUS } from 'date-fns/locale';
import { calculateSessionProgress, getSessionLastActivity } from '../utils/sessionUtils';
import { getSessionState } from '../utils/sessionStateUtils';
import { estimateTimeRemaining } from '../utils/timeEstimationUtils';
import { countDifficultWords } from '../utils/progressUtils';
import { shortRelativeTime } from '../utils/relativeTimeUtils';
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
    const relativeTime = shortRelativeTime(lastActivity, dateLocale);

    const estimatedTime = estimateTimeRemaining(session);
    const quizAccuracy = session.sessionProgress?.quizAccuracy;
    const difficultWordsCount = countDifficultWords(session);

    const greekPreview = session.units.slice(0, 3).map(u => u.greekForm.text).join(' · ');
    const nextUnit = findNextUnit(session.units);

    return (
        <Card className={`p-4 hover:shadow-md transition-shadow ${featured ? 'border-2 border-primary shadow-md' : ''}`}>
            {/* Header: passage + status + menu in one tight row */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-semibold truncate">{session.passage}</h3>
                    </div>
                    {greekPreview && (
                        <p className="mt-1 text-sm font-serif text-primary truncate" title={greekPreview}>
                            {greekPreview}
                            {session.units.length > 3 && (
                                <span className="text-muted-foreground/70 font-sans"> · +{session.units.length - 3}</span>
                            )}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Badge className={`${state.bgColor} ${state.color} border-transparent`}>
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

            {/* Inline metadata strip: time · words · est · accuracy · difficult */}
            <div className="mt-3 flex items-center gap-x-3 gap-y-1 text-xs text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {relativeTime}
                </span>
                <span className="text-muted-foreground/40">·</span>
                <Popover open={showWordList} onOpenChange={setShowWordList}>
                    <PopoverTrigger asChild>
                        <button className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                            <BookOpen className="h-3 w-3" />
                            {totalUnits} {t(`dashboard.sessionCard.palabra`, { count: totalUnits })}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="w-80 p-0">
                        <WordListPreview session={session} />
                    </PopoverContent>
                </Popover>
                {estimatedTime && (
                    <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="inline-flex items-center gap-1 text-primary">
                            <Timer className="h-3 w-3" />
                            {estimatedTime}
                        </span>
                    </>
                )}
                {quizAccuracy !== undefined && quizAccuracy > 0 && (
                    <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="inline-flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {Math.round(quizAccuracy)}% {t('dashboard.sessionCard.precision')}
                        </span>
                    </>
                )}
                {difficultWordsCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        {difficultWordsCount} {t(`dashboard.sessionCard.dificil`, { count: difficultWordsCount })}
                    </span>
                )}
            </div>

            {/* Progress: compact label row + bar + footnote (3 lines → looks like one block) */}
            <div className="mt-3 space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">
                        {completedUnits}/{totalUnits} {t('dashboard.sessionCard.progress').toLowerCase()}
                    </span>
                    <span className="font-medium text-foreground">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-1.5 bg-muted" />
            </div>

            {/* Footer: next-word hint + compact CTA aligned right (no full-width button) */}
            <div className="mt-4 flex items-center justify-between gap-3">
                {nextUnit && session.status === 'ACTIVE' ? (
                    <p className="text-xs text-muted-foreground truncate">
                        {t('dashboard.sessionCard.nextWord')}{' '}
                        <span className="font-serif text-primary">{nextUnit.greekForm.text}</span>
                    </p>
                ) : (
                    <span />
                )}
                <Button
                    onClick={() => onResume(session.id)}
                    size="sm"
                    variant={featured || session.status === 'ACTIVE' ? 'default' : 'outline'}
                    className="shrink-0"
                >
                    {session.status === 'ACTIVE' ? (
                        <>
                            {t('dashboard.sessionCard.continue')}
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </>
                    ) : (
                        <>
                            <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                            {t('dashboard.sessionCard.viewDetails')}
                        </>
                    )}
                </Button>
            </div>
        </Card>
    );
};
