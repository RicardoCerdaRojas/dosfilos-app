import { getFunctions, httpsCallable } from 'firebase/functions';
import { useCallback } from 'react';

export function useTrackActivity() {
    const trackActivity = useCallback(async (
        eventType: 'page_view' | 'sermon_created' | 'sermon_edited' | 'feature_used' | 'export' | 'share',
        metadata: Record<string, any> = {}
    ) => {
        try {
            const functions = getFunctions();
            const trackFn = httpsCallable(functions, 'trackUserActivity');

            // Fire and forget - don't block UI
            trackFn({
                eventType,
                metadata,
                sessionId: sessionStorage.getItem('sessionId') || undefined
            }).catch(err => console.debug('Failed to track activity:', err));

        } catch (error) {
            console.debug('Error initializing tracking:', error);
        }
    }, []);

    const trackLogin = useCallback(async () => {
        try {
            const functions = getFunctions();

            // Track login in user_activities collection
            const loginFn = httpsCallable(functions, 'onUserLogin');
            loginFn().catch(err => console.debug('Failed to track login:', err));

            // Track geographic login event
            const geoLoginFn = httpsCallable(functions, 'trackUserLogin');
            geoLoginFn().catch(err => console.debug('Failed to track geo login:', err));
        } catch (error) {
            console.debug('Error initializing login tracking:', error);
        }
    }, []);

    const trackRegistration = useCallback(async (userId: string) => {
        try {
            const functions = getFunctions();

            // Track geographic registration event
            const geoRegFn = httpsCallable(functions, 'trackUserRegistration');
            geoRegFn({ userId }).catch(err => console.debug('Failed to track geo registration:', err));
        } catch (error) {
            console.debug('Error initializing registration tracking:', error);
        }
    }, []);

    const trackLandingVisit = useCallback(async () => {
        try {
            // Check if we've already tracked this session
            const sessionKey = 'landing_visit_tracked';
            if (sessionStorage.getItem(sessionKey)) {
                return; // Already tracked this session
            }

            const functions = getFunctions();

            // Track landing page visit
            const landingFn = httpsCallable(functions, 'trackLandingVisit');
            await landingFn();

            // Mark as tracked for this session
            sessionStorage.setItem(sessionKey, 'true');
        } catch (error) {
            console.debug('Error tracking landing visit:', error);
        }
    }, []);

    return { trackActivity, trackLogin, trackRegistration, trackLandingVisit };
}
