import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import qiankun from 'vite-plugin-qiankun'
import { fileURLToPath, URL } from 'node:url'
import {
  logProMode,
  proAliasFor,
  proFsAllow,
  proVendorLicense,
  resolveProMode,
} from '../../../build/pro-mode'

/** packages/ 下的源码路径（demo 直接吃核心源码，不走 dist） */
const pkg = (p: string) => fileURLToPath(new URL(`../../../packages/${p}`, import.meta.url));

const APP_DIR = fileURLToPath(new URL('.', import.meta.url));
const deployBase = process.env.DEPLOY_BASE

/**
 * 付费插件（`@virt-table-pro/*`）的接入。档位判定与三档 alias 全在
 * `build/pro-mode.ts`（文档站与三个微应用共用一份）；`command` 就是阶段：
 * `serve` → 吃 pro 源码（HMR），`build` → 吃 node_modules 里的离线包。
 *
 * 这一端原来完全不消费付费包（零引用、无桩、无 alias）。付费插件本身与框架无关，
 * 但「能用」只有真的在这一端跑起来才算数 —— 所以三端都要有 demo。
 */
export default defineConfig(({ command }) => {
  const proMode = resolveProMode({
    appDir: APP_DIR,
    phase: command === 'build' ? 'build' : 'dev',
    label: 'react demo',
  });
  logProMode('react demo', proMode);

  return {
    base: deployBase ? `${deployBase}micro-apps/react/` : '/',
    plugins: [react(), qiankun('reactDemo', { useDevMode: true })],
    define: {
      __VT_PRO_MODE__: JSON.stringify(proMode),
      /*
       * `vendor` 档随入库产物带的那把**7 天测试密钥**（见 `build/pro-mode.ts`）。
       * 其它档给空串，`pro-kit/demo-license.ts` 于是回落到 2099 那把长期演示密钥。
       *
       * 三端都要写这一行：密钥是在各 app 自己的 `src` 里设的（付费包逐 app 安装，
       * 共享的 pro-kit 目录不能 import 它们），漏一端那一端就静默用了长期密钥 ——
       * 症状是"密钥到期验证只在两个框架上生效"。
       */
      __VT_PRO_LICENSE_KEY__: JSON.stringify(
        proMode === 'vendor' ? (proVendorLicense()?.key ?? '') : '',
      ),
    },
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
        /*
         * 自绘滚动条 —— **给付费包的产物加的，不是给本端 demo 加的。** 付费包把
         * `@virt-table/*` 全部 external（peer，打进来会有两份 VirtTable 实例），所以
         * `@virt-table-pro/gantt` 的产物里留着一句裸的
         * `import { Scrollbar } from '@virt-table/vanilla/scrollbar'`。
         *
         * ⚠️ 规则：**付费包产物引到的每一条核心子路径，这里都得有一条 alias**，
         * 三端各一份。漏一条的报错是 `Failed to resolve import`，且只在装了付费包时出现。
         */
        { find: /^@virt-table\/vanilla\/scrollbar$/, replacement: pkg('vanilla/src/scrollbar.ts') },
        { find: /^@virt-table\/vanilla$/, replacement: pkg('vanilla/src/index.ts') },
        { find: /^@virt-table\/react$/, replacement: pkg('react/src/index.ts') },
        // 付费包：三档各自的 alias 由 pro-mode 给（`installed` 档一条都不加）
        ...proAliasFor(proMode),
      ],
    },
    server: {
      cors: true,
      hmr: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      // 只在 src 档写 fs.allow：传空数组会把允许列表整个清空（连本仓库源码都读不到）
      ...(proMode === 'src' ? { fs: { allow: proFsAllow() } } : {}),
    },
    build: {
      outDir: '../../public/micro-apps/react',
      emptyOutDir: true,
    },
    // 联调本地 virt-list 时把它踢出预打包，否则改了 node_modules 里的 dist，
    // 浏览器仍会用 `?v=<不随内容变化的 browserHash>` 的 immutable 缓存。
    // 完整来由见 docs/.vitepress/config.ts 里同名配置上方的注释。
    optimizeDeps: {
      exclude: process.env.VT_LINK_LOCAL ? ['@virt-list/vanilla', '@virt-list/core'] : [],
    },
  }
})
