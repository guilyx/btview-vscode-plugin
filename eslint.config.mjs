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
      'node_modules/**',
      'esbuild.js',
    ],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['webview/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
);
