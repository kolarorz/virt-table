/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin } from '../plugin';
import { vtFieldConfig, type FieldConfigOptions } from './field-config';
import { vtFilterConfig, type FilterConfigOptions } from './filter-config';
import { vtGroupConfig, type GroupConfigOptions } from './group-config';
import { vtSortConfig, type SortConfigOptions } from './sort-config';

/**
 * 四个面板插件的预设：**「我就要那四颗按钮」的一行写法**。
 *
 * ```ts
 * plugins: [vtToolbar(), ...vtToolbarPanels()]
 * ```
 *
 * 它就是下面这四行的简写，没有任何额外行为 —— 展开写与用它完全等价：
 *
 * ```ts
 * plugins: [vtToolbar(), vtFieldConfig(), vtFilterConfig(), vtGroupConfig(), vtSortConfig()]
 * ```
 *
 * ## 为什么是「预设」而不是工具栏的内置项
 *
 * `vtToolbar` 一颗按钮都不认识（见那边的头注）：付费甘特的按钮证明贡献点必须存在，
 * 既然存在，内置面板走同一条路才是一致的 —— 否则「工具栏里的那四个」与「工具栏里的搜索」
 * 会是两套心智。这个函数只是**把最常见的一组组合缩成一行**，不改变任何机制：
 * 你仍然可以只装其中一个、或者一个都不装。
 *
 * ## 要给某个面板传选项就传在这里
 *
 * ```ts
 * plugins: [
 *   vtToolbar(),
 *   ...vtToolbarPanels({ fieldConfig: { canToggleColumn: (c) => c.key !== 'id' || 'ID 不能藏' } }),
 * ]
 * ```
 *
 * **别「用预设 + 再单独装一个配置过的同名插件」** —— 那会有两个插件抢同一个 key，
 * 后者被工具栏拒掉并告警。要配就配在这里，或者干脆展开成四行显式写。
 */
export interface ToolbarPanelsOptions<T extends Record<string, any> = any> {
  fieldConfig?: FieldConfigOptions<T>;
  filterConfig?: FilterConfigOptions;
  groupConfig?: GroupConfigOptions;
  sortConfig?: SortConfigOptions;
}

export function vtToolbarPanels<T extends Record<string, any> = any>(
  options: ToolbarPanelsOptions<T> = {},
): VirtTablePlugin<T>[] {
  return [
    vtFieldConfig<T>(options.fieldConfig),
    vtFilterConfig<T>(options.filterConfig),
    vtGroupConfig<T>(options.groupConfig),
    vtSortConfig<T>(options.sortConfig),
  ];
}
