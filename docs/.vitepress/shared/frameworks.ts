/**
 * 框架清单与展示名。
 *
 * 放在 theme/ 外面是因为 `config.ts` 也要用：theme/composables 下的模块都 import 了
 * vue / vitepress 的运行时，配置文件（node 侧）不能引。这里保持零依赖，两边都能 import，
 * 省得两处各写一份框架名然后慢慢漂移（config.ts 与 useFramework.ts 原先各有一份）。
 */
export type Framework = 'vanilla' | 'vue' | 'react';

export const FRAMEWORKS: Framework[] = ['vanilla', 'vue', 'react'];

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  vanilla: 'Vanilla',
  vue: 'Vue 3',
  react: 'React 18+',
};
