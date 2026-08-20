// Ambient declarations for Vite-injected `import.meta.env` accessed from the
// application layer (services that are bundled into the web runtime).
// NOTE: `export {}` would convert this into a module and break the global augmentation.

interface ImportMetaEnv {
    readonly VITE_GEMINI_MODEL?: string;
    readonly [key: `VITE_${string}`]: string | undefined;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Vite `?raw` import modifier — returns the file content as a string.
// Declared here because application transitively typechecks infrastructure files
// that use these imports (prompt builders that load markdown).
declare module '*.md?raw' {
    const content: string;
    export default content;
}
