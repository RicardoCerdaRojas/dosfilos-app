import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Fix for @google/generative-ai server imports in browser
      '@google/generative-ai/server': path.resolve(__dirname, 'src/lib/empty-module.ts'),
      // Force workspace packages to resolve to a SINGLE canonical
      // copy (the repo's own packages/) instead of the nested
      // duplicates that npm/yarn creates inside other packages'
      // node_modules. Without this, modules like
      // packages/infrastructure/src/config/firebase.ts get loaded
      // twice — each copy has its own module-level `db`, and
      // `initializeFirebase()` populates one while `collection(db,
      // ...)` calls from elsewhere see the other (still undefined).
      // Surfaces as `Expected first argument to collection() to be
      // a CollectionReference, ...` once optimizeDeps stops
      // bundling them into one chunk.
      //
      // The alias points at the PACKAGE root (not /src) so both
      // entry-point imports (`@dosfilos/domain`, resolved via
      // package.json `main`) AND deep-path imports
      // (`@dosfilos/domain/src/entities/Foo`, used in some legacy
      // call sites) work without doubling the `src/` segment.
      '@dosfilos/domain': path.resolve(__dirname, '../domain'),
      '@dosfilos/application': path.resolve(__dirname, '../application'),
      '@dosfilos/infrastructure': path.resolve(__dirname, '../infrastructure'),
    },
  },
  optimizeDeps: {
    // Workspace packages are excluded so Vite treats them as source
    // (and applies its plugins, including the `?raw` text-import
    // suffix used by the prompt builders in @dosfilos/infrastructure).
    // esbuild — which Vite uses for pre-bundling — doesn't understand
    // `?raw`, so a re-optimize crashes with
    // `No loader is configured for ".md" files: …?raw`.
    exclude: [
      '@google/generative-ai/server',
      '@dosfilos/domain',
      '@dosfilos/application',
      '@dosfilos/infrastructure',
    ],
  },
  build: {
    // Manual vendor splitting. Pulls dependencies that change
    // infrequently out of the main app chunk so:
    //   1. Landing visitors download a smaller initial payload —
    //      Firebase alone is ~700KB even tree-shaken, and most
    //      landing visitors never authenticate, so keeping it in
    //      main is pure waste on the critical path.
    //   2. Cache hits on repeat visits — vendor bundles only
    //      invalidate when those deps bump, not on every app PR.
    //
    // Pattern (id) => string lets us match by module path prefix
    // instead of listing every individual export.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // React ecosystem — small, cached forever, on every page.
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/react-router')) {
            return 'vendor-react';
          }

          // Firebase SDK — large, only authenticated routes need it.
          if (id.includes('/firebase/') || id.includes('/@firebase/')) {
            return 'vendor-firebase';
          }

          // i18next runtime + react-i18next bindings. Translation
          // JSON stays with the page chunks that import it.
          if (id.includes('/i18next') || id.includes('/react-i18next')) {
            return 'vendor-i18n';
          }

          // React Query — used app-wide but cached separately.
          if (id.includes('/@tanstack/')) {
            return 'vendor-query';
          }

          // Other node_modules fall back to vite's default chunking
          // (already splits diagram libs, katex, cytoscape, etc.).
          return undefined;
        },
      },
    },
  },
});
