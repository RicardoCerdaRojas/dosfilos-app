/**
 * Analytics configuration.
 *
 * All three IDs are PUBLIC by nature — they ship to the browser and
 * are visible in page source after the SDKs load. We keep them in
 * source so config drift between environments can't happen silently.
 *
 * The Meta Pixel ID is intentionally empty until the Business
 * Manager account finishes provisioning. Filling it in is the only
 * change required to activate the Meta side of the funnel — the
 * adapter is already wired to no-op when the value is blank.
 */
export const ANALYTICS_CONFIG = {
    /** Google Analytics 4 measurement ID. */
    ga4MeasurementId: 'G-PTSFDMZ2BJ',

    /** Microsoft Clarity project ID. */
    clarityProjectId: 'wq1p4ret6r',

    /**
     * Meta (Facebook) Pixel ID. Empty string disables the Meta path.
     * When the Business Manager account finishes provisioning,
     * paste the pixel id here and the adapter activates automatically.
     */
    metaPixelId: '',
} as const;

/**
 * Analytics is disabled in dev mode by default so local development
 * doesn't pollute the production GA4 property or Clarity recordings.
 * Override by setting `VITE_ANALYTICS_FORCE_ON` to `1` in `.env.local`
 * if you need to test the wiring locally.
 */
export function isAnalyticsEnabled(): boolean {
    if (import.meta.env.PROD) return true;
    return import.meta.env.VITE_ANALYTICS_FORCE_ON === '1';
}
