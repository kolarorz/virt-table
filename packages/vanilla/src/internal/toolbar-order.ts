/**
 * 工具栏上各项的**排序位**，集中在这里定义。
 *
 * 为什么不各插件自己写一个数字：那正是它们撞车的方式 —— `vtRowHeightConfig` 与 `vtSearch`
 * 一度都写着 `order: 50`，同侧同 order 时只能按注册顺序稳定排序，于是「谁在前」变成了
 * 使用方 `plugins` 数组的顺序决定的事，而那不该影响一条工具栏的读法。
 *
 * 数字之间留了空档，插件与使用方可以插进去（`register({ order })` 自己传）：
 *
 * ```
 *  5 / 6   撤销 / 重做（付费 vtUndo）
 * 10 ~ 40  改「看什么」的四个面板：字段配置 / 筛选 / 分组 / 排序
 * 50       行高（改「看起来多密」，视图外观）
 * 60 ~ 70  动作型：搜索 / 导出
 * ```
 *
 * 靠右那一组（`side: 'right'`）自己独立排序 —— 付费甘特的「甘特图配置」在那边，
 * 它的 `order: 10` 与左侧的字段配置不冲突。
 */
export const TOOLBAR_ORDER = {
  fieldConfig: 10,
  filterConfig: 20,
  groupConfig: 30,
  sortConfig: 40,
  rowHeight: 50,
  search: 60,
  export: 70,
} as const;
