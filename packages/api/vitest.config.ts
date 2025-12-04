import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@repo/db': path.resolve(__dirname, '../db/src'),
      '@repo/db/schema': path.resolve(__dirname, '../db/src/schema.ts'),
      '@db/schema': path.resolve(__dirname, '../db/src/schema.ts'),
    },
  },
});



