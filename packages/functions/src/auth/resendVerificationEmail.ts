import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { sendOnboardingEmail } from '../emails/sendWelcomeEmail';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Resends the branded verification email to the calling user.
 *
 * Used by the `/auth/verify-email` page when the original email got lost.
 * We deliberately route through Resend (not Firebase's native
 * `sendEmailVerification`) because the native flow has been failing
 * silently in our project — see the launch readiness notes.
 *
 * Refuses to do anything once the email is already verified: the UI button
 * should be hidden in that case, but a defensive check keeps us from
 * spamming verified users if state gets stale on the client.
 */
export const resendVerificationEmail = onCall(appCheckCallableOptions(), async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Sign in required');
    }

    const user = await getAuth().getUser(request.auth.uid);

    if (user.emailVerified) {
        throw new HttpsError('failed-precondition', 'Email already verified');
    }

    try {
        await sendOnboardingEmail(user);
        return { ok: true };
    } catch (err) {
        console.error('[resendVerificationEmail] Failed:', err);
        throw new HttpsError('internal', 'Could not resend verification email');
    }
});
