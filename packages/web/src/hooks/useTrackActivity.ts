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
            const loginFn = httpsCallable(functions, 'onUserLogin');
            loginFn().catch(err => console.debug('Failed to track login:', err));
        } catch (error) {
            console.debug('Error initializing login tracking:', error);
        }
    }, []);

    return { trackActivity, trackLogin };
}
