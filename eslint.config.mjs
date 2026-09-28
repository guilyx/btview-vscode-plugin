import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: [
      'dist/**',
      'out/**',
      'out-test/**',
      'webview/dist/**',
      'demo/dist/**',
      'docs/.vitepress/dist/**',
      'docs/.vitepress/cache/**',
      'docs/public/demo/**',
      'node_modules/**',
      'esbuild.js',
    ],
  },
  {
    files: ['src/**/*.ts', 'scripts/**/*.mjs', 'docs/.vitepress/**/*.mts', 'demo/*.mts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Playwright scripts: Node, plus functions serialized into the page.
    files: ['scripts/media/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ['webview/src/**/*.{ts,tsx}', 'demo/src/**/*.ts'],
    languageOptions: {
      globals: globals.browser,
    },
  },
);
