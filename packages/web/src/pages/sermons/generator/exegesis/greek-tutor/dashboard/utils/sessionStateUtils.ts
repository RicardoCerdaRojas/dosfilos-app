import { StudySession } from '@dosfilos/domain';
import { calculateSessionProgress, getSessionLastActivity } from './sessionUtils';
import { TFunction } from 'i18next';

export type SessionState = 'new' | 'progress' | 'complete' | 'paused';

export interface SessionStateInfo {
    type: SessionState;
    label: string;
    color: string;
    bgColor: string;
}

export const getSessionState = (session: StudySession, t: TFunction): SessionStateInfo => {
    const progress = calculateSessionProgress(session);
    const lastActivity = getSessionLastActivity(session);
    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    if (progress === 100) {
        return {
            type: 'complete',
            label: t('dashboard.status.complete'),
            color: 'text-success-subtle-foreground',
            bgColor: 'bg-success-subtle',
        };
    }

    if (daysSinceActivity > 7 && progress > 0) {
        return {
            type: 'paused',
            label: t('dashboard.status.paused'),
            color: 'text-warning-subtle-foreground',
            bgColor: 'bg-warning-subtle',
        };
    }

    if (progress <= 10 && progress > 0) {
        return {
            type: 'new',
            label: t('dashboard.status.new'),
            color: 'text-info-subtle-foreground',
            bgColor: 'bg-info-subtle',
        };
    }

    return {
        type: 'progress',
        label: t('dashboard.status.progress'),
        color: 'text-primary',
        bgColor: 'bg-primary/10',
    };
};
