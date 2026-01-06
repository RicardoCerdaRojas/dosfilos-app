import { StudySession } from '@dosfilos/domain';
import { calculateSessionProgress, getSessionLastActivity } from './sessionUtils';
import i18n from '@/i18n/config/i18n';

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
export const getSessionState = (session: StudySession): SessionStateInfo => {
    const progress = calculateSessionProgress(session);
    const lastActivity = getSessionLastActivity(session);
    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    if (progress === 100) {
        return {
            type: 'complete',
            label: i18n.t('dashboard.status.complete', { ns: 'greekTutor' }),
            color: 'text-purple-700',
            bgColor: 'bg-purple-100'
        };
    }

    if (daysSinceActivity > 7 && progress > 0) {
        return {
            type: 'paused',
            label: i18n.t('dashboard.status.paused', { ns: 'greekTutor' }),
            color: 'text-amber-600',
            bgColor: 'bg-amber-50'
        };
    }

    if (progress <= 10 && progress > 0) {
        return {
            type: 'new',
            label: i18n.t('dashboard.status.new', { ns: 'greekTutor' }),
            color: 'text-blue-700',
            bgColor: 'bg-blue-100'
        };
    }

    return {
        type: 'progress',
        label: i18n.t('dashboard.status.progress', { ns: 'greekTutor' }),
        color: 'text-green-700',
        bgColor: 'bg-green-100'
    };
};
