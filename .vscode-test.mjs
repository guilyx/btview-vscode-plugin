import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out-test/src/test/suite/**/*.test.js',
  mocha: {
    ui: 'tdd',
    timeout: 60000,
  },
});
