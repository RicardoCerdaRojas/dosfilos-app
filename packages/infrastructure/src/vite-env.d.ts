/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly VITE_FIREBASE_APP_ID: string;
    readonly [key: `VITE_${string}`]: string | undefined;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Vite `?raw` import modifier — returns the file content as a string.
// Used by prompt builders that load markdown instruction files from config/.
declare module '*.md?raw' {
    const content: string;
    export default content;
}
