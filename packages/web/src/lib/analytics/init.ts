import { ANALYTICS_CONFIG, isAnalyticsEnabled } from './config';
import { captureUtm } from './utm';

/**
 * Bootstraps analytics SDKs.
 *
 * Called once from `main.tsx` immediately after React mounts. Does
 * three things:
 *
 *   1. Captures UTM parameters from the URL (first-touch attribution).
 *   2. Injects GA4 (`gtag.js`) when configured.
 *   3. Injects Microsoft Clarity when configured.
 *   4. Injects Meta Pixel (`fbq`) when the Pixel ID is filled in.
 *
 * Each SDK loads ASYNC so first paint isn't blocked. In dev mode
 * everything is a no-op (see `isAnalyticsEnabled`) so local
 * development doesn't pollute production analytics property.
 *
 * Safe to call multiple times — each adapter is idempotent via a
 * module-level guard.
 */

let initialized = false;

export function initAnalytics(): void {
    if (initialized) return;
    initialized = true;

    // Always capture UTMs — even in dev — so the helper's own
    // logic can be tested. Persistence is local to the browser.
    captureUtm();

    if (!isAnalyticsEnabled()) return;
    if (typeof window === 'undefined') return;

    if (ANALYTICS_CONFIG.ga4MeasurementId) {
        initGA4(ANALYTICS_CONFIG.ga4MeasurementId);
    }
    if (ANALYTICS_CONFIG.clarityProjectId) {
        initClarity(ANALYTICS_CONFIG.clarityProjectId);
    }
    if (ANALYTICS_CONFIG.metaPixelId) {
        initMetaPixel(ANALYTICS_CONFIG.metaPixelId);
    }
}

// ── GA4 ─────────────────────────────────────────────────────────────────

function initGA4(measurementId: string): void {
    // dataLayer must exist before the script loads — gtag.js
    // pushes to it during boot. Declared on window so TypeScript
    // can see it across the analytics module.
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag(...args: unknown[]) {
        (w.dataLayer as unknown[]).push(args);
    };
    w.gtag('js', new Date());
    w.gtag('config', measurementId, {
        // SPA needs `send_page_view: false` here because the router
        // fires its own page_view events on route change. Otherwise
        // we'd double-count the initial landing.
        send_page_view: true,
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
}

// ── Microsoft Clarity ──────────────────────────────────────────────────

function initClarity(projectId: string): void {
    // Mirrors the inline snippet Microsoft documents — pushes calls
    // into a queue (`clarity.q`) until the SDK loads and consumes
    // them. Kept as IIFE so the local helpers don't leak.
    (function (c: any, l: Document, a: string, r: string, i: string) {
        c[a] = c[a] || function (...args: unknown[]) {
            (c[a].q = c[a].q || []).push(args);
        };
        const t = l.createElement(r) as HTMLScriptElement;
        t.async = true;
        t.src = `https://www.clarity.ms/tag/${i}`;
        const y = l.getElementsByTagName(r)[0];
        y.parentNode?.insertBefore(t, y);
    })(window, document, 'clarity', 'script', projectId);
}

// ── Meta Pixel ─────────────────────────────────────────────────────────

function initMetaPixel(pixelId: string): void {
    // Standard Meta Pixel base code — fbq queue that the SDK
    // drains on load. We fire `PageView` here so first-touch
    // attribution happens immediately; subsequent custom events
    // (Lead, CompleteRegistration, Subscribe) come from `track.ts`.
    const w = window as any;
    if (w.fbq) return;
    const fbq: any = function (...args: unknown[]) {
        fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args);
    };
    w.fbq = fbq;
    if (!w._fbq) w._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);

    w.fbq('init', pixelId);
    w.fbq('track', 'PageView');
}
