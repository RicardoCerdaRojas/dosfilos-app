import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Marked } from 'marked';

const db = admin.firestore();

interface PublishRequest {
    extractionId: string;
    /** Optional override of the WP post status. Defaults to user's preference. */
    status?: 'draft' | 'publish';
    /** Optional title override. Defaults to extraction title. */
    title?: string;
    /** Optional excerpt for the post (preview shown in WP listing). */
    excerpt?: string;
}

const MAX_PUBLISHES_PER_HOUR_PER_USER = 20;

/**
 * Publishes a persisted Extraction to the user's WordPress site as
 * a post (default status: draft). The user owns the credentials —
 * we read from `users/{uid}/integrations/wordpress` and call the WP
 * REST API with Basic Auth (application password). Server-side
 * markdown→HTML render with the same `marked` instance the email
 * pipeline uses, so the post body matches the email body styling.
 *
 * Constraints:
 *   - User must own the extraction.
 *   - User must have configured the WordPress integration first.
 *   - Per-user rate limit (anti-spam guard).
 *
 * Persists a `publishedRefs` log entry on the Extraction so the UI
 * can show "Publicado en WordPress · ver borrador" with a click-
 * through to the WP edit URL.
 */
export const publishExtractionToWordpress = onCall<PublishRequest>(
    { region: 'us-central1' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign-in required');
        }
        const userId = request.auth.uid;

        const { extractionId, status, title, excerpt } = request.data ?? {};
        if (!extractionId || typeof extractionId !== 'string') {
            throw new HttpsError('invalid-argument', 'extractionId required');
        }

        // Rate limit shared with email send (different key).
        const hourBucket = new Date().toISOString().slice(0, 13);
        const counterRef = db.doc(`users/${userId}/wp_publishes_hourly/${hourBucket}`);
        const counterSnap = await counterRef.get();
        const currentCount = (counterSnap.exists ? counterSnap.data()?.count : 0) ?? 0;
        if (currentCount >= MAX_PUBLISHES_PER_HOUR_PER_USER) {
            throw new HttpsError('resource-exhausted', `Max ${MAX_PUBLISHES_PER_HOUR_PER_USER} publishes per hour reached`);
        }

        // Load + ownership-check the extraction.
        const extractionRef = db.doc(`extractions/${extractionId}`);
        const extractionSnap = await extractionRef.get();
        if (!extractionSnap.exists) {
            throw new HttpsError('not-found', 'Extraction not found');
        }
        const extraction = extractionSnap.data()!;
        if (extraction.userId !== userId) {
            throw new HttpsError('permission-denied', 'Not owned by user');
        }

        // Load WP integration config.
        const wpRef = db.doc(`users/${userId}/integrations/wordpress`);
        const wpSnap = await wpRef.get();
        if (!wpSnap.exists) {
            throw new HttpsError('failed-precondition', 'WordPress integration not configured. Connect your site in Settings first.');
        }
        const wp = wpSnap.data()!;
        const siteUrl = (wp.siteUrl as string).replace(/\/$/, '');
        const username = wp.username as string;
        const appPassword = (wp.appPassword as string).replace(/\s+/g, '');
        const defaultStatus = (wp.defaultStatus as 'draft' | 'publish') ?? 'draft';

        // Render markdown → HTML inline-styled (no class dependencies on
        // WP's theme; the post stands on its own typography).
        const html = renderMarkdownForWordpress(extraction.markdown ?? '');

        const finalTitle = (typeof title === 'string' && title.trim()) || extraction.title || 'Sin título';
        const finalStatus = status ?? defaultStatus;
        const finalExcerpt = (typeof excerpt === 'string' && excerpt.trim()) || undefined;

        const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
        const wpEndpoint = `${siteUrl}/wp-json/wp/v2/posts`;

        let wpResponse: any;
        try {
            const res = await fetch(wpEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: finalTitle,
                    content: html,
                    status: finalStatus,
                    excerpt: finalExcerpt,
                }),
            });
            if (!res.ok) {
                const text = await res.text();
                await wpRef.update({ lastError: `HTTP ${res.status}: ${text.slice(0, 300)}` });
                throw new HttpsError('internal', `WordPress responded ${res.status}: ${text.slice(0, 200)}`);
            }
            wpResponse = await res.json();
        } catch (err) {
            if (err instanceof HttpsError) throw err;
            const msg = err instanceof Error ? err.message : String(err);
            await wpRef.update({ lastError: msg.slice(0, 500) });
            throw new HttpsError('internal', `WordPress request failed: ${msg}`);
        }

        const publishedRef = {
            platform: 'wordpress' as const,
            externalId: String(wpResponse.id),
            externalUrl: wpResponse.link as string ?? `${siteUrl}/wp-admin/post.php?post=${wpResponse.id}&action=edit`,
            status: finalStatus,
            publishedAt: Timestamp.now(),
        };

        await extractionRef.update({
            publishedRefs: FieldValue.arrayUnion(publishedRef),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await wpRef.update({
            lastPublishedAt: FieldValue.serverTimestamp(),
            lastError: null,
        });

        await counterRef.set({
            count: FieldValue.increment(1),
            hourBucket,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // Hito 7 funnel event.
        const eventId = `extraction_wp_${extractionId}_${Date.now()}`;
        await db.collection('funnel_events').doc(eventId).set({
            eventName: 'extraction_published_wordpress',
            props: {
                extractionId,
                extractionType: extraction.type ?? null,
                status: finalStatus,
                wpPostId: wpResponse.id ?? null,
            },
            userId,
            sessionId: extraction.sessionId ?? null,
            clientTimestamp: null,
            serverTimestamp: FieldValue.serverTimestamp(),
            url: null,
            referrer: null,
            userAgent: request.rawRequest?.headers['user-agent'] as string | undefined ?? null,
            ip: request.rawRequest?.headers['x-forwarded-for'] as string | undefined ?? null,
        });

        return {
            postId: wpResponse.id,
            postUrl: publishedRef.externalUrl,
            status: finalStatus,
        };
    },
);

/**
 * Inline-styled markdown→HTML for WordPress. Keeps the post readable
 * regardless of the user's WP theme (dark themes, narrow content
 * widths, missing typography). Lighter than the email renderer
 * because WP themes apply their own h1/h2/p styles by default — we
 * only enforce blockquotes, lists, and code blocks where defaults
 * vary wildly across themes.
 */
function renderMarkdownForWordpress(md: string): string {
    const m = new Marked();
    m.use({
        renderer: {
            blockquote(this: any, { tokens }: any) {
                const inner = this.parser.parse(tokens);
                return `<blockquote style="border-left:4px solid #D97706;padding:12px 18px;margin:18px 0;background:#FEF3C7;border-radius:0 6px 6px 0;font-style:italic;color:#4B5563;">${inner}</blockquote>`;
            },
            link(this: any, { href, tokens }: any) {
                const text = this.parser.parseInline(tokens);
                return `<a href="${href}" style="color:#D97706;">${text}</a>`;
            },
        },
    });
    return m.parse(md, { async: false }) as string;
}
