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
});
