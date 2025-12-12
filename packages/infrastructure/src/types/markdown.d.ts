// Type declarations for importing markdown files as raw strings in Vite
declare module '*.md?raw' {
    const content: string;
    export default content;
}
