import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import {
    initializeAppCheck,
    ReCaptchaEnterpriseProvider,
    type AppCheck,
} from 'firebase/app-check';

// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;
let appCheck: AppCheck | undefined;

export function initializeFirebase() {
    if (!app) {
        app = initializeApp(firebaseConfig);

        // App Check must be initialized BEFORE any other Firebase service
        // so the tokens are attached to the first requests. Web-only — we
        // gate on `typeof window` because the package is imported by
        // infrastructure-side code that may run in Node contexts (tests).
        if (typeof window !== 'undefined') {
            initializeWebAppCheck();
        }

        auth = getAuth(app);
        // Initialize Firestore with settings to avoid "offline" issues
        db = initializeFirestore(app, {
            localCache: memoryLocalCache(),
            experimentalForceLongPolling: true, // Force long polling to bypass network restrictions
        });
        storage = getStorage(app);
        functions = getFunctions(app);
    }
    return { app, auth, db, storage, functions };
}

/**
 * Wires Firebase App Check with reCAPTCHA Enterprise. Skips
 * initialization (with a console warning) when the site key isn't
 * configured — useful for local dev / CI environments that don't have
 * the secret. In dev a debug token can be set via
 * `window.FIREBASE_APPCHECK_DEBUG_TOKEN = true` and the token issued
 * by the Firebase console (see docs/LAUNCH_READINESS.md).
 */
function initializeWebAppCheck(): void {
    if (appCheck) return;

    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

    // Dev debug token — must be set before initializeAppCheck. The token
    // value comes from the Firebase Console (App Check → Apps → Debug).
    // We expose the flag via `import.meta.env.VITE_APP_CHECK_DEBUG` so
    // pastors testing locally don't get blocked.
    const debugToken = import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN as string | undefined;
    if (debugToken) {
        // The Firebase SDK reads this global at initializeAppCheck time.
        (window as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    }

    if (!siteKey) {
        console.warn(
            '[firebase] App Check skipped — VITE_RECAPTCHA_SITE_KEY not set. Production deployments MUST set this to enforce bot protection.',
        );
        return;
    }

    try {
        appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider(siteKey),
            isTokenAutoRefreshEnabled: true,
        });
    } catch (err) {
        console.error('[firebase] App Check initialization failed:', err);
    }
}

// Export initialized instances
export { app, auth, db, storage, functions, appCheck };

// Export Firebase services for use in repositories
export { getAuth, getFirestore, getStorage, getFunctions };
