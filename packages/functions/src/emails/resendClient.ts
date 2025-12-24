import { Resend } from 'resend';
import * as functions from 'firebase-functions';

// Try to get key from process.env (local) or functions.config() (prod)
// accessing functions.config() might fail if not in cloud environment context, so we try-catch it or check existence
const apiKey = process.env.RESEND_API_KEY || functions.config().resend?.apikey;

if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY is not set. Emails will not send.');
}

// Pass a dummy key if missing during build/deploy analysis to prevent crash
// The actual execution will fail if key is missing, but deploy will succeed
export const resend = new Resend(apiKey || 're_missing_key');
