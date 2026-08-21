import { computed } from 'vue';
import { useRoute, useData, withBase } from 'vitepress';
// 框架清单与展示名放在 shared/ 下，config.ts（node 侧）也要用同一份
import { FRAMEWORKS, FRAMEWORK_LABELS, type Framework } from '../../shared/frameworks';

export { FRAMEWORKS, FRAMEWORK_LABELS };
export type { Framework };

/**
 * 顶部导航的四个入口，顺序即导航顺序。
 *
 * 它与 URL 的第二段**不是**一一对应，别把这两件事混起来：
 * - `guide` 是**独立**入口（`/{fw}/guide/*`）—— 「先读一遍」的内容（项目介绍 / 快速开始 /
 *   特殊说明 / 架构设计 / 设计决策）与「按需查一条」的内容是两种阅读方式，混在一个
 *   侧边栏里时前者被上百条功能与 API 条目压在最上面，读者根本不会往那儿看。
 * - `docs` 是**聚合**入口 —— `examples` / `api` 两段共用一份侧边栏（见 config.ts 的
 *   `buildDocsSidebar`）：一个能力一页带 demo，与它的字段表本来就是同一件东西的两面。
 * - `demos` 整个**不带框架前缀**（`/demos/xxx`）—— 经典案例是框架无关的原生实现，
 *   只维护一份；三端各写一遍必然只有 vanilla 那份是新的。
 */
export type NavModule = 'demos' | 'guide' | 'docs' | 'ai';

/** 归入「使用文档」入口的路径段（`guide` 已独立成入口，不在这里） */
const DOCS_SEGMENTS = ['examples', 'api'];

/** 不带框架前缀的入口：第一段就是模块名，没有 `/{fw}/` 那一层 */
const FRAMEWORKLESS: NavModule[] = ['demos'];

export const isFrameworkless = (mod: NavModule): boolean => FRAMEWORKLESS.includes(mod);

export const FRAMEWORK_ICONS: Record<Framework, string> = {
  vanilla: '<svg width="16" height="16" viewBox="0 0 20 20"><rect width="20" height="20" rx="3" fill="#f7df1e"/><text x="10" y="14.5" font-size="10" font-weight="bold" fill="#323330" text-anchor="middle" font-family="sans-serif">JS</text></svg>',
  vue: '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M2 4l14 24L30 4h-6l-8 14L8 4z" fill="#41b883"/><path d="M8 4l8 14L24 4h-5l-3 5.5L13 4z" fill="#35495e"/></svg>',
  react: '<svg width="16" height="16" viewBox="-11 -11 22 22"><circle r="2" fill="#61dafb"/><g fill="none" stroke="#61dafb" stroke-width="1"><ellipse rx="10" ry="4.2"/><ellipse rx="10" ry="4.2" transform="rotate(60)"/><ellipse rx="10" ry="4.2" transform="rotate(120)"/></g></svg>',
};

/**
 * 上一次待过的框架端。
 *
 * `/demos/*` 没有框架段，从 Demos 点回「文档」时得靠它把人送回原来那一端 ——
 * 否则 React 用户逛一圈案例回来会被扔进 vanilla 文档。只活在内存里：刷新后回到
 * vanilla，为它引一层持久化不值得。
 */
let lastFramework: Framework = 'vanilla';

/** 各入口的落地页 */
export function getModuleLink(fw: Framework, mod: NavModule): string {
  if (mod === 'demos') return withBase('/demos/');
  if (mod === 'ai') return withBase(`/${fw}/ai/index`);
  if (mod === 'guide') return withBase(`/${fw}/guide/index`);
  // 「使用文档」落在「功能」的第一页而不是 API 总览：来这个入口的人多半是要找某个能力
  return withBase(`/${fw}/examples/basic/basic`);
}

/**
 * Build a link that switches only the framework segment, preserving the
 * current module and page slug. E.g. /vue/examples/list/reactive → /react/examples/list/reactive
 */
export function getFrameworkLink(fw: Framework, relativePath: string): string {
  const parts = relativePath.split('/').filter(Boolean);
  // parts[0] = current fw, parts[1] = mod, parts[2..] = page slug
  // 不带框架段的页面（/demos/*、首页）没有「同页换框架」这回事，回文档首页
  if (parts.length >= 2 && FRAMEWORKS.includes(parts[0] as Framework)) {
    // **尾斜杠必须原样带过去**：目录页（`feature-columns/index.md`）的路由是
    // `/examples/feature-columns/`，`filter(Boolean)` 把那个空段吃掉之后拼出来的
    // `/examples/feature-columns` 在 VitePress 里是另一个（不存在的）页面 → 换框架即 404。
    const trailing = relativePath.endsWith('/') ? '/' : '';
    return withBase(`/${fw}/${parts.slice(1).join('/')}${trailing}`);
  }
  return withBase(`/${fw}/guide/index`);
}

export function useFramework() {
  const route = useRoute();
  const { site } = useData();

  /** Strip the configured base prefix from route.path for segment parsing. */
  const relativePath = computed(() => {
    const base = site.value.base || '/';
    const p = route.path;
    return p.startsWith(base) ? '/' + p.slice(base.length) : p;
  });

  const currentFramework = computed<Framework>(() => {
    const parts = relativePath.value.split('/').filter(Boolean);
    if (FRAMEWORKS.includes(parts[0] as Framework)) {
      lastFramework = parts[0] as Framework;
      return lastFramework;
    }
    return lastFramework;
  });

  /**
   * 当前落在哪个顶栏入口，首页返回 `null`（谁都不亮）。
   *
   * 按**路径段**判断，不能用 `route.path.includes(mod)`：`ai` 是任意子串，
   * `/vue/examples/ai/ai-column` 会让「AI 场景」和「文档」同时亮。
   */
  const currentNav = computed<NavModule | null>(() => {
    const parts = relativePath.value.split('/').filter(Boolean);
    if (parts[0] === 'demos') return 'demos';
    const seg = parts[1];
    if (seg === 'ai') return 'ai';
    if (seg === 'guide') return 'guide';
    if (seg && DOCS_SEGMENTS.includes(seg)) return 'docs';
    return null;
  });

  return { currentFramework, currentNav, relativePath };
}
