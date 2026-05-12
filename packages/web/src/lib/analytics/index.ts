/**
 * Analytics public API.
 *
 * Surface: `initAnalytics()` is called once from `main.tsx` after
 * React mounts. Anywhere else in the app calls `track(eventName)`
 * which fans out to GA4, Meta Pixel, Microsoft Clarity, and our
 * own Firestore mirror — automatically enriched with first-touch
 * UTM parameters.
 */
export { initAnalytics } from './init';
export { track } from './track';
export { ScrollDepthTracker } from './ScrollDepthTracker';
export type { FunnelEventName, EventProps } from './track';
export { readPersistedUtm, captureUtm } from './utm';
export type { UtmKey, UtmPayload } from './utm';
export { ANALYTICS_CONFIG, isAnalyticsEnabled } from './config';
