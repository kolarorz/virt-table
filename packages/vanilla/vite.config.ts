import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

/**
 * 多入口库构建（ESM + CJS）。UMD 单文件在 `vite.config.umd.ts` 里单独构建
 * ——UMD 只能有一个入口，和多入口互斥。
 *
 * 之所以做成多入口，而不是一个 index 全量 re-export：
 *   1. 插件 / 内置组件的 CSS 需要跟着自己的 chunk 走（`cssCodeSplit`），
 *      挂在核心入口上就会全部并进 `core.css`。
 *   2. 子路径 exports 让不做 tree-shaking 的场景（直接跑 ESM、老打包器）
 *      也能只加载用到的那部分。
 * 配合 package.json 的 `sideEffects: ["**\/*.css"]`，未用到的插件模块连同它的
 * CSS import 一起被摇掉。
 */

const r = (p: string) => resolve(__dirname, p);

/**
 * 让 CSS 产物和它所属入口同名同目录：`plugins/search.js` ↔ `plugins/search.css`。
 *
 * Vite 给拆分出来的 CSS 命名时只取 chunk 的**文件名部分**（`src/plugins/search.ts`
 * → `search.css`），于是全部平铺在 dist 根下，而且 `src/index.ts` 与
 * `src/components/index.ts` 会撞成 `index.css` / `index2.css`。`assetFileNames`
 * 拿不到 chunk 信息，改不了这件事；`chunk.viteMetadata.importedCss` 能拿到，
 * 所以在 generateBundle 里按 chunk 名重命名。
 */
function cssPerEntry(): Plugin {
  return {
    name: 'vt-css-per-entry',
    generateBundle(_options, bundle) {
      const renames = new Map<string, string>();
      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk') continue;
        for (const css of file.viteMetadata?.importedCss ?? []) {
          // 主入口的样式表叫 core.css（`style.css` 留给 UMD 构建的全量版本）
          renames.set(css, file.name === 'index' ? 'core.css' : `${file.name}.css`);
        }
      }
      for (const [from, to] of renames) {
        const asset = bundle[from];
        if (!asset || asset.type !== 'asset' || from === to) continue;
        delete bundle[from];
        asset.fileName = to;
        bundle[to] = asset;
      }
    },
  };
}

/**
 * src/plugins 下每个插件模块各自成入口（barrel 的 index.ts 也在内）。
 *
 * `.d.ts` 必须排除：它同时满足「以 .ts 结尾」与「不以 .test.ts 结尾」，一旦 tsc 往
 * 源码目录误 emit 了声明文件，`search.d.ts` 就会变成一个叫 `plugins/search.d` 的入口
 * ——产出 1 字节空 chunk，还把 `search.css` 的产物名带成 `search.d.css`，于是
 * `exports` 里的 `./plugins/*.css` 直接 404。这坑真踩过（4 个插件的样式在发布版本里
 * 引不进来），`.gitignore` 那边也堵了一道。
 */
const pluginEntries = Object.fromEntries(
  readdirSync(r('src/plugins'))
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.d.ts'))
    .map((f) => [`plugins/${f.replace(/\.ts$/, '')}`, r(`src/plugins/${f}`)]),
);

export default defineConfig({
  plugins: [cssPerEntry()],
  build: {
    outDir: 'dist',
    // 每个 chunk 的 CSS 单独产出：core.css / plugins/*.css / components/*.css
    cssCodeSplit: true,
    lib: {
      entry: {
        index: r('src/index.ts'),
        ...pluginEntries,
        /*
         * 自然语言查询的纯逻辑层单独成入口，有两个理由：
         *   1. 它最该跑在**服务端**（模型的产出在那里就该校验掉），而
         *      `plugins/ai-query.ts` 带 `import './ai-query.css'`，服务端引不得。
         *   2. 不给它入口的话，barrel 与 `plugins/ai-query.ts` 两处引用会让 Rollup 把它
         *      和插件本体并成共享 chunk，插件的 CSS 就跟着 chunk 名落到 dist 根下，
         *      `plugins/ai-query.css` 这个 exports 路径直接失效。
         */
        'ai-query': r('src/ai-query.ts'),
        /*
         * 列推断同理单独成入口：`plugins/ai-stream.ts` 与 barrel 两处引用它，不给入口
         * Rollup 会把它和 stream 插件本体并成共享 chunk，`plugins/ai-stream.css` 就跟着
         * chunk 名落到 dist 根下（和 ai-query 那次是同一个坑）。
         * 它也确实值得单独引 —— 纯逻辑零 DOM，服务端可以先把列算好随数据下发。
         */
        'infer-columns': r('src/infer-columns.ts'),
        'components/index': r('src/components/index.ts'),
        // 400+ 行 CSS，单独成 chunk 才不会并进 components/index.css
        'components/vt-filter-builder': r('src/components/vt-filter-builder.ts'),
      },
    },
    rollupOptions: {
      /*
       * 刻意**不** external `@virt-list/core` / `lodash-es`：两者都是 ESM-only，
       * `@virt-list/core` 的 exports 没有 require 条件、内部还有无扩展名的相对
       * 引用（Node 解析不了，只有打包器能），external 出去等于 `dist/index.cjs`
       * 直接不可用。而实测把它们打进来并不吃亏：使用方打包时 Rollup 照样能把
       * 用不到的 lodash 摇掉，同一份基础表格产物 external 与内联都是 179.8 kB。
       */
      // 手写 output 数组而不是用 lib.formats：共享 chunk 的扩展名必须跟着格式走。
      // 包是 "type": "module"，CJS chunk 落成 .js 的话 Node 会按 ESM 解析
      // （Node ≥22.7 有 CJS 回退兜着，18/20 直接 `exports is not defined`）。
      output: (['es', 'cjs'] as const).map((format) => {
        const ext = format === 'es' ? 'js' : 'cjs';
        return {
          format,
          exports: 'named' as const,
          entryFileNames: `[name].${ext}`,
          chunkFileNames: `chunks/[name]-[hash].${ext}`,
          // 最终名字由 cssPerEntry() 按所属入口重写，这里只是去掉 hash
          assetFileNames: '[name][extname]',
        };
      }),
    },
  },
});
