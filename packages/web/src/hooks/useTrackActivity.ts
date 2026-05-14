import { useCallback } from 'react';
import { activityTrackingService, type ActivityEventType } from '@dosfilos/application';

/**
 * Thin React adapter over `activityTrackingService` so consumers can
 * call the tracking methods from components with stable callback
 * identities. Service handles fail-soft semantics — these hooks
 * never throw.
 */
export function useTrackActivity() {
    const trackActivity = useCallback(
        (eventType: ActivityEventType, metadata: Record<string, unknown> = {}) => {
            activityTrackingService.trackActivity(eventType, metadata);
        },
        [],
    );

    const trackLogin = useCallback(() => {
        activityTrackingService.trackLogin();
    }, []);

    const trackRegistration = useCallback((userId: string) => {
        activityTrackingService.trackRegistration(userId);
    }, []);

    const trackLandingVisit = useCallback(async () => {
        await activityTrackingService.trackLandingVisit();
    }, []);

    return { trackActivity, trackLogin, trackRegistration, trackLandingVisit };
}
