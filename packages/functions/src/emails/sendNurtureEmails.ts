import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { resend } from './resendClient';
import { getDay3GreekTemplate, getDay3GreekSubject } from './templates/nurture/day3Greek';
import { getDay7LibraryTemplate, getDay7LibrarySubject } from './templates/nurture/day7Library';
import { getDay14UpgradeTemplate, getDay14UpgradeSubject } from './templates/nurture/day14Upgrade';
import { getTrialEnding5dTemplate, getTrialEnding5dSubject } from './templates/nurture/trialEnding5d';
import { getTrialEnding1dTemplate, getTrialEnding1dSubject } from './templates/nurture/trialEnding1d';
import { APP_URL } from '../config/urls';

const db = admin.firestore();
const SENDER_EMAIL = 'DosFilos <onboarding@dosfilos.com>';
const DASHBOARD_URL = `${APP_URL}/dashboard`;

type Locale = 'es' | 'en';

/**
 * Reads the user's preferred language from the Firestore doc. Falls back to
 * Spanish when missing — older accounts that predate the Phase 2 persistence
 * change won't have the field set.
 */
function userLocale(userData: any): Locale {
    const raw = userData?.preferredLanguage ?? userData?.locale;
    return raw === 'en' ? 'en' : 'es';
}

function fallbackName(locale: Locale): string {
    return locale === 'en' ? 'Preacher' : 'Predicador';
}

// Helper to calculate date range for query
const getDateRange = (daysAgo: number) => {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - daysAgo);

    // Start of that day
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);

    // End of that day
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

export const sendNurtureEmails = onSchedule('every day 10:00', async () => {
    console.log('Starting daily nurture email check...');

    await processDay3Emails();
    await processDay7Emails();
    await processDay14Emails();

    // Trial-expiration warnings — keyed off subscription.trialEnd, not createdAt.
    // Run AFTER the onboarding nurture cohort so a user that signed up on day N
    // and is approaching trial-end doesn't get both a "day 14 upgrade" and a
    // "5 days left" email on the same morning (the trial-end emails win because
    // they're more time-sensitive).
    await processTrialEnding5dEmails();
    await processTrialEnding1dEmails();

    console.log('Daily nurture email check completed.');
});

async function processDay3Emails() {
    const { start, end } = getDateRange(3);
    const snapshot = await db.collection('users')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .get();

    for (const doc of snapshot.docs) {
        const userData = doc.data();
        if (userData.metadata?.emailsSent?.day3_greek) continue; // Skip if already sent

        const email = userData.email;
        if (!email) continue;
        const locale = userLocale(userData);
        const name = userData.displayName || fallbackName(locale);

        try {
            await resend.emails.send({
                from: SENDER_EMAIL,
                to: email,
                subject: getDay3GreekSubject(locale),
                html: getDay3GreekTemplate(name, DASHBOARD_URL, locale),
            });

            await doc.ref.set({
                metadata: { emailsSent: { day3_greek: true } }
            }, { merge: true });

            console.log(`Day 3 email sent to ${email} (${locale})`);
        } catch (e) {
            console.error(`Failed to send Day 3 email to ${email}`, e);
        }
    }
}

async function processDay7Emails() {
    const { start, end } = getDateRange(7);
    const snapshot = await db.collection('users')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .get();

    for (const doc of snapshot.docs) {
        const userData = doc.data();
        if (userData.metadata?.emailsSent?.day7_library) continue;

        const email = userData.email;
        if (!email) continue;
        const locale = userLocale(userData);
        const name = userData.displayName || fallbackName(locale);

        try {
            await resend.emails.send({
                from: SENDER_EMAIL,
                to: email,
                subject: getDay7LibrarySubject(locale),
                html: getDay7LibraryTemplate(name, DASHBOARD_URL, locale),
            });

            await doc.ref.set({
                metadata: { emailsSent: { day7_library: true } }
            }, { merge: true });

            console.log(`Day 7 email sent to ${email} (${locale})`);
        } catch (e) {
            console.error(`Failed to send Day 7 email to ${email}`, e);
        }
    }
}

async function processDay14Emails() {
    const { start, end } = getDateRange(14);
    const snapshot = await db.collection('users')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        // Only target FREE users for upgrade nudge
        .where('subscription.planId', '==', 'free')
        .get();

    for (const doc of snapshot.docs) {
        const userData = doc.data();
        if (userData.metadata?.emailsSent?.day14_upgrade) continue;

        const email = userData.email;
        if (!email) continue;
        const locale = userLocale(userData);
        const name = userData.displayName || fallbackName(locale);

        try {
            await resend.emails.send({
                from: SENDER_EMAIL,
                to: email,
                subject: getDay14UpgradeSubject(locale),
                html: getDay14UpgradeTemplate(name, DASHBOARD_URL, locale),
            });

            await doc.ref.set({
                metadata: { emailsSent: { day14_upgrade: true } }
            }, { merge: true });

            console.log(`Day 14 email sent to ${email} (${locale})`);
        } catch (e) {
            console.error(`Failed to send Day 14 email to ${email}`, e);
        }
    }
}

/**
 * Date window N days from NOW (forward-looking). Used for trial-expiration
 * warnings — opposite direction from `getDateRange` which looks backward
 * from today (used for onboarding nurture).
 */
function getFutureDayRange(daysFromNow: number) {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);

    const start = new Date(target);
    start.setHours(0, 0, 0, 0);

    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

/**
 * 5-day trial expiration warning. Queries users whose `subscription.trialEnd`
 * falls within the day 5 days from now. Status filter is applied in code
 * (Firestore range queries can only have one ordered field).
 */
async function processTrialEnding5dEmails() {
    const { start, end } = getFutureDayRange(5);
    const snapshot = await db.collection('users')
        .where('subscription.trialEnd', '>=', start)
        .where('subscription.trialEnd', '<=', end)
        .get();

    for (const doc of snapshot.docs) {
        const userData = doc.data();
        if (userData.subscription?.status !== 'trialing') continue;
        if (userData.metadata?.emailsSent?.trialEnding5d) continue;

        const email = userData.email;
        if (!email) continue;
        const locale = userLocale(userData);
        const name = userData.displayName || fallbackName(locale);

        try {
            await resend.emails.send({
                from: SENDER_EMAIL,
                to: email,
                subject: getTrialEnding5dSubject(locale),
                html: getTrialEnding5dTemplate(name, DASHBOARD_URL, locale),
            });

            await doc.ref.set({
                metadata: { emailsSent: { trialEnding5d: true } },
            }, { merge: true });

            console.log(`Trial-ending-5d email sent to ${email} (${locale})`);
        } catch (e) {
            console.error(`Failed to send trial-ending-5d email to ${email}`, e);
        }
    }
}

/**
 * 1-day (last) trial expiration warning. Same query shape as 5d but tighter
 * window. Idempotency: trialEnding1d marker prevents duplicate sends if the
 * cron is retried.
 */
async function processTrialEnding1dEmails() {
    const { start, end } = getFutureDayRange(1);
    const snapshot = await db.collection('users')
        .where('subscription.trialEnd', '>=', start)
        .where('subscription.trialEnd', '<=', end)
        .get();

    for (const doc of snapshot.docs) {
        const userData = doc.data();
        if (userData.subscription?.status !== 'trialing') continue;
        if (userData.metadata?.emailsSent?.trialEnding1d) continue;

        const email = userData.email;
        if (!email) continue;
        const locale = userLocale(userData);
        const name = userData.displayName || fallbackName(locale);

        try {
            await resend.emails.send({
                from: SENDER_EMAIL,
                to: email,
                subject: getTrialEnding1dSubject(locale),
                html: getTrialEnding1dTemplate(name, DASHBOARD_URL, locale),
            });

            await doc.ref.set({
                metadata: { emailsSent: { trialEnding1d: true } },
            }, { merge: true });

            console.log(`Trial-ending-1d email sent to ${email} (${locale})`);
        } catch (e) {
            console.error(`Failed to send trial-ending-1d email to ${email}`, e);
        }
    }
}
