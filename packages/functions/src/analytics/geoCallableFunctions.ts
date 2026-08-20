// firebase-functions v6+ cambió el entrypoint por defecto de v1 a v2. Estas
// funciones siguen en v1 (runWith / firestore.document / https.onCall v1), así
// que el import apunta explícitamente a /v1 para conservar el MISMO
// comportamiento. Migrarlas a v2 es trabajo aparte, no de este upgrade.
import * as functions from 'firebase-functions/v1';
import { trackGeoEvent } from './geoTracking';
import { appCheckV1Options } from '../config/appCheckOptions';

// const db = admin.firestore(); // Not needed for callable functions

/**
 * Callable function to track user registration with geographic data
 * Called from frontend after successful user creation
 */
export const trackUserRegistration = functions.runWith(appCheckV1Options()).https.onCall(async (data, context) => {
    try {
        const userId = data.userId || context.auth?.uid;

        if (!userId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        // Get IP from request context
        const ip = context.rawRequest.ip || '127.0.0.1';
        const userAgent = context.rawRequest.headers['user-agent'] || 'Unknown';

        // Track geographic event
        await trackGeoEvent({
            type: 'registration',
            userId,
            ip,
            userAgent,
        });

        return { success: true };
    } catch (error) {
        console.error('[trackUserRegistration] Error:', error);
        // Don't throw - allow registration to continue even if geo tracking fails
        return { success: false, error: String(error) };
    }
});

/**
 * Callable function to track user login with geographic data
 * Called from frontend after successful login
 */
export const trackUserLogin = functions.runWith(appCheckV1Options()).https.onCall(async (_data, context) => {
    try {
        const userId = context.auth?.uid;

        if (!userId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        // Get IP from request context
        const ip = context.rawRequest.ip || '127.0.0.1';
        const userAgent = context.rawRequest.headers['user-agent'] || 'Unknown';

        // Track geographic event
        await trackGeoEvent({
            type: 'login',
            userId,
            ip,
            userAgent,
        });

        return { success: true };
    } catch (error) {
        console.error('[trackUserLogin] Error:', error);
        // Don't throw - allow login to continue even if geo tracking fails
        return { success: false, error: String(error) };
    }
});

/**
 * Callable function to track landing page visit (anonymous)
 * Called from frontend when user visits landing page
 */
export const trackLandingVisit = functions.runWith(appCheckV1Options()).https.onCall(async (_data, context) => {
    try {
        // Get IP from request context
        const ip = context.rawRequest.ip || '127.0.0.1';
        const userAgent = context.rawRequest.headers['user-agent'] || 'Unknown';

        // Track geographic event (no userId for anonymous visits)
        await trackGeoEvent({
            type: 'landing_visit',
            userId: undefined,
            ip,
            userAgent,
        });

        return { success: true };
    } catch (error) {
        console.error('[trackLandingVisit] Error:', error);
        // Don't throw - allow page load to continue even if geo tracking fails
        return { success: false, error: String(error) };
    }
});
