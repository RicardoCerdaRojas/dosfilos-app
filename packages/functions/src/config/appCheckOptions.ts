/**
 * Shared App Check option builder for v2 callable functions.
 *
 * `enforceAppCheck: true` makes the runtime reject requests that lack a
 * valid App Check token. Production = always enforce. The Firebase
 * emulator (used for local dev + integration tests) auto-sets
 * `FUNCTIONS_EMULATOR=true`, so we skip enforcement there to keep
 * `firebase emulators:start` working without debug tokens.
 *
 * Usage:
 *   import { appCheckCallableOptions } from '../config/appCheckOptions';
 *   export const captureLead = onCall<Req>(appCheckCallableOptions(), handler);
 *
 * Compose with other options by spreading:
 *   onCall<Req>({ ...appCheckCallableOptions(), region: 'us-central1' }, handler);
 */

import type { CallableOptions } from 'firebase-functions/v2/https';
import type { RuntimeOptions } from 'firebase-functions/v1';

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

/** v2 callable options spread. */
export function appCheckCallableOptions(): CallableOptions {
    return { enforceAppCheck: !isEmulator };
}

/**
 * v1 `runWith()` options spread. Use for legacy `functions.https.onCall`
 * sites that haven't been migrated to v2 yet:
 *   functions.runWith(appCheckV1Options()).https.onCall(handler)
 */
export function appCheckV1Options(): RuntimeOptions {
    return { enforceAppCheck: !isEmulator };
}
