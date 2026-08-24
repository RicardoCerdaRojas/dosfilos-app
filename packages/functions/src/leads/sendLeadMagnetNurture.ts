import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { render } from '@react-email/render';
import { resend } from '../emails/resendClient';
import { Day1ErrorEmail, getDay1ErrorSubject } from '../emails/templates/leadMagnetNurture/Day1ErrorEmail';
import { Day3PickBookEmail, getDay3PickBookSubject } from '../emails/templates/leadMagnetNurture/Day3PickBookEmail';
import { Day5WorkflowEmail, getDay5WorkflowSubject } from '../emails/templates/leadMagnetNurture/Day5WorkflowEmail';
import { Day7TrialEmail, getDay7TrialSubject } from '../emails/templates/leadMagnetNurture/Day7TrialEmail';

type Locale = 'es' | 'en';

const db = admin.firestore();
const SENDER = 'Ricardo de Preach <hola@dosfilos.com>';

/**
 * Stage 0 = magnet delivered by captureLead (welcome + PDF link).
 * Stages 1–4 = nurture follow-ups. After stage 4 the sequence ends;
 * the lead either converted or didn't, and the team can pick up
 * via the admin dashboard if they want manual outreach.
 */
const SCHEDULE: ReadonlyArray<{
    stage: number;
    daysAfterDelivery: number;
    render: (name: string, locale: Locale) => Promise<string>;
    subject: (locale: Locale) => string;
    eventStage: string;
}> = [
    { stage: 1, daysAfterDelivery: 1, render: (n, l) => render(Day1ErrorEmail({ name: n, locale: l })), subject: getDay1ErrorSubject, eventStage: 'day1_error' },
    { stage: 2, daysAfterDelivery: 3, render: (n, l) => render(Day3PickBookEmail({ name: n, locale: l })), subject: getDay3PickBookSubject, eventStage: 'day3_pickbook' },
    { stage: 3, daysAfterDelivery: 5, render: (n, l) => render(Day5WorkflowEmail({ name: n, locale: l })), subject: getDay5WorkflowSubject, eventStage: 'day5_workflow' },
    { stage: 4, daysAfterDelivery: 7, render: (n, l) => render(Day7TrialEmail({ name: n, locale: l })), subject: getDay7TrialSubject, eventStage: 'day7_trial' },
];

const FINAL_STAGE = SCHEDULE[SCHEDULE.length - 1].stage;
const DAY_MS = 24 * 60 * 60 * 1000;

function pickName(raw: unknown, locale: Locale): string {
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    return locale === 'en' ? 'preacher' : 'predicador';
}

function inferLocale(utm: any): Locale {
    // Lead magnet is currently Spanish-only; if/when an English magnet
    // ships we can switch on the slug or a captured `locale` field.
    const hint = utm?.locale ?? utm?.utm_content ?? null;
    return hint === 'en' ? 'en' : 'es';
}

/**
 * Daily scheduler that walks the `lead_magnet_submissions` collection
 * and emails any lead whose next nurture stage is due. Idempotent per
 * doc: we bump `nurtureStage` and `lastEmailedAt` after a successful
 * send, so a re-run on the same day is a no-op.
 *
 * Distinct from `sendNurtureEmails` (which targets signed-up users)
 * because the audience and conversion goal differ — leads aren't in
 * the `users/` collection yet, and the sequence is shorter and more
 * direct.
 */
export const sendLeadMagnetNurture = onSchedule(
    {
        schedule: 'every day 11:00',
        secrets: ['RESEND_API_KEY'],
        timeZone: 'America/Santiago',
        region: 'us-central1',
    },
    async () => {
        console.log('[lead-magnet-nurture] starting daily run');

        const candidates = await db.collection('lead_magnet_submissions')
            .where('emailDelivered', '==', true)
            .where('nurtureStage', '<', FINAL_STAGE)
            .get();

        if (candidates.empty) {
            console.log('[lead-magnet-nurture] no candidates');
            return;
        }

        const now = Date.now();
        let sent = 0;
        let skipped = 0;
        let failed = 0;

        for (const docSnap of candidates.docs) {
            const lead = docSnap.data();
            const currentStage = lead.nurtureStage ?? 0;
            const nextStage = SCHEDULE.find(s => s.stage === currentStage + 1);
            if (!nextStage) {
                skipped++;
                continue;
            }

            const createdAtMs = lead.createdAt?.toMillis?.() ?? null;
            if (!createdAtMs) {
                skipped++;
                continue;
            }

            const daysElapsed = Math.floor((now - createdAtMs) / DAY_MS);
            if (daysElapsed < nextStage.daysAfterDelivery) {
                skipped++;
                continue;
            }

            if (lead.unsubscribed === true) {
                skipped++;
                continue;
            }

            const locale = inferLocale(lead.utm);
            const name = pickName(lead.name, locale);
            const subject = nextStage.subject(locale);
            const html = await nextStage.render(name, locale);

            try {
                await resend.emails.send({
                    from: SENDER,
                    to: lead.email,
                    subject,
                    html,
                });

                await docSnap.ref.update({
                    nurtureStage: nextStage.stage,
                    lastEmailedAt: FieldValue.serverTimestamp(),
                });

                // Fire a funnel event so Hito 7 analytics can compute
                // open-to-conversion rates per nurture stage. Server-side
                // direct write — no client involvement, no Pixel echo.
                const eventId = `nurture_${docSnap.id}_${nextStage.eventStage}`;
                await db.collection('funnel_events').doc(eventId).set({
                    eventName: 'lead_magnet_nurture_email_sent',
                    props: {
                        stage: nextStage.eventStage,
                        stageNumber: nextStage.stage,
                        leadMagnet: lead.leadMagnet ?? null,
                        utm_source: lead.utm?.utm_source ?? null,
                        utm_campaign: lead.utm?.utm_campaign ?? null,
                        daysAfterDelivery: nextStage.daysAfterDelivery,
                    },
                    userId: null,
                    sessionId: lead.sessionId ?? null,
                    clientTimestamp: null,
                    serverTimestamp: FieldValue.serverTimestamp(),
                    url: null,
                    referrer: null,
                    userAgent: lead.userAgent ?? null,
                    ip: lead.ip ?? null,
                });

                sent++;
                console.log(`[lead-magnet-nurture] sent ${nextStage.eventStage} to ${lead.email}`);
            } catch (err) {
                failed++;
                console.error(`[lead-magnet-nurture] failed for ${lead.email} stage ${nextStage.stage}:`, err);
                await docSnap.ref.update({
                    lastEmailError: String(err),
                });
            }
        }

        console.log(`[lead-magnet-nurture] done — sent=${sent} skipped=${skipped} failed=${failed}`);
    },
);
