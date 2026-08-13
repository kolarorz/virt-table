/// <reference types="vite/client" />

/**
 * `vite` 不是 docs 的直接依赖（只嵌在 vitepress 里），上面那行 `vite/client`
 * 解析不到，`*.css` 的环境声明也就拿不到。首页要 `import(...index.css)` 把表格样式
 * 按需装进来，所以这里自己补一条。
 */
declare module '*.css' {
  const css: string;
  export default css;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
