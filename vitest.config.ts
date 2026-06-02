import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Vitest reads this file (not vite.config.ts) so the React plugin's Vite types
// don't clash with Vitest's bundled Vite. No React plugin is needed for sim tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Default to node — sim/ and data/ tests must NOT touch the DOM (SPEC §11).
    // A file that needs jsdom opts in per-file with:  // @vitest-environment jsdom
    environment: 'node',
    include: ['test/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/sim/**', 'src/data/**', 'src/platform/**'],
      reporter: ['text', 'html'],
    },
  },
});
