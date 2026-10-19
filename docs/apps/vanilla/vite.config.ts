import { defineConfig } from 'vite';
import qiankun from 'vite-plugin-qiankun';
import { fileURLToPath, URL } from 'node:url';
import {
  logProMode,
  proAliasFor,
  proFsAllow,
  proVendorLicense,
  resolveProMode,
} from '../../../build/pro-mode';

/** packages/ 下的源码路径（demo 直接吃核心源码，不走 dist） */
const pkg = (p: string) => fileURLToPath(new URL(`../../../packages/${p}`, import.meta.url));

const APP_DIR = fileURLToPath(new URL('.', import.meta.url));
const deployBase = process.env.DEPLOY_BASE;

/**
 * 付费插件（`@virt-table-pro/*`）住在另一个**私有**仓库，而本仓库是公开的 ——
 * 任何人 clone 下来都要能 `pnpm install && pnpm dev`，且**公开产物里不能出现付费源码**。
 *
 * 档位判定、三档各自的 alias、以及「构建期为什么根本不认 `src` 档」全部收在
 * `build/pro-mode.ts` 一处（文档站与三个微应用共用同一份）。这里只负责把它接上。
 *
 * `command` 就是阶段：`serve` → dev（吃 pro 源码、有 HMR），`build` → 发布
 * （吃 `node_modules` 里的离线包，与客户装到的字节一致）。**不需要谁去设 `VT_PRO`。**
 */
export default defineConfig(({ command }) => {
  const proMode = resolveProMode({
    appDir: APP_DIR,
    phase: command === 'build' ? 'build' : 'dev',
    label: 'vanilla demo',
  });
  logProMode('vanilla demo', proMode);

  return {
    base: deployBase ? `${deployBase}micro-apps/vanilla/` : '/',
    plugins: [qiankun('vanillaDemo', { useDevMode: true })],
    /*
     * 让 demo 与文档站的 `ProDemo` 都能知道档位。
     * 文档站那边由 `docs/.vitepress/config.ts` 注入同名常量（同一个解析器算出来的）。
     */
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
        {
          find: /^@virt-table\/vanilla\/components$/,
          replacement: pkg('vanilla/src/components/index.ts'),
        },
        {
          find: /^@virt-table\/vanilla\/(plugins|components)\/(.*)$/,
          replacement: pkg('vanilla/src/$1/$2'),
        },
        /*
         * 自绘滚动条（`@virt-table-pro/gantt` 的双 pane 用它画两条滚动条）。
         *
         * **这条不是给本仓库的 demo 加的，是给付费包的产物加的。** 付费包把
         * `@virt-table/*` 全部 external 出去（它是 peer，打进来会出现两份 VirtTable 实例），
         * 所以 `packages/gantt/dist/index.js` 里留着一句裸的
         * `import { Scrollbar } from '@virt-table/vanilla/scrollbar'`。
         *
         * ⚠️ 规则：**付费包产物引到的每一条核心子路径，这里都得有一条 alias。**
         * 漏一条的报错是 `Failed to resolve import "@virt-table/vanilla/scrollbar"`。
         * 核对办法：在付费仓库里 grep 各包 dist 里的 `from '@virt-table/…'`，逐条对照。
         *
         * `src` 档下 pro 吃的是自己的源码，`@virt-table/*` 同样走上面这几条；
         * `off` 档解析到桩、压根不到这里。
         */
        { find: /^@virt-table\/vanilla\/scrollbar$/, replacement: pkg('vanilla/src/scrollbar.ts') },
        { find: /^@virt-table\/vanilla$/, replacement: pkg('vanilla/src/index.ts') },
        // 付费包：三档各自的 alias 由 pro-mode 给（`installed` 档一条都不加）
        ...proAliasFor(proMode),
      ],
    },
    server: {
      cors: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
      /*
       * `src` 档要读 workspace 根之外的 pro 源码，不放开就是一串 403。
       *
       * **只在 src 档写这个字段**：`fs.allow` 传空数组不等于「用默认」，
       * 那会把允许列表整个清空，连本仓库的源码都读不到。
       */
      ...(proMode === 'src' ? { fs: { allow: proFsAllow() } } : {}),
    },
    build: {
      outDir: '../../public/micro-apps/vanilla',
      emptyOutDir: true,
    },
    // 联调本地 virt-list 时把它踢出预打包，否则改了 node_modules 里的 dist，
    // 浏览器仍会用 `?v=<不随内容变化的 browserHash>` 的 immutable 缓存。
    // 完整来由见 docs/.vitepress/config.ts 里同名配置上方的注释。
    optimizeDeps: {
      exclude: process.env.VT_LINK_LOCAL ? ['@virt-list/vanilla', '@virt-list/core'] : [],
    },
  };
});
