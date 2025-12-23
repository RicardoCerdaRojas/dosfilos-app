import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook for resuming a study session
 * Navigates to Greek Tutor page with sessionId query param for auto-loading
 */
export const useResumeSession = () => {
    const [isResuming, setIsResuming] = useState(false);
    const navigate = useNavigate();

    /**
     * Resume a session by navigating to Greek Tutor page with sessionId
     * The GreekTutorSessionView will detect the query param and auto-load
     */
    const resumeSession = async (sessionId: string) => {
        setIsResuming(true);

        try {
            // Navigate to session route (immersive, outside DashboardLayout)
            navigate(`/dashboard/greek-tutor/session?sessionId=${sessionId}`, { replace: true });
        } catch (error) {
            console.error('[useResumeSession] Error resuming session:', error);
        } finally {
            setIsResuming(false);
        }
    };

    return {
        resumeSession,
        isResuming
    };
};
