import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true, // Injects describe, it, expect, beforeAll, afterAll, etc. globally
    environment: 'node',
    // Allow 5 min for beforeAll hooks (first run downloads the MongoDB binary)
    testTimeout: 60000,
    hookTimeout: 300_000,
    pool: 'forks',
    include: ['src/tests/**/*.test.js'],
  },
});
