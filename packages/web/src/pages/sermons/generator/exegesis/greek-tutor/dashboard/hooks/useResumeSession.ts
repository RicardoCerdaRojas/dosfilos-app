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
            // Navigate to Greek Tutor page with sessionId as query param
            navigate(`/dashboard/greek-tutor?sessionId=${sessionId}`);
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
