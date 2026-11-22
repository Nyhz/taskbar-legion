import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const TIER = process.env.TEST_TIER ?? 'fast';

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
    // Two tiers (2026-11-22; user: «no puede ser que nos tiremos horas testeando»): `npm test` runs the fast tier — every
    // test but the long real-run simulations, which live in `*.slow.test.ts` files and run with `npm run test:slow`
    // (or both with `npm run test:all`). TEST_TIER=fast|slow|all picks.
    include: TIER === 'slow' ? ['test/**/*.slow.test.ts'] : ['test/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    exclude: TIER === 'fast' ? ['**/node_modules/**', '**/*.slow.test.ts'] : ['**/node_modules/**'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/sim/**', 'src/data/**', 'src/platform/**'],
      reporter: ['text', 'html'],
    },
  },
});
