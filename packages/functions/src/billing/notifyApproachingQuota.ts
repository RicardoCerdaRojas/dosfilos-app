import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { resend } from '../emails/resendClient';
import {
    getQuotaWarningTemplate,
    getQuotaWarningSubject,
} from '../emails/templates/quotaWarning';

const db = admin.firestore();
const SENDER_EMAIL = 'DosFilos <onboarding@dosfilos.com>';
const DASHBOARD_URL = 'https://preach.dosfilos.com/dashboard';

const WARNING_THRESHOLD = 0.8; // 80%

type Locale = 'es' | 'en';
type Mode = 'standard' | 'premium';

/**
 * Daily scheduled job: scans paid-plan users, identifies anyone whose
 * plan-bucket page consumption crossed the 80% threshold THIS billing
 * cycle, and emails them once per cycle per mode.
 *
 * Why a separate threshold from the in-app warning: the UI already
 * shows tone-changes at 80% in `ProcessingQuotaUsageCard` (yellow bar)
 * and `BalanceBanner` (warning numbers). The email is for users not
 * actively in the app — pastors mid-week sermon prep who'll only
 * notice the cap when they crash into it on Saturday. One proactive
 * email saves a "I tried to upload Sunday morning and the app
 * blocked me" support case.
 *
 * Idempotency: writes a marker doc at
 * `users/{uid}/quota_warnings/{periodKey}-{mode}` after sending. The
 * `periodKey` comes from the user's current `usageCounter.periodKey`
 * (YYYY-MM format), so the marker auto-rotates each month — no manual
 * cleanup needed. Same threshold crossing in the next cycle generates
 * a fresh marker + a fresh email.
 *
 * No retroactive emails: if a user was already past 80% when this
 * function deploys, the next-cycle reset gives them a clean slate
 * before any notification fires. By design — better than blasting
 * existing high-usage users with "you're already over the limit"
 * emails the day this ships.
 *
 * Why daily and not hourly: extraction events that push a user past
 * 80% are infrequent enough that "you'll know within 24 hours" is
 * acceptable. Hourly would burn function invocations and Resend send
 * quota for marginal UX gain.
 */
export const notifyApproachingQuota = onSchedule(
    {
        schedule: 'every day 09:00',
        timeZone: 'America/Argentina/Buenos_Aires',
        // RESEND_API_KEY is loaded via packages/functions/.env at deploy
        // time (same pattern as sendNurtureEmails). Don't declare it as
        // a Secret Manager secret unless it's actually provisioned
        // there — the deploy validates secret existence and 404s.
    },
    async () => {
        console.log('[notifyApproachingQuota] Starting daily 80% quota scan...');

        const summary = {
            scanned: 0,
            crossedStandard: 0,
            crossedPremium: 0,
            sent: 0,
            skippedAlreadyNotified: 0,
            skippedNoEmail: 0,
            skippedNoQuota: 0,
            errors: [] as Array<{ userId: string; reason: string }>,
        };

        // Cache plans
        const plansSnap = await db.collection('plans').get();
        const planQuotas = new Map<string, { standard: number; premium: number }>();
        plansSnap.docs.forEach(doc => {
            const limits = doc.data().limits ?? {};
            planQuotas.set(doc.id, {
                standard: Math.max(0, Number(limits.standardPagesPerMonth) || 0),
                premium: Math.max(0, Number(limits.premiumPagesPerMonth) || 0),
            });
        });

        const usersSnap = await db.collection('users').get();
        for (const userDoc of usersSnap.docs) {
            summary.scanned++;
            const data = userDoc.data();
            const subscription = data.subscription;
            if (!subscription || !subscription.planId || subscription.planId === 'free') continue;
            if (subscription.status && subscription.status !== 'active' && subscription.status !== 'trialing') continue;

            const quotas = planQuotas.get(subscription.planId);
            if (!quotas || (quotas.standard === 0 && quotas.premium === 0)) {
                summary.skippedNoQuota++;
                continue;
            }

            const balance = data.processingBalance;
            if (!balance) continue;

            // Period key drives idempotency. We read it from the
            // existing usageCounter (which already exists for queries
            // tracking) so the marker rotates with the same monthly
            // cadence as everything else. Fallback to current YYYY-MM
            // if the counter is unset (very new accounts).
            const periodKey = data.usageCounter?.periodKey
                ?? new Date().toISOString().slice(0, 7);

            for (const mode of ['standard', 'premium'] as Mode[]) {
                const quota = mode === 'standard' ? quotas.standard : quotas.premium;
                if (quota === 0) continue;

                const planRemaining = mode === 'standard'
                    ? Number(balance.planStandardPages ?? 0)
                    : Number(balance.planPremiumPages ?? 0);
                const used = Math.max(0, quota - planRemaining);
                const ratio = used / quota;
                if (ratio < WARNING_THRESHOLD) continue;

                if (mode === 'standard') summary.crossedStandard++;
                else summary.crossedPremium++;

                // Idempotency check.
                const markerRef = userDoc.ref
                    .collection('quota_warnings')
                    .doc(`${periodKey}-${mode}`);
                const markerSnap = await markerRef.get();
                if (markerSnap.exists) {
                    summary.skippedAlreadyNotified++;
                    continue;
                }

                const email = data.email;
                if (!email) {
                    summary.skippedNoEmail++;
                    await markerRef.set({
                        periodKey,
                        mode,
                        used,
                        quota,
                        skipped: 'no email on profile',
                        markedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    continue;
                }

                const locale: Locale = data.preferredLanguage === 'en' ? 'en' : 'es';
                const name = data.displayName
                    || data.email?.split('@')[0]
                    || (locale === 'en' ? 'Preacher' : 'Predicador');

                try {
                    await resend.emails.send({
                        from: SENDER_EMAIL,
                        to: email,
                        subject: getQuotaWarningSubject(mode, locale),
                        html: getQuotaWarningTemplate(name, mode, used, quota, DASHBOARD_URL, locale),
                    });
                    await markerRef.set({
                        periodKey,
                        mode,
                        used,
                        quota,
                        sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    summary.sent++;
                    console.log(`[notifyApproachingQuota] Sent ${mode} warning to ${email} (${used}/${quota} = ${Math.round(ratio * 100)}%)`);
                } catch (err: any) {
                    summary.errors.push({
                        userId: userDoc.id,
                        reason: err?.message ?? String(err),
                    });
                    console.error(`[notifyApproachingQuota] Failed for ${email}: ${err?.message ?? err}`);
                }
            }
        }

        console.log('[notifyApproachingQuota] Done:', JSON.stringify(summary, null, 2));
    },
);
