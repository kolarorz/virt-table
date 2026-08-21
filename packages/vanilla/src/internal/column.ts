/**
 * 列的分类判定。抽出来只为一条规则：**`type: 'tree'` 是数据列，不是功能列。**
 *
 * 这条规则原先在核心散着 4 份字面拷贝（`col.type && col.type !== 'tree'`）：功能列类名、
 * 表头对齐、内容穿透判定、`render` 冲突告警。`vtRowDrag` 挑 ghost 标签列时要的是同一条
 * ——第一版没有它，于是 `find(c => !c.type)` 把树形列当功能列跳过去了，ghost 显示的是
 * **第二列**的值（树形表里就是「部门」而不是「名称」）。同一条规则第 5 份拷贝没有必要。
 *
 * 放 `internal/` 而不是核心导出：生产插件代码一律只从 `../index` 做 **type** 导入
 * （值导入会把整个核心拽进插件 chunk），能共享值的地方只有 `internal/*`
 * ——`drag.ts` / `auto-scroll.ts` 就是这么用的。
 */

/** 列的 `type` 取值（与 `VirtTableColumn.type` 同源） */
export type ColumnFeatureType = 'index' | 'checkbox' | 'expand' | 'tree' | 'radio' | 'drag';

/**
 * 是不是**接管层功能列**——独占单元格内容、不走内容链（序号 / 勾选 / 单选 / 手柄 / 展开）。
 *
 * `type: 'tree'` 返回 `false`：它只在内容前面加缩进与折叠箭头，内容仍是字段值。
 */
export function isFunctionalColumn(col: { type?: ColumnFeatureType }): boolean {
  return col.type !== undefined && col.type !== 'tree';
}

/** 是不是**承载数据**的列（功能列取反）。`type: 'tree'` 算数据列 */
export function isDataColumn(col: { type?: ColumnFeatureType }): boolean {
  return !isFunctionalColumn(col);
}
