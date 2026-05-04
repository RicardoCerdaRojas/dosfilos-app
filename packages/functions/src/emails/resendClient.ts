import { Resend } from 'resend';

// Functions Gen 2 reads the key from the env var configured per-function
// (see deployed sendWelcomeEmail / sendNurtureEmails / etc.). The legacy
// `functions.config().resend.apikey` fallback was removed because calling
// `functions.config()` at module-load throws on Gen 2 and crashes the
// container during cold-start — taking down ANY new function whose bundle
// transitively pulls in this file (e.g. cancelExtraction broke the deploy
// in May 2026 because it had no RESEND_API_KEY env var, falling through
// to the now-fatal config() call).
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY is not set. Emails will not send.');
}

// Dummy key keeps `new Resend()` from throwing during cold-start of
// functions that don't actually send email. Real send paths still fail
// loudly when the key is missing.
export const resend = new Resend(apiKey || 're_missing_key');
