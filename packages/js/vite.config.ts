import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VirtTable',
      fileName: 'index',
      formats: ['es', 'umd'],
    },
    outDir: 'dist',
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
  },
});
