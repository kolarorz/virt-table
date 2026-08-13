import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * UMD 全量单文件（`<script>` 直接用，CDN 场景）。
 *
 * UMD 只支持单入口，所以走独立 config，在主构建（`vite.config.ts`，多入口
 * ESM + CJS）之后追加执行，`emptyOutDir: false` 以免清掉前一步的产物。
 *
 * 两点与主构建不同，都是刻意的：
 *   - 不 external 任何依赖：script 标签场景没有模块解析，必须自包含。
 *   - `cssCodeSplit: false`：合成一份全量 `style.css`（核心 + 全部插件 +
 *     内置组件），既给 UMD 用，也给「懒得按需引 CSS」的打包器用户兜底。
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, 'src/umd.ts'),
      name: 'VirtTable',
      formats: ['umd'],
      fileName: () => 'virt-table.umd.cjs',
    },
    rollupOptions: {
      output: {
        exports: 'named',
        assetFileNames: 'style.css',
      },
    },
  },
});
