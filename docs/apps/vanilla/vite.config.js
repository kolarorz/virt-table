import { defineConfig } from 'vite';
import qiankun from 'vite-plugin-qiankun';
import { fileURLToPath, URL } from 'node:url';

const deployBase = process.env.DEPLOY_BASE;

export default defineConfig({
  base: deployBase ? `${deployBase}micro-apps/vanilla/` : '/',
  plugins: [qiankun('vanillaDemo', { useDevMode: true })],
  resolve: {
    alias: {
      '@virt-table/vanilla': fileURLToPath(
        new URL('../../../packages/vanilla/src/index.ts', import.meta.url),
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
    outDir: '../../public/micro-apps/vanilla',
    emptyOutDir: true,
  },
});
