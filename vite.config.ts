import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
// Test config lives in vitest.config.ts (keeps Vite and Vitest plugin types from clashing).
export default defineConfig({
  plugins: [react()],
  // .mpeg isn't in Vite's default asset list — treat it as a static asset (URL import)
  // so `import click from '…/click.mpeg'` resolves instead of being parsed as JS.
  assetsInclude: ['**/*.mpeg'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
