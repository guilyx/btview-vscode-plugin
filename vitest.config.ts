import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/test/unit/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/btcpp/**'],
      thresholds: {
        lines: 55,
        branches: 45,
        functions: 65,
        statements: 55,
      },
    },
  },
});
