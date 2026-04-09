import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@virt-list/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VirtTable',
      fileName: 'index',
      formats: ['es', 'umd'],
    },
    outDir: 'dist',
    cssFileName: 'style',
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
  },
});
