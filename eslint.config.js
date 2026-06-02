// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Flat config. The crucial rule here is the import-boundary enforcement:
 * `src/sim/**` and `src/data/**` are a PURE library and must never import from
 * `game/`, `ui/`, or `state/` (SPEC §2 "Hard rule"). This keeps the simulation
 * portable (runs in Node for tests and, later, on a server). Violations are errors.
 */
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', '*.config.js', '*.config.ts'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}', 'test/**/*.ts'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },

  // ── Purity boundary: the simulation library imports from nothing above it. ──
  {
    files: ['src/sim/**/*.ts', 'src/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/game/*',
                '@/ui/*',
                '@/state/*',
                '@/app/*',
                '../game/*',
                '../ui/*',
                '../state/*',
                '../app/*',
                '**/game/**',
                '**/ui/**',
                '**/state/**',
                '**/app/**',
                'pixi.js',
                'react',
                'react-dom',
                'zustand',
              ],
              message:
                'sim/ and data/ are a PURE library (SPEC §2). They must not import from game/, ui/, state/, app/, Pixi, React, or Zustand. Move shared types into sim/ or data/.',
            },
          ],
        },
      ],
    },
  },

  // ── data/ is config only: it must not import from sim/ either (one-way dep). ──
  {
    files: ['src/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/sim/*', '../sim/*', '**/sim/**'],
              message: 'data/ holds static config and types only; it must not import runtime logic from sim/.',
            },
          ],
        },
      ],
    },
  },
);
