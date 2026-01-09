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

/**
 * Determine the state of a session based on progress and activity
 */
export const getSessionState = (session: StudySession, t: TFunction): SessionStateInfo => {
    const progress = calculateSessionProgress(session);
    const lastActivity = getSessionLastActivity(session);
    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    if (progress === 100) {
        return {
            type: 'complete',
            label: t('dashboard.status.complete'),
            color: 'text-purple-700',
            bgColor: 'bg-purple-100'
        };
    }

    if (daysSinceActivity > 7 && progress > 0) {
        return {
            type: 'paused',
            label: t('dashboard.status.paused'),
            color: 'text-amber-600',
            bgColor: 'bg-amber-50'
        };
    }

    if (progress <= 10 && progress > 0) {
        return {
            type: 'new',
            label: t('dashboard.status.new'),
            color: 'text-blue-700',
            bgColor: 'bg-blue-100'
        };
    }

    return {
        type: 'progress',
        label: t('dashboard.status.progress'),
        color: 'text-green-700',
        bgColor: 'bg-green-100'
    };
};
