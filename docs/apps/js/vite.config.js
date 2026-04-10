import { defineConfig } from 'vite';
import qiankun from 'vite-plugin-qiankun';
import { fileURLToPath, URL } from 'node:url';

const deployBase = process.env.DEPLOY_BASE;

export default defineConfig({
  base: deployBase ? `${deployBase}micro-apps/js/` : '/',
  plugins: [qiankun('jsDemo', { useDevMode: true })],
  resolve: {
    alias: {
      '@virt-table/js': fileURLToPath(
        new URL('../../../packages/js/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  build: {
    outDir: '../../public/micro-apps/js',
    emptyOutDir: true,
  },
});
