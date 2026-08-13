import { defineConfig } from 'vite';
import qiankun from 'vite-plugin-qiankun';
import { fileURLToPath, URL } from 'node:url';

/** packages/ 下的源码路径（playground 直接吃源码，不走 dist） */
const pkg = (p: string) => fileURLToPath(new URL(`../../../packages/${p}`, import.meta.url));

const deployBase = process.env.DEPLOY_BASE;

export default defineConfig({
  base: deployBase ? `${deployBase}micro-apps/vanilla/` : '/',
  plugins: [qiankun('vanillaDemo', { useDevMode: true })],
  resolve: {
    // 用数组 + 正则而非对象：对象形式是**前缀**匹配，
    // `@virt-table/vanilla/plugins` 会被当成 `.../src/index.ts/plugins`
    alias: [
      { find: /^@virt-table\/vanilla\/plugins$/, replacement: pkg('vanilla/src/plugins/index.ts') },
      { find: /^@virt-table\/vanilla\/components$/, replacement: pkg('vanilla/src/components/index.ts') },
      {
        find: /^@virt-table\/vanilla\/(plugins|components)\/(.*)$/,
        replacement: pkg('vanilla/src/$1/$2'),
      },
      { find: /^@virt-table\/vanilla$/, replacement: pkg('vanilla/src/index.ts') },
    ],
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
