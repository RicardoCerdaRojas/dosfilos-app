import { StudySession } from '@dosfilos/domain';
import { calculateSessionProgress } from './sessionUtils';

/**
 * Estimate time remaining for a session based on current progress and study time
 * Returns formatted string like "~15 min" or "~1 hora"
 */
export const estimateTimeRemaining = (session: StudySession): string | null => {
    const progress = calculateSessionProgress(session);

    // No estimation for empty or complete sessions
    if (progress === 0 || progress === 100) return null;

    const totalTime = session.sessionProgress?.totalStudyTimeSeconds || 0;

    // Need at least some study time to estimate
    if (totalTime === 0) return null;

    const timePerPercent = totalTime / progress;
    const remainingPercent = 100 - progress;
    const estimatedSeconds = timePerPercent * remainingPercent;

    return formatDuration(estimatedSeconds);
};

/**
 * Format seconds into human-readable duration
 */
const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);

    if (minutes < 60) {
        return `~${minutes} min`;
    }

    if (hours === 1) {
        return '~1 hora';
    }

    return `~${hours} horas`;
};
