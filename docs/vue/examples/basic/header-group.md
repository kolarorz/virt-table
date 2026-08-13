# Vue 多级分组表头 / 表尾

给列配置 `children` 即可得到多级分组表头：带 `children` 的节点是**分组节点**（自身不承载数据，只在表头占一格并横跨其全部叶子后代），不带 `children` 的叶子才是真正的数据列。嵌套层数不限，表头行数 = 列树深度。

开了 `showSummary`（或给节点配 `footerValue` / `renderFooter`）后，**表尾也按同一棵列树渲染成多级分组表尾**。

**表头、表尾与表体一起做横向虚拟化**：只渲染视口内的叶子列，跨越视口边界的分组格会被裁剪到视口内，视口外的整段列折叠成一个贯通表头高度的留白格。

## 要点

- **`fixed` 写在分组上**，会强制下发给所有后代；不要在分组内的单个子列上单独设 `fixed`。
- **数据相关配置写在叶子列上**：`render` / `sortable` / `filters` / `resizable` / `type` 等。分组节点只需要 `title`（或 `renderHeader`）。
- 分组节点的 `width` 可以写 `0`：它的宽度恒等于可见子列宽度之和。
- 与手写多行表头（`headerData` / `headerMerges`）**互斥**——配置了 `children` 时后者被忽略并给出告警。
- 列显隐按树生效：隐藏叶子会让父分组自动收窄，隐藏分组等于隐藏其全部叶子。
- **分组格恒为单行**（`white-space: nowrap`），超出部分裁掉、完整内容挂在原生 `title` 上。原因：横向虚拟化会把跨视口的分组格 colspan 裁窄，若允许折行则行高会随滚动变化，sticky 的表头/表尾就会抖动。
- **分组标签横向跟随**：中间段的分组格把内容放进一层 `.vt-group-label`（`position: sticky`）。分组比可见区宽时标签被钉在可见区并居中、滚动中完全不动；分组窄于可见区时退化为格内居中。由 CSS sticky 在合成器逐帧完成，主线程零开销。左右冻结段的分组格本身已冻结在视口内，不套此内层。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填；分组节点可填 0，宽度由子列求和)
  children?: Column[];  // 子列 —— 配置它即成为分组节点
  fixed?: 'left' | 'right';  // 冻结；写在分组上会下发给全部子列
  align?: 'left' | 'center' | 'right';  // 单元格水平对齐
  headerAlign?: 'left' | 'center' | 'right';  // 表头水平对齐(分组默认居中)
  type?: 'index' | 'checkbox' | 'expand' | 'tree' | 'radio' | 'drag';  // 功能列(仅叶子)
  sortable?: boolean;  // 可排序(仅叶子)
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  buffer: number;  // 纵向缓冲区行数
  colBuffer: number;  // 横向缓冲区列数
  border: boolean;  // 是否显示边框
  stripe: boolean;  // 是否显示斑马纹
}
```

ref 上新增：`getLeafColumns()` 取全量叶子列，`getHeaderDepth()` 取表头行数。

## 多级分组表尾

表尾与表头**同序**（最外层分组在上、叶子小计在下），网格与表头逐行一致，因此复用同一份表头网格与同一套横向虚拟化裁剪规则——列很多时表尾也只渲染视口内的列。

**启用条件**：列树里有分组节点，并且表尾有内容来源——开了 `showSummary`，或任一节点配了 `footerValue` / `renderFooter`。否则退回 `footerData` / `footerMerges` 的扁平表尾（两者互斥）。

**每格内容优先级**：`renderFooter` > `footerValue` > `summary`/`summaryMethod` 自动聚合 > 合计标签（仅整表首列的叶子格）> 空。

**分组格聚合语义**：把该格覆盖的**全部叶子列 × 全部行**的原始值摊平成一维 `values`，再交给 `summaryMethod`（优先）或内置 `summary`。因此 `count` 在分组格上统计的是摊平后的单元格数而非行数。聚合始终基于当前视图（筛选/排序后），数据变化自动重算。

```ts
{ key: 'y2024', title: '2024 年', width: 0,
  summary: 'sum',                      // 分组：聚合旗下全部叶子列
  children: [
    { key: 'q1_rev', title: 'Q1 营收', width: 110, summary: 'sum' },
    { key: 'q1_rate', title: 'Q1 毛利率', width: 110, footerValue: '—' },
  ]}
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-header-group" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/HeaderGroup.vue
:::
