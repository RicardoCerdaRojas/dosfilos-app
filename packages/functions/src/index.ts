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
