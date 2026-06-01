import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
initializeApp();

// Export library functions
export { extractPdfWithGemini } from './library/extractPdfWithGemini';
export { reprocessWithLlamaParse } from './library/reprocessWithLlamaParse';
export { cancelExtraction } from './library/cancelExtraction';
export { processWithGemini } from './library/processWithGemini';
export { resetLlamaParseCounters } from './library/resetLlamaParseCounters';
export { alertLlamaParseUsage } from './library/alertLlamaParseUsage';
export { indexStructuredDocument } from './library/indexStructuredDocument';
export { autoIndexOnExtractionReady } from './library/autoIndexOnExtractionReady';
export { incrementUsage } from './usage/incrementUsage';
export { getGreekDashboardSessions } from './greek-tutor/getGreekDashboardSessions';
export { getFacultyDashboardSessions } from './faculty/getFacultyDashboardSessions';
export { getExegesisPapersSummary } from './exegesis/getExegesisPapersSummary';
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
export { resendVerificationEmail } from './auth/resendVerificationEmail';
// NOTE: the legacy `sendVerificationEmail` (separate transactional verification
// email) is kept at packages/functions/src/auth/sendVerificationEmail.ts but
// not exported. The verification link now travels inside the branded welcome
// email (see emails/sendWelcomeEmail.ts), and `resendVerificationEmail` reuses
// the same template — so a second function is no longer needed.

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
export { trackFunnelEvent } from './analytics/trackFunnelEvent';

// Lead-magnet capture (Fase B funnel)
export { captureLead } from './leads/captureLead';
export { resendLeadMagnet } from './leads/resendLeadMagnet';
// Daily nurture sequence for magnet downloaders pre-signup (Fase 2.3).
export { sendLeadMagnetNurture } from './leads/sendLeadMagnetNurture';
// Super-admin callable to render any nurture template with sample inputs.
export { previewLeadMagnetNurture } from './leads/previewLeadMagnetNurture';
// Super-admin callable to render the ShareEmail (extraction share) template.
export { previewExtractionShareEmail } from './leads/previewExtractionShareEmail';
// Super-admin callable to render the welcome email (free + paid flows).
export { previewWelcomeEmail } from './auth/previewWelcomeEmail';
// Pastor-initiated email send for any persisted extraction (Fase 3.3).
export { sendExtractionByEmail } from './leads/sendExtractionByEmail';
// WordPress draft publish for any persisted extraction (Fase 3.3.b).
export { publishExtractionToWordpress } from './leads/publishExtractionToWordpress';
// Diagnostic: probes the user's WP integration and returns roles/caps.
export { testWordpressConnection } from './leads/testWordpressConnection';
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
export { backfillPlanQuotas } from './admin/backfillPlanQuotas';
export { backfillExegesisQuotas } from './admin/backfillExegesisQuotas';
export { notifyApproachingQuota } from './billing/notifyApproachingQuota';
export { migrateLegacySermons } from './admin/migrateLegacySermons';
export { changePlanForUser } from './admin/changePlanForUser';
export { bulkUserAction } from './admin/bulkUserAction';
export { grantUserCredits } from './admin/grantUserCredits';
export { resetUserPlanQuota } from './admin/resetUserPlanQuota';
export { extendUserTrialAdmin } from './admin/extendUserTrialAdmin';
export { setUserFeatureFlags } from './admin/setUserFeatureFlags';
export { ingestCoreLibraryConfessions } from './admin/confessions/ingestCoreLibrary';
export { tagConfessionDoctrineLevels } from './admin/confessions/tagDoctrineLevels';
export { updateSectionDoctrineLevel } from './admin/confessions/updateSectionDoctrineLevel';
export { ingestBibleCrossReferences } from './admin/cross-references/ingestCrossReferences';
export { lookupCrossReferences } from './admin/cross-references/lookupCrossReferences';
export { ingestLibrarySeedSources } from './admin/coreLibrary/ingestLibrarySeed';
// 🌱 Pastoral Fidelity Phase 1.6 — eight-step spine migration (ADR-022)
export { migratePastoralSeedsEightStep } from './admin/migratePastoralSeedsEightStep';

// 🌱 Pastoral Fidelity Phase 1.5 — Pastoral Word Study callables
export { identifyKeyWords } from './pastoral-word-study/identifyKeyWords';
export { analyzeWordPastorally } from './pastoral-word-study/analyzeWordPastorally';

// 🌱 Pastoral Fidelity Phase 2 — three-witnesses validation (ADR-011)
export { validateSeedWitnesses } from './three-witnesses/validateSeedWitnesses';
// 🌱 Pastoral Fidelity Phase 1.6 — timeless-principle verifier (ADR-023)
export { verifyTimelessPrinciple } from './three-witnesses/verifyTimelessPrinciple';
// 🌱 Pastoral Fidelity Phase 2.5 — Study Companion step orientation (ADR-026)
export { orientStudy } from './study-companion/orientStudy';
// 🌱 Pastoral Fidelity Phase 2.5 PR B — Faculty Socratic Sermon Agent LLM proxy (ADR-028)
export { runSocraticTurnLlm } from './guided-sermon/runSocraticTurnLlm';
// 🌱 Pastoral Fidelity Phase 2.5 Tier 3 — Structural puzzle builder (proposal `structural-puzzle-tier3.md`)
export { buildStructuralPuzzle } from './study-companion/buildStructuralPuzzle';
// 🌱 Pastoral Fidelity Phase 3 PR1 — Claim ↔ source fidelity evaluator (ADR-029)
export { evaluateClaimSourceFidelity } from './sermon/evaluateClaimSourceFidelity';



