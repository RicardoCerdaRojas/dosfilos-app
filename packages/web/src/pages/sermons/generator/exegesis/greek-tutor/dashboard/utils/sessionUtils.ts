import { StudySession } from '@dosfilos/domain';

/**
 * Calculate progress percentage for a study session
 * Based on completed units vs total units
 */
export const calculateSessionProgress = (session: StudySession): number => {
    const totalUnits = session.units?.length || 0;
    const completedUnits = session.sessionProgress?.unitsCompleted || 0;
    return totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
};

/**
 * Get last activity date for a session
 * Prefers sessionProgress.lastActivityAt, falls back to updatedAt
 */
export const getSessionLastActivity = (session: StudySession): Date => {
    return session.sessionProgress?.lastActivityAt || session.updatedAt;
};
