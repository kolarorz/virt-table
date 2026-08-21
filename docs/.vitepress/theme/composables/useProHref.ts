import { useData, withBase } from 'vitepress';

/**
 * 站内路径 → 可以直接放进 `href` 的地址。
 *
 * ## 为什么不能只用 `withBase()`
 *
 * `withBase()` 只补站点 base（GitHub Pages 上是 `/virt-table/`），**不补 `.html`**。
 * 而本站没有开 `cleanUrls`，产物就是 `xxx.html` —— 于是 `withBase('/react/api/instance')`
 * 拼出来的裸链接在静态托管上直接 404。
 *
 * markdown 里写的 `[文字](/path)` 不用操心这件事：VitePress 的 markdown 插件会归一化，
 * 侧边栏与 nav 的 `link` 也会。**只有组件里手写的 `href` 是漏网的那一档** ——
 * 这正是 `ProLink` / `ProDemo` 第一版踩的坑（dev 下一切正常，因为 dev server 两种都认）。
 *
 * ## 规则
 *
 * - 已经带扩展名（`.html` / `.png` …）或以 `/` 结尾（目录页，靠 index.html）→ 原样
 * - `#锚点` 拆出来最后接回去，别把它当路径的一部分
 * - 开了 `cleanUrls` 就什么都不补
 */
export function useProHref() {
  const { site } = useData();

  return (path: string): string => {
    if (!path) return withBase('/');
    const hashAt = path.indexOf('#');
    const bare = hashAt === -1 ? path : path.slice(0, hashAt);
    const hash = hashAt === -1 ? '' : path.slice(hashAt);

    const needsHtml =
      !site.value.cleanUrls &&
      bare.startsWith('/') &&
      !bare.endsWith('/') &&
      // 最后一段里没有点 = 没有扩展名
      !/\.[^/]*$/.test(bare);

    return withBase(`${bare}${needsHtml ? '.html' : ''}${hash}`);
  };
}
