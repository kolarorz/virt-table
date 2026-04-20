import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import qiankun from 'vite-plugin-qiankun'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
const deployBase = process.env.DEPLOY_BASE

export default defineConfig({
  base: deployBase ? `${deployBase}micro-apps/vue/` : '/',
  plugins: [vue(), vueJsx(), qiankun('vueDemo', { useDevMode: true })],
  resolve: {
    alias: {
      '@virt-table/vanilla': fileURLToPath(new URL('../../../packages/vanilla/src/index.ts', import.meta.url)),
      '@virt-table/vue': fileURLToPath(new URL('../../../packages/vue/src/index.ts', import.meta.url)),
    },
  },
  server: {
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  build: {
    outDir: '../../public/micro-apps/vue',
    emptyOutDir: true,
  },
})
