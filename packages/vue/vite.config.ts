import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * Vue 封装的库构建（ESM + CJS）。结构与 `packages/react/vite.config.ts` 完全一致，
 * 那份的头注解释了「为什么单入口 / 为什么零 CSS / 为什么依赖全 external」。
 *
 * 这里不挂 `@vitejs/plugin-vue`：封装层是纯 `defineComponent` + `h()`，没有 SFC，
 * 用不上模板编译。
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: { index: resolve(__dirname, 'src/index.ts') },
    },
    rollupOptions: {
      external: [/^vue($|\/)/, /^@virt-table\/vanilla($|\/)/],
      output: (['es', 'cjs'] as const).map((format) => ({
        format,
        exports: 'named' as const,
        entryFileNames: `[name].${format === 'es' ? 'js' : 'cjs'}`,
      })),
    },
  },
});
