import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import qiankun from 'vite-plugin-qiankun'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
const deployBase = process.env.DEPLOY_BASE

export default defineConfig({
  base: deployBase ? `${deployBase}micro-apps/react/` : '/',
  plugins: [react(), qiankun('reactDemo', { useDevMode: true })],
  resolve: {
    alias: {
      '@virt-table/js': fileURLToPath(new URL('../../../packages/js/src/index.ts', import.meta.url)),
      '@virt-table/react': fileURLToPath(new URL('../../../packages/react/src/index.ts', import.meta.url)),
    },
  },
  server: {
    cors: true,
    hmr: false,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  build: {
    outDir: '../../public/micro-apps/react',
    emptyOutDir: true,
  },
})
