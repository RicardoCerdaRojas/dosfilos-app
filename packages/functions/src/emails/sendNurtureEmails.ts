import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { resend } from './resendClient';
import { getDay3GreekTemplate } from './templates/nurture/day3Greek';
import { getDay7LibraryTemplate } from './templates/nurture/day7Library';
import { getDay14UpgradeTemplate } from './templates/nurture/day14Upgrade';

const db = admin.firestore();
const SENDER_EMAIL = 'DosFilos <onboarding@dosfilos.com>';
const DASHBOARD_URL = 'https://preach.dosfilos.com/dashboard';

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

        try {
            await resend.emails.send({
                from: SENDER_EMAIL,
                to: email,
                subject: 'Descubre el Poder del Griego 🏛️',
                html: getDay3GreekTemplate(userData.displayName || 'Predicador', DASHBOARD_URL)
            });

            await doc.ref.set({
                metadata: { emailsSent: { day3_greek: true } }
            }, { merge: true });

            console.log(`Day 3 email sent to ${email}`);
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

        try {
            await resend.emails.send({
                from: SENDER_EMAIL,
                to: email,
                subject: 'Organiza tu Predicación 📚',
                html: getDay7LibraryTemplate(userData.displayName || 'Predicador', DASHBOARD_URL)
            });

            await doc.ref.set({
                metadata: { emailsSent: { day7_library: true } }
            }, { merge: true });

            console.log(`Day 7 email sent to ${email}`);
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

        try {
            await resend.emails.send({
                from: SENDER_EMAIL,
                to: email,
                subject: 'Lleva tu Ministerio al Siguiente Nivel 🚀',
                html: getDay14UpgradeTemplate(userData.displayName || 'Predicador', DASHBOARD_URL)
            });

            await doc.ref.set({
                metadata: { emailsSent: { day14_upgrade: true } }
            }, { merge: true });

            console.log(`Day 14 email sent to ${email}`);
        } catch (e) {
            console.error(`Failed to send Day 14 email to ${email}`, e);
        }
    }
}
