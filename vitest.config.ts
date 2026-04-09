import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@virt-list/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@virt-table/js': fileURLToPath(new URL('./packages/js/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['packages/**/*.test.ts'],
  },
});
