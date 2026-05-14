import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Probes the user's WordPress integration and returns the resolved
 * user + capabilities. Helps diagnose 401/403 errors when publishing
 * — the operator can see immediately whether auth succeeded, who WP
 * thinks they are, and which roles they have.
 *
 * Hits `/wp-json/wp/v2/users/me?context=edit` because the `context=edit`
 * variant is the one that returns capabilities + roles. The default
 * `view` context omits them for privacy reasons.
 */
export const testWordpressConnection = onCall(
    { region: 'us-central1' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign-in required');
        }
        const userId = request.auth.uid;

        const wpRef = db.doc(`users/${userId}/integrations/wordpress`);
        const wpSnap = await wpRef.get();
        if (!wpSnap.exists) {
            throw new HttpsError('failed-precondition', 'WordPress integration not configured.');
        }
        const wp = wpSnap.data()!;
        const siteUrl = (wp.siteUrl as string).replace(/\/$/, '');
        const username = wp.username as string;
        const appPassword = (wp.appPassword as string).replace(/\s+/g, '');

        const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
        const endpoint = `${siteUrl}/wp-json/wp/v2/users/me?context=edit`;

        try {
            const res = await fetch(endpoint, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json',
                },
            });
            const text = await res.text();
            let parsed: any;
            try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

            if (!res.ok) {
                return {
                    ok: false,
                    status: res.status,
                    code: parsed?.code ?? null,
                    message: parsed?.message ?? `HTTP ${res.status}`,
                    raw: text.slice(0, 500),
                };
            }

            const canEditPosts = !!(parsed?.capabilities?.edit_posts);
            return {
                ok: true,
                status: 200,
                resolvedUser: {
                    id: parsed?.id ?? null,
                    name: parsed?.name ?? null,
                    slug: parsed?.slug ?? null,
                    roles: parsed?.roles ?? [],
                    canEditPosts,
                },
                warning: canEditPosts ? null : 'Auth succeeded but the user lacks edit_posts capability — assign Author role or higher in WP admin.',
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new HttpsError('internal', `Connection failed: ${msg}`);
        }
    },
);
