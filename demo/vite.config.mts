import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Browser demo harness: mounts the real webview app (webview/src) inside an iframe
 * and drives it with an in-page host built on the real src/btcpp domain code.
 *
 *   npm run demo:dev     → http://localhost:5174/
 *   npm run demo:build   → demo/dist (DEMO_BASE / DEMO_OUT_DIR override for the docs site)
 */
const demoDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(demoDir, '..');

export default defineConfig({
  root: demoDir,
  base: process.env.DEMO_BASE ?? './',
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(repoRoot, 'src/shared'),
    },
  },
  server: {
    port: 5174,
    fs: { allow: [repoRoot] },
  },
  preview: {
    port: 5174,
  },
  build: {
    outDir: process.env.DEMO_OUT_DIR ?? path.resolve(demoDir, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        index: path.resolve(demoDir, 'index.html'),
        webview: path.resolve(demoDir, 'webview.html'),
      },
    },
  },
});
