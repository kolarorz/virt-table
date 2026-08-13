import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@virt-table/vanilla': fileURLToPath(new URL('./packages/vanilla/src/index.ts', import.meta.url)),
    },
  },
  test: {
    // docs 侧目前只有一个样式隔离契约测试（theme/styles/styles-contract.test.ts），
    // 它守着「文档站 CSS 不得命中 demo 里 virt-table 的真实 <table>」这条约束
    include: ['packages/**/*.test.ts', 'docs/.vitepress/**/*.test.ts'],
    server: {
      deps: {
        // `@virt-list/*` 的 dist 里有无扩展名的相对引用（`./dist/VirtListCore`），
        // Node 的 ESM 解析器认不出来；内联进来让 Vite 的解析器处理。
        // 只有 DOM 层测试（会 import index.ts）需要这条，纯逻辑测试碰不到。
        inline: ['@virt-list/core', '@virt-list/vanilla'],
      },
    },
  },
});
