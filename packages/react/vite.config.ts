import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * React 封装的库构建（ESM + CJS）。
 *
 * 与 `packages/vanilla` 的构建有三处刻意的不同：
 *   1. **单入口**。`filter-builder.ts` 由 `src/index.ts` 统一 re-export，没有独立子路径
 *      （文档与三端 demo 都只从包根引），所以不需要多入口，Rollup 直接把它内联进来。
 *   2. **零 CSS**。封装层只做桥接、不带样式，样式全在 `@virt-table/vanilla` 那边，
 *      所以既不需要 `cssCodeSplit` 也不需要 vanilla 那套 CSS 重命名插件。
 *   3. **依赖全部 external**。react / react-dom 是 peer（不能打进来，否则双实例
 *      直接炸 hooks）；`@virt-table/vanilla` 是运行时依赖，打进来会与用户自己安装的
 *      那份形成两套模块级状态（locale、插件注册表），必须走 external。
 *
 * 与 vanilla 一样手写 output 数组而不用 `lib.formats`：包是 `"type": "module"`，
 * CJS 产物必须落成 `.cjs`，否则 Node 会按 ESM 解析它。
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: { index: resolve(__dirname, 'src/index.ts') },
    },
    rollupOptions: {
      // 用正则而不是字符串数组：要一并覆盖 `react-dom/client`、
      // `@virt-table/vanilla/plugins` 这类子路径引用。
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^@virt-table\/vanilla($|\/)/],
      output: (['es', 'cjs'] as const).map((format) => ({
        format,
        exports: 'named' as const,
        entryFileNames: `[name].${format === 'es' ? 'js' : 'cjs'}`,
      })),
    },
  },
});
