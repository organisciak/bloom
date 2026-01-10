import { defineConfig } from 'vitest/config';
import bundleAudioWorkletPlugin from 'vite-plugin-bundle-audioworklet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/// <reference types="vitest" />
const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [bundleAudioWorkletPlugin()],
  resolve: {
    alias: {
      '@src': path.resolve(rootDir, 'website/src'),
    },
  },
  test: {
    reporters: 'verbose',
    isolate: false,
    silent: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress}.config.*',
      '**/shared.test.mjs',
    ],
    setupFiles: './vitest.setup.mjs',
  },
});
