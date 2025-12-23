import type { StudySession } from '@dosfilos/domain/greek-tutor/entities/entities';

/**
 * Counts difficult words in a session
 * A word is considered difficult if it has:
 * - masteryLevel < 1 (not mastered)
 * - 3+ quiz attempts
 */
export const countDifficultWords = (session: StudySession): number => {
    if (!session.units || session.units.length === 0) return 0;

    return session.units.filter(unit => {
        const progress = unit.progress;
        if (!progress) return false;

        // Check if this word has low mastery despite multiple attempts
        const hasLowMastery = progress.masteryLevel < 1;
        const hasMultipleAttempts = progress.quizAttempts && progress.quizAttempts.length >= 3;

        return hasLowMastery && hasMultipleAttempts;
    }).length;
};

/**
 * Calculates study streak (consecutive days with activity)
 * Returns number of consecutive days
 */
export const calculateStudyStreak = (sessions: StudySession[]): number => {
    if (sessions.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all unique activity dates, sorted descending
    const activityDates = sessions
        .map(s => {
            const lastActivity = s.sessionProgress?.lastActivityAt || s.updatedAt;
            const date = new Date(lastActivity);
            date.setHours(0, 0, 0, 0);
            return date.getTime();
        })
        .filter((date, index, self) => self.indexOf(date) === index) // unique
        .sort((a, b) => b - a); // descending

    if (activityDates.length === 0) return 0;

    // Check if there's activity today or yesterday (streak can start yesterday)
    const oneDayMs = 24 * 60 * 60 * 1000;
    const mostRecentActivity = activityDates[0];
    const daysSinceLastActivity = Math.floor((today.getTime() - mostRecentActivity) / oneDayMs);

    // Streak is broken if last activity was more than 1 day ago
    if (daysSinceLastActivity > 1) return 0;

    // Count consecutive days
    let streak = 0;
    let expectedDate = mostRecentActivity;

    for (const activityDate of activityDates) {
        if (activityDate === expectedDate) {
            streak++;
            expectedDate -= oneDayMs; // Move to previous day
        } else if (activityDate < expectedDate) {
            // Gap found, streak broken
            break;
        }
    }

    return streak;
};
