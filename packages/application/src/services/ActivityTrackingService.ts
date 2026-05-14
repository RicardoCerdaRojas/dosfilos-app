import { getFunctions, httpsCallable } from 'firebase/functions';

export type ActivityEventType =
    | 'page_view'
    | 'sermon_created'
    | 'sermon_edited'
    | 'feature_used'
    | 'export'
    | 'share';

/**
 * Server-side activity tracking — distinct from the client-side
 * funnel/analytics layer (`track()` in `@/lib/analytics`). These
 * callables write to `user_activities/` and the geographic event
 * collections so the admin dashboard, geo dashboard, and DAU/MAU
 * counters all have data.
 *
 * Fail-soft by design: counter drift or a missed login event is
 * preferable to a UX hiccup, so every method swallows errors with
 * a `console.debug` and never throws. UI never has to wrap calls
 * in their own try/catch.
 */
export class ActivityTrackingService {
    trackActivity(
        eventType: ActivityEventType,
        metadata: Record<string, unknown> = {},
    ): void {
        try {
            const fn = httpsCallable(getFunctions(), 'trackUserActivity');
            const sessionId = readSessionStorage('sessionId') ?? undefined;
            fn({ eventType, metadata, sessionId }).catch(err =>
                console.debug('Failed to track activity:', err),
            );
        } catch (err) {
            console.debug('Error initializing tracking:', err);
        }
    }

    trackLogin(): void {
        try {
            const fns = getFunctions();
            httpsCallable(fns, 'onUserLogin')().catch(err =>
                console.debug('Failed to track login:', err),
            );
            httpsCallable(fns, 'trackUserLogin')().catch(err =>
                console.debug('Failed to track geo login:', err),
            );
        } catch (err) {
            console.debug('Error initializing login tracking:', err);
        }
    }

    trackRegistration(userId: string): void {
        try {
            const fn = httpsCallable(getFunctions(), 'trackUserRegistration');
            fn({ userId }).catch(err =>
                console.debug('Failed to track geo registration:', err),
            );
        } catch (err) {
            console.debug('Error initializing registration tracking:', err);
        }
    }

    /**
     * Idempotent per browser session via a sessionStorage flag so
     * the landing-page route doesn't re-fire on every internal nav.
     */
    async trackLandingVisit(): Promise<void> {
        try {
            const flagKey = 'landing_visit_tracked';
            if (readSessionStorage(flagKey)) return;
            const fn = httpsCallable(getFunctions(), 'trackLandingVisit');
            await fn();
            writeSessionStorage(flagKey, 'true');
        } catch (err) {
            console.debug('Error tracking landing visit:', err);
        }
    }
}

export const activityTrackingService = new ActivityTrackingService();

function readSessionStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeSessionStorage(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(key, value);
    } catch {
        // sessionStorage can be blocked by privacy modes — silent ignore.
    }
}
