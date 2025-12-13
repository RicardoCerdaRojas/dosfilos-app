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
    exclude: ['@google/generative-ai/server'],
  },
});
