import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
initializeApp();

// Export library functions
export { extractPdfWithGemini } from './library/extractPdfWithGemini';
export { reprocessWithLlamaParse } from './library/reprocessWithLlamaParse';
export { processWithGemini } from './library/processWithGemini';
export { resetLlamaParseCounters } from './library/resetLlamaParseCounters';
export { alertLlamaParseUsage } from './library/alertLlamaParseUsage';
export { indexStructuredDocument } from './library/indexStructuredDocument';
export { autoIndexOnExtractionReady } from './library/autoIndexOnExtractionReady';
export { incrementUsage } from './usage/incrementUsage';
export { retrieveChunks } from './library/retrieveChunks';
export { auditIndexing } from './library/auditIndexing';
export { createCoreLibraryStore } from './library/createCoreLibraryStore';
export { updateCoreLibraryStore } from './library/updateCoreLibraryStore';
export { deleteCoreLibraryStore } from './library/deleteCoreLibraryStore';
export { removeFileFromStore } from './library/removeFileFromStore';

// Export Stripe functions
export { createCheckoutSession } from './stripe/createCheckoutSession';
export { stripeWebhook } from './stripe/webhook';

// Export Auth functions
export { completeRegistration } from './auth/completeRegistration';
// NOTE: sendVerificationEmail (custom branded verification email via Resend)
// is intentionally NOT exported — every deploy attempt failed with Cloud Run
// container health-check errors that didn't surface a specific cause in the
// build logs. We're using Firebase Auth's native `sendEmailVerification` for
// the launch (template can be customized in Firebase Console). The function
// file is kept at packages/functions/src/auth/sendVerificationEmail.ts for
// post-launch revival once we can debug the Cloud Run logs properly.

// Custom portal functions
export { updatePaymentMethod } from './stripe/updatePaymentMethod';
export { changePlan } from './stripe/changePlan';
export { cancelSubscription } from './stripe/cancelSubscription';
export { reactivateSubscription } from './stripe/reactivateSubscription';
export { getInvoices } from './stripe/getInvoices';

// Subscription management functions
export { extendTrial } from './subscription/extendTrial';
export { submitCancellationFeedback } from './subscription/submitCancellationFeedback';

// Export Analytics functions
export { trackUserActivity } from './analytics/trackUserActivity';
export { onUserLogin } from './analytics/onUserLogin';
export { aggregateDailyMetrics } from './analytics/aggregateDailyMetrics';
export { recalculateAnalytics, recalculateAnalyticsHttp, recalculateAnalyticsCallable } from './analytics/recalculateAnalytics';


// Export Event-Driven Analytics functions
export {
    onSermonCreated,
    onSermonPublished,
    onSermonDeleted,
} from './analytics/sermonAnalytics';

export {
    onGreekSessionCreated,
    onGreekSessionCompleted,
    onGreekSessionDeleted,
} from './analytics/greekSessionAnalytics';

export {
    onUserCreated,
    onUserActivity,
    onUserDeleted,
    onSubscriptionChanged,
} from './analytics/userAnalytics';

// Export Email functions
export { sendWelcomeEmail } from './emails/sendWelcomeEmail';
export { sendNurtureEmails } from './emails/sendNurtureEmails';

// Export Geographic Analytics functions
export { trackUserRegistration, trackUserLogin, trackLandingVisit } from './analytics/geoCallableFunctions';

// Export Admin functions
export { deleteUser } from './admin/deleteUser';
export { disableUser } from './admin/disableUser';
export { enableUser } from './admin/enableUser';
export { resendWelcomeEmail } from './admin/resendWelcomeEmail';
export { migratePlanQuotas } from './admin/migratePlanQuotas';
export { migrateLegacySermons } from './admin/migrateLegacySermons';
export { changePlanForUser } from './admin/changePlanForUser';
export { bulkUserAction } from './admin/bulkUserAction';
export { grantUserCredits } from './admin/grantUserCredits';
export { extendUserTrialAdmin } from './admin/extendUserTrialAdmin';



