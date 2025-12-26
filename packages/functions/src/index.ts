import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
initializeApp();

// Export library functions
export { extractPdfText } from './library/extractPdfText';
export { extractPdfWithGemini } from './library/extractPdfWithGemini';
export { createGeminiStore } from './library/createGeminiStore';
export { syncResourceToGemini } from './library/syncResourceToGemini';
export { createCoreLibraryStores } from './library/createCoreLibraryStores';
export { createCoreLibraryStore } from './library/createCoreLibraryStore';
export { syncCoreLibraryStore } from './library/syncCoreLibraryStore';

// Export Stripe functions
export { createCheckoutSession } from './stripe/createCheckoutSession';
export { stripeWebhook } from './stripe/webhook';

// Custom portal functions
export { updatePaymentMethod } from './stripe/updatePaymentMethod';
export { changePlan } from './stripe/changePlan';
export { cancelSubscription } from './stripe/cancelSubscription';
export { reactivateSubscription } from './stripe/reactivateSubscription';
export { getInvoices } from './stripe/getInvoices';

// Export Analytics functions
export { trackUserActivity } from './analytics/trackUserActivity';
export { onUserLogin } from './analytics/onUserLogin';
export { aggregateDailyMetrics } from './analytics/aggregateDailyMetrics';

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
export { resendWelcomeEmail } from './admin/resendWelcomeEmail';
